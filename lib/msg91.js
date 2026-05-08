/**
 * Sends OTP to an Indian phone number via MSG91
 * @param {string} phone - 10 digit Indian phone number
 * @param {string} otp - 6 digit OTP
 */
export async function sendOTP(phone, otp) {
    const url = 'https://control.msg91.com/api/v5/otp'
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile:      `91${phone}`,
        otp,
      })
    })
  
    const data = await response.json()
  
    if (!response.ok) {
      throw new Error(`MSG91 error: ${data.message}`)
    }
  
    return data
  }
  
  /**
   * Generates a random 6 digit OTP
   * @returns {string}
   */
  export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }