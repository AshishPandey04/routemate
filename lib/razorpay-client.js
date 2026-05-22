export function loadRazorpayScript() {
  return new Promise(resolve => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function openRazorpayCheckout({
  orderId,
  amount,
  userName,
  userEmail,
  userPhone,
  onSuccess,
  onDismiss,
}) {
  const loaded = await loadRazorpayScript()
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID

  if (!loaded || !key) {
    throw new Error('Payment gateway is not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID)')
  }

  return new Promise((resolve, reject) => {
    const options = {
      key,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'RouteMate',
      description: 'Trip booking',
      order_id: orderId,
      prefill: {
        name: userName || '',
        email: userEmail || '',
        contact: userPhone || '',
      },
      theme: { color: '#f59e0b' },
      handler(response) {
        onSuccess?.(response)
        resolve(response)
      },
      modal: {
        ondismiss() {
          onDismiss?.()
          reject(new Error('Payment cancelled'))
        },
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', () => reject(new Error('Payment failed')))
    rzp.open()
  })
}
