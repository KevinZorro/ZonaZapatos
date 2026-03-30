// RF3 — Login / Autenticación
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/catalogo'

  const [form, setForm] = useState({ correo: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  // RF3: redirige según rol
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.correo || !form.password) {
      setError('Por favor completa todos los campos')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await login(form.correo, form.password)
      if (data.rol === 'empresa') navigate('/empresa/productos', { replace: true })
      else if (data.rol === 'admin') navigate('/admin', { replace: true })
      else navigate(from === '/login' ? '/catalogo' : from, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.toLowerCase().includes('confirmar') || detail.toLowerCase().includes('confirmad')) {
        setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else if (err.response?.status === 401) {
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
      } else {
        setError(detail || 'Error al iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="auth-header">
          <span className="auth-header__icon">👟</span>
          <h1 className="auth-header__title">Bienvenido de nuevo</h1>
          <p className="auth-header__sub">Ingresa a tu cuenta de Zona Zapatos</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <motion.div
              className="auth-alert auth-alert--error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-correo">Correo electrónico</label>
            <input
              id="login-correo"
              className="auth-input"
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              required
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">Contraseña</label>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                className="auth-input"
                type={showPwd ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPwd(!showPwd)}
                tabIndex={-1}
                aria-label={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <><span className="auth-spinner" /> Ingresando…</> : 'Iniciar sesión'}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link to="/registro/cliente">Regístrate como cliente</Link>
          {' o '}
          <Link to="/registro/empresa">como empresa</Link>
        </p>
      </motion.div>
    </div>
  )
}
