import { io } from 'socket.io-client'

let socket = null

/**
 * Get or create socket connection
 * @param {string} token - JWT token
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket(token) {
  if (socket?.connected) return socket

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    auth:          { token },
    reconnection:  true,
    reconnectionAttempts: 5,
    reconnectionDelay:    1000,
  })

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[SOCKET] Connection error:', err.message)
  })

  return socket
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}