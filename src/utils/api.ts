import axios from 'axios'
import { API_BASE_URL } from '../config'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use((requestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`
  }
  return requestConfig
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
