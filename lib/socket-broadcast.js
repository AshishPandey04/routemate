/**
 * Notify the Socket.io server of a location update (best-effort).
 */
export async function broadcastLocationUpdate(tripId, location) {
  const baseUrl = process.env.SOCKET_SERVER_URL
  const secret  = process.env.INTERNAL_SOCKET_SECRET

  if (!baseUrl || !secret) return

  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/internal/broadcast-location`, {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-internal-secret':  secret,
      },
      body: JSON.stringify({ tripId, location }),
    })
  } catch (err) {
    console.error('[SOCKET BROADCAST]', err.message)
  }
}
