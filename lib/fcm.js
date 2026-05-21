import admin from 'firebase-admin'

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in private key
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  })
}

/**
 * Send push notification to a single device
 * @param {string} fcmToken - device FCM token
 * @param {string} title
 * @param {string} body
 * @param {object} data - extra data payload
 */
export async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { sound: 'default' }
      },
      apns: {
        payload: {
          aps: { sound: 'default' }
        }
      }
    }

    const response = await admin.messaging().send(message)
    console.log('[FCM] Notification sent:', response)
    return { success: true, response }

  } catch (error) {
    console.error('[FCM] Error sending notification:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} fcmTokens
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
export async function sendMulticastNotification(fcmTokens, title, body, data = {}) {
  if (!fcmTokens?.length) return

  const validTokens = fcmTokens.filter(Boolean)
  if (!validTokens.length) return

  try {
    const message = {
      tokens: validTokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`[FCM] Multicast: ${response.successCount} sent, ${response.failureCount} failed`)
    return response

  } catch (error) {
    console.error('[FCM] Multicast error:', error.message)
  }
}