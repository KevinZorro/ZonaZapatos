import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import './EmpresaProductosPage.css'

const ESTADOS = ['activo', 'inactivo', 'agotado']

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
    activo:  { label: 'Activo',   cls: 'badge--activo' },
    inactivo:{ label: 'Inactivo', cls: 'badge--inactivo' },
    agotado: { label: 'Agotado',  cls: 'badge--agotado' },
  }
  const { label, cls } = map[estado] || { label: estado, cls: '' }
  return <span className={`ep-badge ${cls}`}>{label}</span>
}

// ── Modal producto ─────────────────────────────────────────────────────────────
function ProductoModal({ producto, onClose, onSaved }) {
  const isEdit = Boolean(producto)
  const [form, setForm] = useState(isEdit ? {
    nombre:      producto.nombre      || '',
    descripcion: producto.descripcion || '',
    precio:      producto.precio      ?? '',
    talla:       producto.talla       || '',
    color:       producto.color       || '',
    stock:       producto.stock       ?? '',
    estado:      producto.estado      || 'activo',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async e => {
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
        stock:  parseInt(form.stock) || 0,
      }
      if (isEdit) {
        await api.put(`/empresa/productos/${producto.id}`, body)
      } else {
        await api.post('/empresa/productos', body)
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
                  {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                </select>
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

// ── Modal eliminar ─────────────────────────────────────────────────────────────
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

// ── Card de producto ───────────────────────────────────────────────────────────
function ProductoCard({ producto, onEdit, onDelete }) {
  const img = producto.media?.[0]?.cloudinary_url
  const precio = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(producto.precio)

  return (
    <motion.div className="ep-card" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <div className="ep-card__img">
        {img
          ? <img src={img} alt={producto.nombre} />
          : <span className="ep-card__no-img">👟</span>
        }
        <div className="ep-card__badge">{estadoBadge(producto.estado)}</div>
      </div>
      <div className="ep-card__body">
        <h3 className="ep-card__name">{producto.nombre}</h3>
        <p className="ep-card__price">{precio}</p>
        <div className="ep-card__meta">
          {producto.talla && <span className="ep-tag">📏 {producto.talla}</span>}
          {producto.color && <span className="ep-tag">🎨 {producto.color}</span>}
          <span className="ep-tag">📦 Stock: {producto.stock}</span>
        </div>
      </div>
      <div className="ep-card__actions">
        <button className="ep-btn ep-btn--sm ep-btn--outline" onClick={() => onEdit(producto)}>✏️ Editar</button>
        <button className="ep-btn ep-btn--sm ep-btn--danger-outline" onClick={() => onDelete(producto)}>🗑️ Eliminar</button>
      </div>
    </motion.div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
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

// ── Página principal ───────────────────────────────────────────────────────────
export default function EmpresaProductosPage() {
  const [productos, setProductos] = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [estado, setEstado]       = useState('')
  const [page, setPage]           = useState(1)
  const PAGE_SIZE = 12

  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit]     = useState(null)   // producto a editar
  const [modalDelete, setModalDelete] = useState(null)   // producto a eliminar

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (q)      params.q      = q
      if (estado) params.estado = estado
      const { data } = await api.get('/empresa/productos', { params })
      setProductos(data.items)
      setTotal(data.total)
    } catch {
      // error silencioso — el guard de ruta ya maneja auth
    } finally {
      setLoading(false)
    }
  }, [page, q, estado])

  useEffect(() => { load() }, [load])

  // Reset page al cambiar filtros
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
      {/* Header */}
      <div className="ep-header container">
        <div>
          <h1 className="ep-title">Mis Productos</h1>
          <p className="ep-subtitle">{total} producto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="ep-btn ep-btn--primary ep-btn--lg" onClick={() => setModalCreate(true)}>
          + Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="ep-filters container">
        <div className="ep-search-wrap">
          <span className="ep-search-icon">🔍</span>
          <input
            className="ep-search"
            placeholder="Buscar producto..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {q && <button className="ep-search-clear" onClick={() => setQ('')}>✕</button>}
        </div>

        <div className="ep-filter-pills">
          {['', ...ESTADOS].map(e => (
            <button
              key={e}
              className={`ep-pill ${estado === e ? 'ep-pill--active' : ''}`}
              onClick={() => setEstado(e)}
            >
              {e ? e.charAt(0).toUpperCase() + e.slice(1) : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
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
              {productos.map(p => (
                <ProductoCard
                  key={p.id}
                  producto={p}
                  onEdit={setModalEdit}
                  onDelete={setModalDelete}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="ep-pagination">
            <button className="ep-btn ep-btn--ghost ep-btn--sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <span className="ep-page-info">Página {page} de {totalPages}</span>
            <button className="ep-btn ep-btn--ghost ep-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
          </div>
        )}
      </div>

      {/* Modales */}
      <AnimatePresence>
        {modalCreate && (
          <ProductoModal key="create" onClose={() => setModalCreate(false)} onSaved={handleSaved} />
        )}
        {modalEdit && (
          <ProductoModal key="edit" producto={modalEdit} onClose={() => setModalEdit(null)} onSaved={handleSaved} />
        )}
        {modalDelete && (
          <DeleteModal key="delete" producto={modalDelete} onClose={() => setModalDelete(null)} onDeleted={handleDeleted} />
        )}
      </AnimatePresence>
    </div>
  )
}
