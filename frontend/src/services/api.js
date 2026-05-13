import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zz_token')
  console.log('DEBUG API: Token en localStorage:', token ? 'presente' : 'NO presente')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('DEBUG API: Authorization header set')
  } else {
    console.log('DEBUG API: NO se envió token - usuario no autenticado')
  }
  
  // Si se envía FormData, eliminar Content-Type para que Axios lo establezca automáticamente
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
    delete config.headers['content-type']
    console.log('DEBUG API: Content-Type eliminado para FormData')
  }
  
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zz_token')
      localStorage.removeItem('zz_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Predicción de ventas
export const predecirVentas = (productoId, precio, talla, color) =>
  api.get(`/empresa/prediccion/${productoId}`, {
    params: { precio, talla, color,
      mes: new Date().getMonth() + 1,
      dia_semana: new Date().getDay()
    }
  })

export default api
