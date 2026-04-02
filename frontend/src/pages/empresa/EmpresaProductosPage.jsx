import { useState, useEffect, useCallback } from 'react'
import '@google/model-viewer'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import './EmpresaProductosPage.css'

const ESTADOS = ['activo', 'inactivo', 'agotado']
const MEDIA_ACCEPT = 'image/*,.glb,.gltf'

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  precio: '',
  talla: '',
  color: '',
  stock: '',
  estado: 'activo',
}

function estadoBadge(estado) {
  const map = {
    activo: { label: 'Activo', cls: 'badge--activo' },
    inactivo: { label: 'Inactivo', cls: 'badge--inactivo' },
    agotado: { label: 'Agotado', cls: 'badge--agotado' },
  }
  const { label, cls } = map[estado] || { label: estado, cls: '' }
  return <span className={`ep-badge ${cls}`}>{label}</span>
}

function getMediaLabel(media) {
  if (media.tipo === 'modelo_3d') return `3D${media.formato ? ` .${media.formato}` : ''}`
  return 'Imagen'
}

function is3DFile(fileName = '', type = '') {
  const lowerName = fileName.toLowerCase()
  return lowerName.endsWith('.glb') || lowerName.endsWith('.gltf') || type.startsWith('model/')
}

async function uploadProductMedia(productId, files) {
  if (!files.length) return

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  await api.post(`/empresa/productos/${productId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

function ProductoModal({ producto, onClose, onSaved }) {
  const isEdit = Boolean(producto)
  const [form, setForm] = useState(isEdit ? {
    nombre: producto.nombre || '',
    descripcion: producto.descripcion || '',
    precio: producto.precio ?? '',
    talla: producto.talla || '',
    color: producto.color || '',
    stock: producto.stock ?? '',
    estado: producto.estado || 'activo',
  } : EMPTY_FORM)
  const [files, setFiles] = useState([])
  const [filePreviews, setFilePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [deletingMediaId, setDeletingMediaId] = useState(null)
  const [error, setError] = useState('')

  const existingMedia = producto?.media || []

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []))
  }

  useEffect(() => {
    const previews = files.map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
      is3D: is3DFile(file.name, file.type),
      url: URL.createObjectURL(file),
    }))

    setFilePreviews(previews)

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [files])

  const removeMedia = async (mediaId) => {
    if (!producto) return
    setDeletingMediaId(mediaId)
    setError('')
    try {
      await api.delete(`/empresa/productos/${producto.id}/media/${mediaId}`)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo eliminar el archivo')
    } finally {
      setDeletingMediaId(null)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.precio) {
      setError('Nombre y precio son obligatorios')
      return
    }

    setSaving(true)
    setError('')

    try {
      const body = {
        ...form,
        precio: parseFloat(form.precio),
        stock: parseInt(form.stock) || 0,
      }

      const response = isEdit
        ? await api.put(`/empresa/productos/${producto.id}`, body)
        : await api.post('/empresa/productos', body)

      if (files.length) {
        await uploadProductMedia(response.data.id, files)
      }

      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div className="ep-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="ep-modal-wrap">
        <motion.div
          className="ep-modal"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div className="ep-modal__header">
            <h2 className="ep-modal__title">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
            <button className="ep-modal__close" onClick={onClose}>✕</button>
          </div>

          <form onSubmit={submit} className="ep-modal__body">
            {error && <p className="ep-form-error">{error}</p>}

            <div className="ep-field ep-field--full">
              <label className="ep-label">Nombre *</label>
              <input className="ep-input" name="nombre" value={form.nombre} onChange={handle} placeholder="Ej: Air Runner X Pro" />
            </div>

            <div className="ep-field ep-field--full">
              <label className="ep-label">Descripción</label>
              <textarea className="ep-input ep-textarea" name="descripcion" value={form.descripcion} onChange={handle} rows={3} placeholder="Describe el producto..." />
            </div>

            <div className="ep-grid-2">
              <div className="ep-field">
                <label className="ep-label">Precio (COP) *</label>
                <input className="ep-input" name="precio" type="number" min="0" step="100" value={form.precio} onChange={handle} placeholder="189900" />
              </div>
              <div className="ep-field">
                <label className="ep-label">Stock</label>
                <input className="ep-input" name="stock" type="number" min="0" value={form.stock} onChange={handle} placeholder="0" />
              </div>
            </div>

            <div className="ep-grid-2">
              <div className="ep-field">
                <label className="ep-label">Tallas</label>
                <input className="ep-input" name="talla" value={form.talla} onChange={handle} placeholder="36,37,38,39,40" />
              </div>
              <div className="ep-field">
                <label className="ep-label">Colores</label>
                <input className="ep-input" name="color" value={form.color} onChange={handle} placeholder="Negro,Blanco,Rojo" />
              </div>
            </div>

            {isEdit && (
              <div className="ep-field">
                <label className="ep-label">Estado</label>
                <select className="ep-input ep-select" name="estado" value={form.estado} onChange={handle}>
                  {ESTADOS.map((estado) => <option key={estado} value={estado}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</option>)}
                </select>
              </div>
            )}

            <div className="ep-field ep-field--full">
              <label className="ep-label">Fotos y modelos 3D</label>
              <label className="ep-upload-box">
                <input className="ep-upload-input" type="file" accept={MEDIA_ACCEPT} multiple onChange={handleFiles} />
                <span className="ep-upload-title">Seleccionar imágenes, `.glb` o `.gltf`</span>
                <span className="ep-upload-subtitle">Se subirán a Cloudinary al guardar el producto.</span>
              </label>

              {files.length > 0 && (
                <div className="ep-media-grid ep-media-grid--pending">
                  {filePreviews.map((preview) => (
                    <div key={preview.key} className="ep-media-card">
                      {preview.is3D ? (
                        <model-viewer
                          src={preview.url}
                          camera-controls
                          interaction-prompt="none"
                          disable-zoom
                          style={{ width: '100%', height: '100%' }}
                          className="ep-media-card__viewer"
                        />
                      ) : (
                        <img className="ep-media-card__preview" src={preview.url} alt={preview.name} />
                      )}
                      <div className="ep-media-card__body">
                        <span className="ep-media-card__label">{preview.name}</span>
                        <span className="ep-media-card__meta">{preview.sizeKb} KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isEdit && existingMedia.length > 0 && (
              <div className="ep-field ep-field--full">
                <label className="ep-label">Archivos actuales</label>
                <div className="ep-media-grid">
                  {existingMedia.map((media) => (
                    <div key={media.id} className="ep-media-card">
                      {media.tipo === 'imagen' ? (
                        <img className="ep-media-card__preview" src={media.cloudinary_url} alt="" />
                      ) : (
                        <model-viewer
                          src={media.cloudinary_url}
                          camera-controls
                          interaction-prompt="none"
                          disable-zoom
                          style={{ width: '100%', height: '100%' }}
                          className="ep-media-card__viewer"
                        />
                      )}
                      <div className="ep-media-card__body">
                        <span className="ep-media-card__label">{getMediaLabel(media)}</span>
                        <button
                          type="button"
                          className="ep-media-card__remove"
                          onClick={() => removeMedia(media.id)}
                          disabled={deletingMediaId === media.id}
                        >
                          {deletingMediaId === media.id ? 'Eliminando...' : 'Quitar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ep-modal__actions">
              <button type="button" className="ep-btn ep-btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
              <button type="submit" className="ep-btn ep-btn--primary" disabled={saving}>
                {saving ? <span className="ep-spinner" /> : isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  )
}

function DeleteModal({ producto, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setDeleting(true)
    try {
      await api.delete(`/empresa/productos/${producto.id}`)
      onDeleted()
    } catch {
      setError('Error al eliminar. Intenta de nuevo.')
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.div className="ep-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!deleting ? onClose : undefined} />
      <div className="ep-modal-wrap">
        <motion.div
          className="ep-modal ep-modal--sm"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div className="ep-modal__header">
            <h2 className="ep-modal__title">¿Eliminar producto?</h2>
            <button className="ep-modal__close" onClick={onClose} disabled={deleting}>✕</button>
          </div>
          <div className="ep-modal__body">
            <p className="ep-delete-desc">
              Se eliminará <strong>{producto.nombre}</strong> permanentemente. Esta acción no se puede deshacer.
            </p>
            {error && <p className="ep-form-error">{error}</p>}
            <div className="ep-modal__actions">
              <button className="ep-btn ep-btn--ghost" onClick={onClose} disabled={deleting}>Cancelar</button>
              <button className="ep-btn ep-btn--danger" onClick={confirm} disabled={deleting}>
                {deleting ? <span className="ep-spinner" /> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function ProductoCard({ producto, onEdit, onDelete }) {
  const img = producto.media?.find((item) => item.tipo === 'imagen')?.cloudinary_url
  const has3D = producto.media?.some((item) => item.tipo === 'modelo_3d')
  const precio = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(producto.precio)

  return (
    <motion.div className="ep-card" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className="ep-card__img">
        {img
          ? <img src={img} alt={producto.nombre} />
          : <span className="ep-card__no-img">👟</span>}
        <div className="ep-card__badge">{estadoBadge(producto.estado)}</div>
        {has3D && <div className="ep-card__asset-badge">3D</div>}
      </div>
      <div className="ep-card__body">
        <h3 className="ep-card__name">{producto.nombre}</h3>
        <p className="ep-card__price">{precio}</p>
        <div className="ep-card__meta">
          {producto.talla && <span className="ep-tag">📏 {producto.talla}</span>}
          {producto.color && <span className="ep-tag">🎨 {producto.color}</span>}
          <span className="ep-tag">📦 Stock: {producto.stock}</span>
          <span className="ep-tag">🖼️ {producto.media?.length || 0} archivo(s)</span>
        </div>
      </div>
      <div className="ep-card__actions">
        <button className="ep-btn ep-btn--sm ep-btn--outline" onClick={() => onEdit(producto)}>✏️ Editar</button>
        <button className="ep-btn ep-btn--sm ep-btn--danger-outline" onClick={() => onDelete(producto)}>🗑️ Eliminar</button>
      </div>
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="ep-card ep-card--skeleton">
      <div className="ep-skeleton ep-card__img" />
      <div className="ep-card__body">
        <div className="ep-skeleton ep-sk-line ep-sk-line--lg" />
        <div className="ep-skeleton ep-sk-line" />
        <div className="ep-skeleton ep-sk-line ep-sk-line--sm" />
      </div>
    </div>
  )
}

export default function EmpresaProductosPage() {
  const [productos, setProductos] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState(null)
  const [modalDelete, setModalDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (q) params.q = q
      if (estado) params.estado = estado
      const { data } = await api.get('/empresa/productos', { params })
      setProductos(data.items)
      setTotal(data.total)
    } catch {
      // auth handled globally
    } finally {
      setLoading(false)
    }
  }, [page, q, estado])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [q, estado])

  const handleSaved = () => {
    setModalCreate(false)
    setModalEdit(null)
    load()
  }

  const handleDeleted = () => {
    setModalDelete(null)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="ep-page">
      <div className="ep-header container">
        <div>
          <h1 className="ep-title">Mis Productos</h1>
          <p className="ep-subtitle">{total} producto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="ep-btn ep-btn--primary ep-btn--lg" onClick={() => setModalCreate(true)}>
          + Nuevo producto
        </button>
      </div>

      <div className="ep-filters container">
        <div className="ep-search-wrap">
          <span className="ep-search-icon">🔍</span>
          <input className="ep-search" placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="ep-search-clear" onClick={() => setQ('')}>✕</button>}
        </div>

        <div className="ep-filter-pills">
          {['', ...ESTADOS].map((item) => (
            <button
              key={item}
              className={`ep-pill ${estado === item ? 'ep-pill--active' : ''}`}
              onClick={() => setEstado(item)}
            >
              {item ? item.charAt(0).toUpperCase() + item.slice(1) : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="container">
        {loading ? (
          <div className="ep-grid">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : productos.length === 0 ? (
          <div className="ep-empty">
            <span className="ep-empty__icon">📦</span>
            <h3 className="ep-empty__title">{q || estado ? 'Sin resultados' : 'Aún no tienes productos'}</h3>
            <p className="ep-empty__desc">
              {q || estado ? 'Prueba con otros filtros.' : 'Agrega tu primer producto para empezar a vender.'}
            </p>
            {!q && !estado && (
              <button className="ep-btn ep-btn--primary" onClick={() => setModalCreate(true)}>
                + Agregar producto
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="ep-grid">
              {productos.map((producto) => (
                <ProductoCard
                  key={producto.id}
                  producto={producto}
                  onEdit={setModalEdit}
                  onDelete={setModalDelete}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <div className="ep-pagination">
            <button className="ep-btn ep-btn--ghost ep-btn--sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>← Anterior</button>
            <span className="ep-page-info">Página {page} de {totalPages}</span>
            <button className="ep-btn ep-btn--ghost ep-btn--sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Siguiente →</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalCreate && <ProductoModal key="create" onClose={() => setModalCreate(false)} onSaved={handleSaved} />}
        {modalEdit && <ProductoModal key="edit" producto={modalEdit} onClose={() => setModalEdit(null)} onSaved={handleSaved} />}
        {modalDelete && <DeleteModal key="delete" producto={modalDelete} onClose={() => setModalDelete(null)} onDeleted={handleDeleted} />}
      </AnimatePresence>
    </div>
  )
}
