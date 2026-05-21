import crypto from 'crypto'

// Paste EXACTLY what is in your .env.local
const KEY_SECRET = 'RKDKRDZCn201ATVOf2MSLwIH'

// Paste EXACTLY the razorpayOrderId from the hold response
const ORDER_ID   = 'order_SrxT0rrymmEh73'

// Keep this exactly as is
const PAYMENT_ID = 'pay_xxx'

const signature = crypto
  .createHmac('sha256', KEY_SECRET)
  .update(`${ORDER_ID}|${PAYMENT_ID}`)
  .digest('hex')

console.log('KEY_SECRET used:', KEY_SECRET.slice(0, 8) + '...')
console.log('orderId:        ', ORDER_ID)
console.log('paymentId:      ', PAYMENT_ID)
console.log('signature:      ', signature)