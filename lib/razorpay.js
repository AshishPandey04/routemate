import Razorpay from 'razorpay'
import crypto from 'crypto'

// Singleton Razorpay instance
export const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

/**
 * Verifies Razorpay payment signature
 * @param {string} orderId
 * @param {string} paymentId
 * @param {string} signature
 * @returns {boolean}
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Verifies Razorpay webhook signature
 * @param {string} body - raw request body
 * @param {string} signature - x-razorpay-signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Creates a Razorpay order
 * @param {number} amount - in rupees (we convert to paise)
 * @param {object} notes
 * @returns {Promise<object>}
 */
export async function createOrder(amount, notes = {}) {
  return await razorpay.orders.create({
    amount:   Math.round(amount * 100),  // convert to paise
    currency: 'INR',
    notes,
  })
}

/**
 * Initiates a refund
 * @param {string} paymentId
 * @param {number} amount - in rupees
 * @returns {Promise<object>}
 */
export async function initiateRefund(paymentId, amount) {
  return await razorpay.payments.refund(paymentId, {
    amount: Math.round(amount * 100),  // convert to paise
  })
}