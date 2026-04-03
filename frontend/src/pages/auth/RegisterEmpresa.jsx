// RF1 — Registro de empresa con logo y validación campo a campo
import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import './Auth.css'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidNIT(nit) {
  const clean = nit.trim()
  return clean.length >= 5 && /^[\d.\-]+$/.test(clean)
}

function isValidTelefono(tel) {
  return /^\+57[\s\-]?[0-9]{7,10}$/.test(tel.trim())
}

function isValidWhatsapp(wa) {
  return /^\+57[\s\-]?[0-9]{7,10}$/.test(wa.trim())
}

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

export default function RegisterEmpresa() {
  const navigate = useNavigate()
  const fileInputRef = useRef()
  const [form, setForm] = useState({
    nombre: '', nit: '', correo: '', password: '',
    telefono: '', whatsapp: '', ciudad: '', direccion: '',
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [touched, setTouched] = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = passwordStrength(form.password)

  const fieldErrors = {
    nombre:
      touched.nombre && !form.nombre.trim()
        ? 'La razón social es obligatoria'
        : '',
    nit:
      touched.nit && !form.nit.trim()
        ? 'El NIT es obligatorio'
        : touched.nit && /[a-zA-Z]/.test(form.nit)
        ? 'El NIT no puede contener letras'                           // ✅
        : touched.nit && !isValidNIT(form.nit)
        ? 'El NIT debe tener mínimo 5 dígitos (ej: 900.123.456-7)'
        : '',
    correo:
      touched.correo && !isValidEmail(form.correo)
        ? 'Ingresa un correo válido'
        : '',
    telefono:
      touched.telefono && form.telefono.trim() && !form.telefono.startsWith('+57')
        ? 'El teléfono debe iniciar con +57'
        : touched.telefono && form.telefono.trim() && !isValidTelefono(form.telefono)
        ? 'Formato inválido. Ejemplo: +57 300 000 0000'
        : '',
    whatsapp:
      touched.whatsapp && form.whatsapp.trim() && !form.whatsapp.startsWith('+57')
        ? 'El WhatsApp debe iniciar con +57'
        : touched.whatsapp && form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp)
        ? 'Formato inválido. Ejemplo: +57 300 000 0000'
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

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ nombre: true, nit: true, correo: true, telefono: true, whatsapp:true, password: true })
    
    const hayErrores =
      !form.nombre.trim() ||
      !isValidNIT(form.nit) ||
      !isValidEmail(form.correo) ||
      form.password.length < 8 ||
      (form.telefono.trim() && !isValidTelefono(form.telefono)) ||
      (form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp))

    if (hayErrores) return

    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/registro/empresa', form)
      setSuccess(data.msg || 'Empresa registrada. Revisa tu correo para confirmar la cuenta.')
      setTimeout(() => navigate('/login'), 3500)
    } catch (err) {
      const detail = err.response?.data?.detail || ''
      if (detail.toLowerCase().includes('nit')) {
        setError('Este NIT ya está registrado en el sistema.')
      } else if (detail.toLowerCase().includes('correo') || detail.toLowerCase().includes('email')) {
        setError('Este correo ya está registrado. ¿Ya tienes cuenta?')
      } else if (detail.toLowerCase().includes('contraseña') || detail.toLowerCase().includes('password')) {
        setError('La contraseña no cumple los requisitos mínimos.')
      } else {
        setError(detail || 'Error al registrar la empresa. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card auth-card--wide"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="auth-header">
          <span className="auth-header__icon">🏭</span>
          <h1 className="auth-header__title">Registrar Empresa</h1>
          <p className="auth-header__sub">Vende tu calzado artesanal en Zona Zapatos</p>
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

          {/* Logo */}
          <div className="auth-field auth-field--full">
            <label className="auth-label">Logo de la empresa <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(opcional)</span></label>
            <div className="auth-logo-wrap">
              {logoPreview
                ? <img src={logoPreview} alt="Logo preview" className="auth-logo-preview" />
                : (
                  <div className="auth-logo-placeholder" onClick={() => fileInputRef.current?.click()} title="Subir logo">
                    🏢
                  </div>
                )
              }
              <div className="auth-logo-info">
                <strong>Imagen de empresa</strong>
                <span>PNG, JPG · máx. 2 MB</span>
                <button type="button" style={{ marginTop: '6px', background: 'none', border: 'none', color: 'var(--magenta)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }} onClick={() => fileInputRef.current?.click()}>
                  {logoPreview ? 'Cambiar imagen' : 'Seleccionar archivo'}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
            </div>
          </div>

          <div className="auth-grid">
            {/* Nombre / Razón social */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-nombre">Razón social *</label>
              <input
                id="re-nombre" name="nombre" type="text"
                className={`auth-input ${fieldErrors.nombre ? 'auth-input--error' : touched.nombre && form.nombre ? 'auth-input--success' : ''}`}
                value={form.nombre} onChange={handleChange} onBlur={handleBlur}
                required placeholder="Calzados El Cují SAS"
              />
              {fieldErrors.nombre && <span className="auth-field-error">⚠ {fieldErrors.nombre}</span>}
            </div>

            {/* NIT */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-nit">NIT *</label>
              <input
                id="re-nit" name="nit" type="text"
                className={`auth-input ${fieldErrors.nit ? 'auth-input--error' : touched.nit && isValidNIT(form.nit) ? 'auth-input--success' : ''}`}
                value={form.nit} onChange={handleChange} onBlur={handleBlur}
                required placeholder="900.123.456-7"
              />
              {fieldErrors.nit && <span className="auth-field-error">⚠ {fieldErrors.nit}</span>}
            </div>

            {/* Correo */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-correo">Correo *</label>
              <input
                id="re-correo" name="correo" type="email"
                className={`auth-input ${fieldErrors.correo ? 'auth-input--error' : touched.correo && isValidEmail(form.correo) ? 'auth-input--success' : ''}`}
                value={form.correo} onChange={handleChange} onBlur={handleBlur}
                required placeholder="ventas@empresa.com" autoComplete="email"
              />
              {fieldErrors.correo && <span className="auth-field-error">⚠ {fieldErrors.correo}</span>}
            </div>

            {/* Teléfono */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-telefono">Teléfono</label>
              <input
                id="re-telefono" name="telefono" type="tel"
                className={`auth-input ${
                  fieldErrors.telefono
                    ? 'auth-input--error'
                    : touched.telefono && form.telefono && isValidTelefono(form.telefono)
                    ? 'auth-input--success'
                    : ''
                }`}
                value={form.telefono} onChange={handleChange} onBlur={handleBlur}
                placeholder="+57 300 000 0000"
              />
              {!form.telefono && !fieldErrors.telefono && (
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                  Debe iniciar con +57
                </span>
              )}
              {fieldErrors.telefono && <span className="auth-field-error">⚠ {fieldErrors.telefono}</span>}
            </div>

            {/* WhatsApp */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-whatsapp">WhatsApp Business</label>
              <input
                id="re-whatsapp" name="whatsapp" type="tel"
                className={`auth-input ${
                  fieldErrors.whatsapp
                    ? 'auth-input--error'
                    : touched.whatsapp && form.whatsapp && isValidWhatsapp(form.whatsapp)
                    ? 'auth-input--success'
                    : ''
                }`}
                value={form.whatsapp} onChange={handleChange} onBlur={handleBlur}
                placeholder="+57 300 000 0000"
              />
              {!form.whatsapp && !fieldErrors.whatsapp && (
                <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                  Debe iniciar con +57
                </span>
              )}
              {fieldErrors.whatsapp && <span className="auth-field-error">⚠ {fieldErrors.whatsapp}</span>}
            </div>

            {/* Ciudad */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="re-ciudad">Ciudad</label>
              <input
                id="re-ciudad" name="ciudad" type="text"
                className="auth-input"
                value={form.ciudad} onChange={handleChange}
                placeholder="Cúcuta"
              />
            </div>

            {/* Dirección */}
            <div className="auth-field auth-field--full">
              <label className="auth-label" htmlFor="re-direccion">Dirección física</label>
              <input
                id="re-direccion" name="direccion" type="text"
                className="auth-input"
                value={form.direccion} onChange={handleChange}
                placeholder="Av. Principal, Barrio Calzado, Cúcuta"
              />
            </div>

            {/* Contraseña */}
            <div className="auth-field auth-field--full">
              <label className="auth-label" htmlFor="re-password">Contraseña *</label>
              <div className="auth-input-wrap">
                <input
                  id="re-password" name="password"
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
          </div>

          <button type="submit" className="auth-btn" disabled={loading || Boolean(success)}>
            {loading ? <><span className="auth-spinner" /> Registrando empresa…</> : 'Crear cuenta de empresa'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          {' · '}
          <Link to="/registro/cliente">Soy cliente</Link>
        </p>
      </motion.div>
    </div>
  )
}
