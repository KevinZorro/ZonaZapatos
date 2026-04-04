import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import './Auth.css'

export default function ConfirmPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.get(`/auth/confirmar/${token}`)
      .then(({ data }) => {
        setMsg(data.msg)
        setStatus('success')
      })
      .catch((err) => {
        setMsg(err.response?.data?.detail || 'El enlace es inválido o ya expiró.')
        setStatus('error')
      })
  }, [token])

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {status === 'loading' && (
          <div className="auth-header">
            <span className="auth-header__icon">⏳</span>
            <h1 className="auth-header__title">Confirmando cuenta…</h1>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="auth-header">
              <span className="auth-header__icon">✅</span>
              <h1 className="auth-header__title">¡Cuenta confirmada!</h1>
              <p className="auth-header__sub">{msg}</p>
            </div>
            <Link to="/login" className="auth-btn" style={{ textAlign: 'center', marginTop: '1rem' }}>
              Iniciar sesión
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-header">
              <span className="auth-header__icon">❌</span>
              <h1 className="auth-header__title">Enlace inválido</h1>
              <p className="auth-header__sub">{msg}</p>
            </div>
            <Link to="/login" className="auth-btn" style={{ textAlign: 'center', marginTop: '1rem' }}>
              Volver al login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
