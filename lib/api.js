import axios from 'axios'

const api = axios.create({
  baseURL:         '/api',
  timeout:         30000,
  withCredentials: true, // HttpOnly cookie is the sole auth mechanism
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    if (error.code === 'ECONNABORTED') {
      console.error('API Request Timeout - Server took too long to respond')
    }
    return Promise.reject(error)
  }
)

/**
 * Extract a human-readable message from an axios error.
 * Handles both plain string errors and the standardized { code, message, status } object.
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const errData = err?.response?.data?.error
  if (!errData) return fallback
  if (typeof errData === 'string') return errData
  if (typeof errData?.message === 'string') return errData.message
  return fallback
}

export default api
