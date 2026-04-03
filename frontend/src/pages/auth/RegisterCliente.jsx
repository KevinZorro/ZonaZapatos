// RF2 — Registro de cliente con validación en tiempo real
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import './Auth.css'

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score, label: 'Débil', color: 'weak' }
  if (score <= 2) return { score, label: 'Regular', color: 'fair' }
  return { score, label: 'Fuerte', color: 'strong' }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidNombre(nombre) {
  return /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(nombre.trim())
}

function isValidTelefono(tel) {
  return /^\+[0-9\s\-]{7,15}$/.test(tel.trim())
}

export default function RegisterCliente() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', correo: '', telefono: '', direccion: '', password: '' })
  const [touched, setTouched] = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(form.password)
  
  const fieldErrors = {
    nombre:
      touched.nombre && !form.nombre.trim()
        ? 'El nombre es obligatorio'
        : touched.nombre && !isValidNombre(form.nombre)
        ? 'El nombre no puede contener números ni símbolos'
        : '',
    correo:   
      touched.correo && !isValidEmail(form.correo)    
        ? 'Ingresa un correo válido' 
        : '',
    telefono:
      touched.telefono && form.telefono.trim() && !isValidTelefono(form.telefono)
        ? !form.telefono.startsWith('+')
          ? 'El teléfono debe iniciar con + (ej: +57 300 000 0000)'
          : 'Formato inválido. Ejemplo: +57 300 000 0000'
        : '',
    direccion:
      touched.direccion && form.direccion.trim() && form.direccion.trim().length < 5
        ? 'Ingresa una dirección válida'
        : '',
    password:
      touched.password && form.password.length < 8
        ? 'Mínimo 8 caracteres'
        : '',
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleBlur = (e) => setTouched({ ...touched, [e.target.name]: true })

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Marcar todos los campos como tocados para mostrar errores
    setTouched({ nombre: true, correo: true, telefono: true, direccion: true, password: true })
    const hayErrores =
      !form.nombre.trim() ||
      !isValidNombre(form.nombre) ||
      !isValidEmail(form.correo) ||
      form.password.length < 8 ||
      (form.telefono.trim() && !isValidTelefono(form.telefono)) ||
      (form.direccion.trim() && form.direccion.trim().length < 5)

    if (hayErrores) return

    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/registro/cliente', form)
      setSuccess(data.msg || 'Cuenta creada. Revisa tu correo para confirmarla.')
      setTimeout(() => navigate('/login'), 3500)
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.toLowerCase().includes('correo')) {
        setError('Este correo ya está registrado. ¿Ya tienes cuenta?')
      } else if (detail.toLowerCase().includes('contraseña') || detail.toLowerCase().includes('password')) {
        setError('La contraseña no cumple los requisitos mínimos.')
      } else {
        setError(detail || 'Error al registrarse. Intenta de nuevo.')
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
          <span className="auth-header__icon">🛍️</span>
          <h1 className="auth-header__title">Crea tu cuenta</h1>
          <p className="auth-header__sub">Regístrate como cliente de Zona Zapatos</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <motion.div className="auth-alert auth-alert--error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert">
              ⚠️ {error}
            </motion.div>
          )}
          {success && (
            <motion.div className="auth-alert auth-alert--success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="status">
              ✅ {success}
            </motion.div>
          )}

          {/* Nombre */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="rc-nombre">Nombre completo</label>
            <input
              id="rc-nombre" name="nombre" type="text"
              className={`auth-input ${fieldErrors.nombre ? 'auth-input--error' : touched.nombre && form.nombre ? 'auth-input--success' : ''}`}
              value={form.nombre} onChange={handleChange} onBlur={handleBlur}
              required placeholder="Juan Pérez" autoComplete="name"
            />
            {fieldErrors.nombre && <span className="auth-field-error">⚠ {fieldErrors.nombre}</span>}
          </div>

          {/* Correo */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="rc-correo">Correo electrónico</label>
            <input
              id="rc-correo" name="correo" type="email"
              className={`auth-input ${fieldErrors.correo ? 'auth-input--error' : touched.correo && isValidEmail(form.correo) ? 'auth-input--success' : ''}`}
              value={form.correo} onChange={handleChange} onBlur={handleBlur}
              required placeholder="tu@correo.com" autoComplete="email"
            />
            {fieldErrors.correo && <span className="auth-field-error">⚠ {fieldErrors.correo}</span>}
          </div>

          {/* Teléfono */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="rc-telefono">Teléfono <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
            <input
              id="rc-telefono" name="telefono" type="tel"
              className={`auth-input ${
                fieldErrors.telefono
                  ? 'auth-input--error'
                  : touched.telefono && form.telefono && isValidTelefono(form.telefono)
                  ? 'auth-input--success'
                  : ''
              }`}
              value={form.telefono} onChange={handleChange} onBlur={handleBlur}
              placeholder="+57 300 000 0000" autoComplete="tel"
            />
            {!form.telefono && !fieldErrors.telefono && (
                <span className="auth-field-hint" style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                  Debe iniciar con + seguido del código de país
                </span>
              )}
              {fieldErrors.telefono && <span className="auth-field-error">⚠ {fieldErrors.telefono}</span>}
          </div>

          {/* Dirección */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="rc-direccion">Dirección <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
            <input
              id="rc-direccion" name="direccion" type="text"
              className={`auth-input ${
                fieldErrors.direccion
                  ? 'auth-input--error'
                  : touched.direccion && form.direccion.trim().length >= 5
                  ? 'auth-input--success'
                  : ''
              }`}
              value={form.direccion} onChange={handleChange} onBlur={handleBlur}
              placeholder="Calle 12 #3-45, Cúcuta"
            />
            {fieldErrors.direccion && <span className="auth-field-error">⚠ {fieldErrors.direccion}</span>}
          </div>

          {/* Contraseña */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="rc-password">Contraseña</label>
            <div className="auth-input-wrap">
              <input
                id="rc-password" name="password"
                type={showPwd ? 'text' : 'password'}
                className={`auth-input ${fieldErrors.password ? 'auth-input--error' : touched.password && form.password.length >= 8 ? 'auth-input--success' : ''}`}
                value={form.password} onChange={handleChange} onBlur={handleBlur}
                required placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.password && <span className="auth-field-error">⚠ {fieldErrors.password}</span>}

            {/* Barra de fortaleza */}
            {form.password && (
              <div>
                <div className="auth-strength">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`auth-strength__bar ${i <= strength.score ? `auth-strength__bar--${strength.color}` : ''}`}
                    />
                  ))}
                </div>
                <span className="auth-strength__label" style={{
                  color: strength.color === 'weak' ? 'var(--error)' : strength.color === 'fair' ? 'var(--warning)' : 'var(--success)'
                }}>
                  Contraseña {strength.label}
                </span>
              </div>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={loading || Boolean(success)}>
            {loading ? <><span className="auth-spinner" /> Registrando…</> : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          {' · '}
          <Link to="/registro/empresa">Soy empresa</Link>
        </p>
      </motion.div>
    </div>
  )
}
