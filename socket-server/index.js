import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { Redis } from '@upstash/redis'
import { jwtVerify } from 'jose'

const PORT   = process.env.SOCKET_PORT || 3001
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

// Redis client for pub/sub
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const httpServer = createServer()
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
  socket.on('send-message', ({ tripId, content }) => {
    if (!tripId || !content) return

    const message = {
      senderId:  socket.userId,
      content,
      createdAt: new Date().toISOString(),
    }

    io.to(`trip:${tripId}`).emit('new-message', message)
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