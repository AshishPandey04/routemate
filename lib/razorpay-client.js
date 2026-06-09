/**
 * Loads the Razorpay checkout script dynamically
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return }
  
      const script    = document.createElement('script')
      script.src      = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload   = () => resolve(true)
      script.onerror  = () => resolve(false)
      document.body.appendChild(script)
    })
  }
  
  /**
   * Opens Razorpay checkout
   * @param {object} options
   * @param {string} options.orderId
   * @param {number} options.amount       - in rupees
   * @param {string} options.tripId
   * @param {object} options.user
   * @param {function} options.onSuccess  - called with { razorpayOrderId, razorpayPaymentId, razorpaySignature }
   * @param {function} options.onFailure
   */
  export async function openRazorpayCheckout({
    orderId,
    amount,
    tripId,
    user,
    onSuccess,
    onFailure,
  }) {
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      onFailure?.('Failed to load payment gateway')
      return
    }
  
    const options = {
      key:          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount:       amount * 100,
      currency:     'INR',
      name:         'RouteMate',
      description:  'Trip Booking',
      order_id:     orderId,
      prefill: {
        name:  user?.name  || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#f59e0b' },
      handler: function(response) {
        onSuccess?.({
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: function() {
          onFailure?.('Payment cancelled')
        }
      }
    }
  
    const rzp = new window.Razorpay(options)
    rzp.open()
  }