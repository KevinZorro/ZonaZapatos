import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api'
import { getEncuestaPendiente } from '../services/encuestas'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('zz_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [token, setToken] = useState(() => localStorage.getItem('zz_token') || null)
  const [encuestaPendiente, setEncuestaPendiente] = useState(null)

  const checkEncuestaPendiente = useCallback(async () => {
    if (!token || !user || user.rol !== 'cliente') {
      setEncuestaPendiente(null)
      return
    }

    try {
      const encuesta = await getEncuestaPendiente()
      setEncuestaPendiente(encuesta)
    } catch {
      setEncuestaPendiente(null)
    }
  }, [token, user])

  const clearEncuestaPendiente = useCallback(() => {
    setEncuestaPendiente(null)
  }, [])

  const login = useCallback(async (correo, password) => {
    const params = new URLSearchParams()
    params.append('username', correo)
    params.append('password', password)

    const { data } = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    localStorage.setItem('zz_token', data.access_token)
    const userData = { correo, rol: data.rol, cliente_id: data.cliente_id }
    localStorage.setItem('zz_user', JSON.stringify(userData))
    setToken(data.access_token)
    setUser(userData)
    return data
  }, [])

  // RF4: logout limpia sesión y redirige al home público
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* stateless */ }
    finally {
      localStorage.removeItem('zz_token')
      localStorage.removeItem('zz_user')
      setToken(null)
      setUser(null)
      setEncuestaPendiente(null)
    }
  }, [])

  const isAuthenticated = Boolean(token)

  // Verificar encuesta pendiente cuando cambia el token o usuario
  useEffect(() => {
    checkEncuestaPendiente()
  }, [checkEncuestaPendiente])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated,
      encuestaPendiente,
      clearEncuestaPendiente,
      checkEncuestaPendiente,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
