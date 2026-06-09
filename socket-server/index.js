import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

import { Server } from 'socket.io'
import { Redis } from '@upstash/redis'
import { jwtVerify } from 'jose'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

const PORT   = process.env.SOCKET_SERVER_PORT || process.env.SOCKET_PORT || 3001
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

// Mirror lib/prisma.js — must use the PrismaPg adapter since the schema uses it
const pool   = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// Redis client for pub/sub
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const INTERNAL_SECRET = process.env.INTERNAL_SOCKET_SECRET

const httpServer = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/internal/broadcast-location') {
    const secret = req.headers['x-internal-secret']
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      res.writeHead(401)
      res.end('Unauthorized')
      return
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const { tripId, location } = JSON.parse(body)
        if (tripId && location) {
          io.to(`trip:${tripId}`).emit('location-update', location)
        }
        res.writeHead(200)
        res.end('ok')
      } catch {
        res.writeHead(400)
        res.end('Bad request')
      }
    })
    return
  }

  res.writeHead(404)
  res.end()
})

const io         = new Server(httpServer, {
  cors: {
    origin:  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  }
})

// ─── Auth middleware ─────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Authentication required'))
    }

    const { payload } = await jwtVerify(token, secret)
    socket.userId = payload.userId
    socket.role   = payload.role

    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

// ─── Connection handler ──────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.userId}`)

  // ── Join trip room ────────────────────────────────────────
  socket.on('join-trip', async ({ tripId }) => {
    if (!tripId) return

    socket.join(`trip:${tripId}`)
    console.log(`[SOCKET] User ${socket.userId} joined trip:${tripId}`)

    // Send latest location immediately on join
    try {
      const latest = await redis.get(`location:${tripId}`)
      if (latest) {
        const location = typeof latest === 'string'
          ? JSON.parse(latest)
          : latest
        socket.emit('location-update', location)
      }
    } catch (err) {
      console.error('[SOCKET] Error fetching latest location:', err)
    }
  })

  // ── Leave trip room ───────────────────────────────────────
  socket.on('leave-trip', ({ tripId }) => {
    socket.leave(`trip:${tripId}`)
    console.log(`[SOCKET] User ${socket.userId} left trip:${tripId}`)
  })

  // ── Send message ──────────────────────────────────────────
  socket.on('send-message', async ({ tripId, content }) => {
    if (!tripId || !content?.trim()) return

    try {
      // Persist to DB first so the message survives a refresh
      const saved = await prisma.message.create({
        data: {
          tripId,
          senderId: socket.userId,
          content:  content.trim(),
        },
        include: { sender: { select: { id: true, name: true } } },
      })

      // Broadcast the persisted message (includes real id + createdAt)
      io.to(`trip:${tripId}`).emit('new-message', {
        id:        saved.id,
        tripId:    saved.tripId,
        senderId:  saved.senderId,
        sender:    saved.sender,
        content:   saved.content,
        createdAt: saved.createdAt.toISOString(),
      })
    } catch (err) {
      console.error('[SOCKET] Failed to persist message:', err.message)
      socket.emit('message-error', { error: 'Failed to send message' })
    }
  })

  // ── Disconnect ────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.userId}`)
  })
})

// ─── Export io for use in Next.js API routes ────────────────
export { io }

httpServer.listen(PORT, () => {
  console.log(`[SOCKET] Server running on port ${PORT}`)
})