import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
})

// Interceptor de request: agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// Interceptor de response: detectar token expirado/inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido: limpiar auth y redirigir al login
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')

      // Guardar la ruta actual para redirigir después del login
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirect_after_login', currentPath)
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api