import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef()

  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({})

  useEffect(() => {
    api.get('/me')
      .then(({ data }) => {
        setPerfil(data)
        setForm({
          nombre:    data.nombre    || '',
          telefono:  data.telefono  || '',
          direccion: data.direccion || '',
          ciudad:    data.ciudad    || '',
          whatsapp:  data.whatsapp  || '',
        })
      })
      .catch(() => setErrorMsg('No se pudo cargar el perfil'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      const { data } = await api.put('/me', form)
      setPerfil(data)
      setSuccessMsg('Cambios guardados correctamente')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setErrorMsg('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/me/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPerfil(data)
      setSuccessMsg('Foto actualizada')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setErrorMsg('Error al subir la foto. Verifica que Cloudinary esté configurado.')
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete('/me')
      await logout()
      navigate('/')
    } catch {
      setErrorMsg('Error al eliminar la cuenta')
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-spinner" />
      <p>Cargando perfil…</p>
    </div>
  )

  const initials = (perfil?.nombre || perfil?.correo || '?')[0].toUpperCase()
  const esEmpresa = perfil?.rol === 'empresa'

  return (
    <div className="profile-page">
      <div className="container profile-layout">

        {/* Sidebar */}
        <motion.aside
          className="profile-sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {perfil?.foto_url
                ? <img src={perfil.foto_url} alt="Foto de perfil" />
                : <span>{initials}</span>
              }
              {uploadingFoto && (
                <div className="profile-avatar__overlay">
                  <div className="profile-spinner profile-spinner--sm" />
                </div>
              )}
            </div>
            <button
              className="profile-avatar__btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              title="Cambiar foto"
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFoto}
            />
          </div>

          <h2 className="profile-sidebar__name">{perfil?.nombre || perfil?.correo}</h2>
          <span className="profile-sidebar__role">
            {esEmpresa ? '🏭 Empresa' : '🛍️ Cliente'}
          </span>
          <p className="profile-sidebar__email">{perfil?.correo}</p>

          {esEmpresa && perfil?.nit && (
            <p className="profile-sidebar__nit">NIT: {perfil.nit}</p>
          )}
        </motion.aside>

        {/* Main content */}
        <motion.div
          className="profile-main"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Alerts */}
          <AnimatePresence>
            {successMsg && (
              <motion.div className="profile-alert profile-alert--success"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                ✅ {successMsg}
              </motion.div>
            )}
            {errorMsg && (
              <motion.div className="profile-alert profile-alert--error"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                ⚠️ {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Datos personales */}
          <section className="profile-section">
            <h3 className="profile-section__title">Información personal</h3>
            <form onSubmit={handleSave} className="profile-form">
              <div className="profile-grid">

                <div className="profile-field">
                  <label className="profile-label">{esEmpresa ? 'Razón social' : 'Nombre completo'}</label>
                  <input className="profile-input" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Tu nombre" />
                </div>

                <div className="profile-field">
                  <label className="profile-label">Teléfono</label>
                  <input className="profile-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+57 300 000 0000" />
                </div>

                {!esEmpresa && (
                  <div className="profile-field profile-field--full">
                    <label className="profile-label">Dirección</label>
                    <input className="profile-input" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle 12 #3-45, Cúcuta" />
                  </div>
                )}

                {esEmpresa && (
                  <>
                    <div className="profile-field">
                      <label className="profile-label">Ciudad</label>
                      <input className="profile-input" name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Cúcuta" />
                    </div>
                    <div className="profile-field">
                      <label className="profile-label">WhatsApp Business</label>
                      <input className="profile-input" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+57 300 000 0000" />
                    </div>
                  </>
                )}
              </div>

              <div className="profile-form__actions">
                <motion.button
                  type="submit"
                  className="profile-btn profile-btn--primary"
                  disabled={saving}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? <><span className="profile-spinner profile-spinner--sm" /> Guardando…</> : 'Guardar cambios'}
                </motion.button>
              </div>
            </form>
          </section>

          {/* Zona de peligro */}
          <section className="profile-section profile-section--danger">
            <h3 className="profile-section__title profile-section__title--danger">Zona de peligro</h3>
            <p className="profile-section__desc">
              Al eliminar tu cuenta, perderás acceso permanentemente. Esta acción no se puede deshacer.
            </p>
            <motion.button
              className="profile-btn profile-btn--danger"
              onClick={() => setShowDeleteModal(true)}
              whileTap={{ scale: 0.97 }}
            >
              🗑️ Eliminar mi cuenta
            </motion.button>
          </section>
        </motion.div>
      </div>

      {/* Modal confirmación de eliminación */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              className="profile-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteModal(false)}
            />
            <motion.div
              className="profile-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <span className="profile-modal__icon">⚠️</span>
              <h3 className="profile-modal__title">¿Eliminar cuenta?</h3>
              <p className="profile-modal__desc">
                Esta acción desactivará tu cuenta permanentemente. No podrás iniciar sesión ni recuperar tu información.
              </p>
              <div className="profile-modal__actions">
                <button
                  className="profile-btn profile-btn--secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <motion.button
                  className="profile-btn profile-btn--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  whileTap={{ scale: 0.97 }}
                >
                  {deleting ? <><span className="profile-spinner profile-spinner--sm" /> Eliminando…</> : 'Sí, eliminar'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
