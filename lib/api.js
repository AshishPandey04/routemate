import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 second timeout
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('token')
    : null

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    // Log timeout errors for debugging
    if (error.code === 'ECONNABORTED') {
      console.error('API Request Timeout - Server took too long to respond')
    }
    return Promise.reject(error)
  }
)

export default api