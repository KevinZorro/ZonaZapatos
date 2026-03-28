import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user')
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    })

    const [token, setToken] = useState(() => localStorage.getItem('token') || null)

    const login = useCallback(async (correo, password) => {
        const params = new URLSearchParams()
        params.append('username', correo)
        params.append('password', password)

        const { data } = await api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        localStorage.setItem('token', data.access_token)
        const userData = { correo, rol: data.rol }
        localStorage.setItem('user', JSON.stringify(userData))
        setToken(data.access_token)
        setUser(userData)
        return data
    }, [])

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout')
        } catch {
            // ignore — stateless logout
        } finally {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setToken(null)
            setUser(null)
        }
    }, [])

    const isAuthenticated = Boolean(token)

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
