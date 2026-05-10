// RF6 - Detalle del producto
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCarrito } from '../context/CarritoContext'
import ARViewer from '../components/ARViewer'
import { getResenasProducto, getEncuestaPendientePorProducto, responderEncuesta, actualizarEncuesta, eliminarEncuesta } from '../services/encuestas'
import { useAuth } from '../context/AuthContext'
import './ProductPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ESTADOS = {
  activo: { label: 'Listo para entrega', icon: '✅', color: '#16A34A', bg: '#F0FDF4' },
  agotado: { label: 'Agotado', icon: '❌', color: '#DC2626', bg: '#FEF2F2' },
  inactivo: { label: 'Pronto disponible', icon: '🔜', color: '#D97706', bg: '#FFFBEB' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
}

function parseTallas(str) {
  if (!str) return []
  return str.split(/[,\s]+/).filter(Boolean)
}

function parseColores(str) {
  if (!str) return []
  return str.split(/,\s*/).filter(Boolean)
}

function colorSwatch(colorStr) {
  return colorStr.toLowerCase().trim()
}

function StarRating({ rating, size = 'normal', onChange, interactive = false }) {
  const [hoverRating, setHoverRating] = useState(0)

  const isInteractive = interactive || !!onChange

  return (
    <div className={`pp-stars pp-stars--${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`pp-star ${star <= (hoverRating || rating) ? 'pp-star--filled' : 'pp-star--empty'}`}
          onClick={() => isInteractive && onChange && onChange(star)}
          onMouseEnter={() => isInteractive && setHoverRating(star)}
          onMouseLeave={() => isInteractive && setHoverRating(0)}
          style={isInteractive ? { cursor: 'pointer' } : { cursor: 'default' }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function ResenaForm({ encuesta, onSubmit, onCancel }) {
  const [calificacion, setCalificacion] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (calificacion === 0) return
    setSubmitting(true)
    try {
      await onSubmit(calificacion, comentario)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pp-resena-form">
      <h4 className="pp-resena-form__title">Deja tu reseña</h4>
      <p className="pp-resena-form__subtitle">Califica el producto que compraste</p>

      <form onSubmit={handleSubmit}>
        <div className="pp-resena-form__stars">
          <label>Tu calificación</label>
          <div className="pp-resena-form__stars-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`pp-resena-form__star-btn ${
                  star <= (hoverRating || calificacion) ? 'pp-resena-form__star-btn--active' : ''
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setCalificacion(star)}
              >
                ★
              </button>
            ))}
          </div>
          {calificacion > 0 && (
            <span className="pp-resena-form__rating-text">
              {['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][calificacion - 1]}
            </span>
          )}
        </div>

        <div className="pp-resena-form__comment">
          <label>Comentario (opcional)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Cuéntanos tu experiencia con el producto..."
            rows={3}
            maxLength={500}
          />
          <span className="pp-resena-form__char-count">{comentario.length}/500</span>
        </div>

        <div className="pp-resena-form__actions">
          <button
            type="submit"
            className="pp-resena-form__submit"
            disabled={calificacion === 0 || submitting}
          >
            {submitting ? 'Enviando...' : 'Enviar reseña'}
          </button>
          <button
            type="button"
            className="pp-resena-form__cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function ResenasSection({ resenasData, encuestaPendiente, onResenaSubmit, onResenaEdit, onResenaDelete, cliente, clienteId, mostrarFormulario, setMostrarFormulario }) {
  const [editingResena, setEditingResena] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  const handleSubmit = async (calificacion, comentario) => {
    await onResenaSubmit(calificacion, comentario)
    setMostrarFormulario(false)
  }

  if (!resenasData || resenasData.total === 0) {
    return (
      <div className="pp-resenas">
        <h3 className="pp-section-title">Reseñas de clientes</h3>
        {encuestaPendiente && cliente && !mostrarFormulario ? (
          <div className="pp-resenas-empty">
            <div className="pp-resenas-empty-icon">★</div>
            <p className="pp-resenas-empty-title">Aún no hay reseñas</p>
            <p className="pp-resenas-empty-text">
              Sé el primero en dejar tu opinión sobre este producto.
            </p>
            <button
              className="pp-resenas-empty__cta"
              onClick={() => setMostrarFormulario(true)}
            >
              Escribir reseña
            </button>
          </div>
        ) : encuestaPendiente && cliente && mostrarFormulario ? (
          <ResenaForm
            encuesta={encuestaPendiente}
            onSubmit={handleSubmit}
            onCancel={() => setMostrarFormulario(false)}
          />
        ) : (
          <div className="pp-resenas-empty">
            <div className="pp-resenas-empty-icon">★</div>
            <p className="pp-resenas-empty-title">Aún no hay reseñas</p>
            <p className="pp-resenas-empty-text">
              Este producto no tiene valoraciones ni comentarios aún.
              <br />
              ¡Compra y sé el primero en dejar tu opinión!
            </p>
          </div>
        )}
      </div>
    )
  }

  const { promedio, total, distribucion, resenas } = resenasData

  return (
    <div className="pp-resenas">
      <h3 className="pp-section-title">Reseñas de clientes</h3>

      <div className="pp-resenas-summary">
        <div className="pp-resenas-promedio">
          <span className="pp-resenas-score">{promedio.toFixed(1)}</span>
          <StarRating rating={Math.round(promedio)} size="large" />
          <span className="pp-resenas-total">{total} reseña{total !== 1 ? 's' : ''}</span>
        </div>

        <div className="pp-resenas-bars">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribucion[star] || 0
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={star} className="pp-resenas-bar">
                <span className="pp-resenas-bar-label">{star} ★</span>
                <div className="pp-resenas-bar-track">
                  <div
                    className="pp-resenas-bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="pp-resenas-bar-count">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {resenas.length > 0 && (
        <div className="pp-resenas-list">
          {resenas.slice(0, 5).map((resena) => (
            <div key={resena.id} className="pp-resena-item">
              <div className="pp-resena-header">
                <div className="pp-resena-cliente">
                  {resena.cliente?.avatar_url ? (
                    <img 
                      src={resena.cliente.avatar_url} 
                      alt={resena.cliente.nombre}
                      className="pp-resena-avatar"
                    />
                  ) : (
                    <div className="pp-resena-avatar-placeholder">
                      {resena.cliente?.inicial || '?'}
                    </div>
                  )}
                  <span className="pp-resena-nombre">
                    {resena.cliente?.nombre || 'Cliente'}
                  </span>
                </div>
                <StarRating rating={resena.calificacion} size="small" />
              </div>
              <span className="pp-resena-date">
                {resena.respondida_en
                  ? new Date(resena.respondida_en).toLocaleDateString('es-CO')
                  : ''}
              </span>
              {resena.comentario && (
                <p className="pp-resena-comment">{resena.comentario}</p>
              )}
              {/* Botones de editar/eliminar para el autor de la reseña */}
              {clienteId && resena.cliente_id === clienteId && (
                <div className="pp-resena-actions" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  {editingResena?.id === resena.id ? (
                    // Formulario de edición inline
                    <div style={{ width: '100%', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                      <StarRating rating={editRating} onChange={setEditRating} size="medium" />
                      <textarea
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Edita tu comentario (opcional)"
                        rows={3}
                        style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                      />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button
                          onClick={async () => {
                            await onResenaEdit(resena.id, editRating, editComment)
                            setEditingResena(null)
                          }}
                          style={{ padding: '6px 12px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingResena(null)}
                          style={{ padding: '6px 12px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingResena(resena)
                          setEditRating(resena.calificacion)
                          setEditComment(resena.comentario || '')
                        }}
                        style={{ padding: '4px 8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => onResenaDelete(resena.id)}
                        style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        🗑️ Eliminar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulario para crear nueva reseña cuando hay reseñas existentes */}
      {encuestaPendiente && cliente && mostrarFormulario && (
        <ResenaForm
          encuesta={encuestaPendiente}
          onSubmit={handleSubmit}
          onCancel={() => setMostrarFormulario(false)}
        />
      )}

      {/* Botón para mostrar formulario cuando hay reseñas pero está oculto */}
      {encuestaPendiente && cliente && !mostrarFormulario && resenasData.total > 0 && (
        <div className="pp-resenas-add-review">
          <button
            className="pp-resenas-add-review__btn"
            onClick={() => setMostrarFormulario(true)}
          >
            ✍️ Escribir una reseña
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { agregarItem } = useCarrito()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [activeMedia, setActiveMedia] = useState(0)
  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [resenasData, setResenasData] = useState(null)
  const [encuestaPendiente, setEncuestaPendiente] = useState(null)
  // Estados para edición de reseñas
  const [editingResena, setEditingResena] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  // Estado para mostrar formulario de reseña desde el banner
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${API}/productos/${id}`)
        if (res.status === 404) throw new Error('Producto no encontrado')
        if (!res.ok) throw new Error('No se pudo cargar el producto')
        const data = await res.json()
        setProduct(data)

        // Cargar reseñas
        const resenas = await getResenasProducto(id)
        setResenasData(resenas)

        // Si el usuario es cliente, verificar si tiene encuesta pendiente para este producto
        if (user?.rol === 'cliente') {
          try {
            const encuesta = await getEncuestaPendientePorProducto(id)
            setEncuestaPendiente(encuesta)
          } catch (e) {
            // No hay encuesta pendiente o no está autenticado
            setEncuestaPendiente(null)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id, user])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const syncViewport = (event) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', syncViewport)

    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    setActiveMedia(0)
  }, [product?.id])

  if (loading) {
    return (
      <div className="pp-loading">
        <div className="pp-loading__spinner" />
        <p>Cargando producto...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pp-error">
        <span className="pp-error__icon">⚠️</span>
        <h2>{error}</h2>
        <button onClick={() => navigate('/catalogo')} className="pp-back-btn">← Volver al catálogo</button>
      </div>
    )
  }

  if (!product) return null

  const estado = ESTADOS[product.estado] || { label: product.estado, icon: '📦', color: '#6B7280', bg: '#F9FAFB' }
  const imagenes = product.media?.filter((m) => m.tipo === 'imagen') || []
  const modelo3D = product.media?.find((m) => m.tipo === 'modelo_3d')
  const modelSrc = modelo3D?.cloudinary_url || product.modelo_3d_url
  const galleryItems = [
    ...imagenes.map((img) => ({ ...img, mediaType: 'imagen' })),
    ...(modelSrc ? [{
      id: modelo3D?.id || 'modelo-3d',
      cloudinary_url: modelSrc,
      formato: modelo3D?.formato || 'glb',
      mediaType: 'modelo_3d',
    }] : []),
  ]
  const currentMedia = galleryItems[activeMedia] || null
  const tallas = parseTallas(product.talla)
  const colores = parseColores(product.color)
  const agotado = product.estado === 'agotado'
  const incomplete = imagenes.length === 0 || !product.talla || !product.color

  const whatsapp = product.empresa_whatsapp
  const waMsg = encodeURIComponent(`Hola, estoy interesado en el producto: ${product.nombre} (ID: ${product.id})`)
  const waUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${waMsg}` : null

  return (
    <div className="product-page">
      <div className="container pp-breadcrumb">
        <Link to="/catalogo" className="pp-breadcrumb__link">Catálogo</Link>
        <span className="pp-breadcrumb__sep">›</span>
        <span>{product.nombre}</span>
      </div>

      <div className="container pp-layout">
        <div className="pp-gallery">
          <motion.div className="pp-main-img-wrap" layoutId={`img-${id}`}>
            {currentMedia?.mediaType === 'modelo_3d' ? (
              <div className="pp-model-stage">
                <ARViewer modelSrc={currentMedia.cloudinary_url} title={product.nombre} isMobile={isMobile} />
              </div>
            ) : imagenes.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentMedia?.id || activeMedia}
                  src={currentMedia?.cloudinary_url || imagenes[0].cloudinary_url}
                  alt={product.nombre}
                  className="pp-main-img"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                />
              </AnimatePresence>
            ) : (
              <div className="pp-img-placeholder">👟</div>
            )}

            <span className="pp-estado-badge" style={{ background: estado.bg, color: estado.color }}>
              {estado.icon} {estado.label}
            </span>
          </motion.div>

          {galleryItems.length > 1 && (
            <div className="pp-thumbs">
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.mediaType}-${item.id}`}
                  className={`pp-thumb ${index === activeMedia ? 'pp-thumb--active' : ''} ${item.mediaType === 'modelo_3d' ? 'pp-thumb--model' : ''}`}
                  onClick={() => setActiveMedia(index)}
                  aria-label={item.mediaType === 'modelo_3d' ? 'Modelo 3D' : `Imagen ${index + 1}`}
                >
                  {item.mediaType === 'modelo_3d' ? (
                    <div className="pp-thumb-model">
                      <span className="pp-thumb-model__icon">3D</span>
                      <span className="pp-thumb-model__label">AR</span>
                    </div>
                  ) : (
                    <img src={item.cloudinary_url} alt="" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div
          className="pp-info"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {product.empresa_nombre && (
            <p className="pp-empresa">{product.empresa_nombre}</p>
          )}

          <h1 className="pp-nombre">{product.nombre}</h1>

          {product.categorias?.length > 0 && (
            <div className="pp-cats">
              {product.categorias.map((c) => (
                <span key={c.id} className="pp-cat-chip">{c.nombre}</span>
              ))}
            </div>
          )}

          <div className="pp-precio-wrap">
            <span className="pp-precio">{formatPrice(product.precio)}</span>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="pp-stock-warn">⚡ Solo quedan {product.stock}</span>
            )}
          </div>

          {incomplete && (
            <motion.div className="pp-incomplete-warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              ⚠️ Este producto tiene información incompleta. {agotado ? 'No disponible para compra.' : 'Contacta a la empresa para más detalles.'}
            </motion.div>
          )}

          {product.descripcion && (
            <div className="pp-desc">
              <h3 className="pp-section-title">Descripción</h3>
              <p>{product.descripcion}</p>
            </div>
          )}

          {tallas.length > 0 && (
            <div className="pp-tallas">
              <h3 className="pp-section-title">Tallas disponibles</h3>
              <div className="pp-chips">
                {tallas.map((t) => (
                  <motion.button
                    key={t}
                    className={`pp-chip-btn ${selectedTalla === t ? 'pp-chip-btn--active' : ''}`}
                    onClick={() => setSelectedTalla(selectedTalla === t ? null : t)}
                    whileTap={{ scale: 0.93 }}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {colores.length > 0 && (
            <div className="pp-colores">
              <h3 className="pp-section-title">Colores</h3>
              <div className="pp-chips">
                {colores.map((c) => (
                  <motion.button
                    key={c}
                    className={`pp-color-btn ${selectedColor === c ? 'pp-color-btn--active' : ''}`}
                    title={c}
                    onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                    whileTap={{ scale: 0.9 }}
                    style={{ '--swatch': colorSwatch(c) }}
                  >
                    <span className="pp-color-swatch" style={{ background: colorSwatch(c) }} />
                    <span className="pp-color-label">{c}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="pp-stock-info">
            <span className="pp-stock-dot" style={{ background: agotado ? 'var(--error)' : 'var(--success)' }} />
            {agotado ? 'Sin stock actualmente' : `${product.stock} unidades disponibles`}
          </div>

          {/* Banner: Puedes dejar reseña */}
          {encuestaPendiente && (
            <div className="pp-encuesta-banner">
              <div className="pp-encuesta-banner__icon">✍️</div>
              <div className="pp-encuesta-banner__content">
                <p className="pp-encuesta-banner__title">¿Compraste este producto?</p>
                <p className="pp-encuesta-banner__text">Tu opinión ayuda a otros clientes</p>
              </div>
              <button
                className="pp-encuesta-banner__btn"
                onClick={() => {
                  setMostrarFormulario(true)
                  setTimeout(() => {
                    document.querySelector('.pp-resenas-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }}
              >
                Dejar reseña →
              </button>
            </div>
          )}

          {/* Reseñas en el sidebar */}
          {resenasData && (
            <div className={`pp-resenas-mini ${resenasData.total === 0 ? 'pp-resenas-mini--empty' : ''}`}>
              {resenasData.total > 0 ? (
                <div className="pp-resenas-mini-header">
                  <StarRating rating={Math.round(resenasData.promedio)} size="small" />
                  <span className="pp-resenas-mini-score">{resenasData.promedio.toFixed(1)}</span>
                  <span className="pp-resenas-mini-count">({resenasData.total} reseña{resenasData.total !== 1 ? 's' : ''})</span>
                </div>
              ) : (
                <div className="pp-resenas-mini-header">
                  <span className="pp-resenas-mini-star--empty">★</span>
                  <span className="pp-resenas-mini-text">Sin reseñas aún</span>
                </div>
              )}
            </div>
          )}

          <div className="pp-actions">
            {waUrl ? (
              <motion.a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`pp-btn pp-btn--wa ${agotado ? 'pp-btn--disabled' : ''}`}
                whileTap={{ scale: agotado ? 1 : 0.97 }}
                onClick={(e) => agotado && e.preventDefault()}
              >
                <span>📱</span>
                {agotado ? 'Producto agotado' : 'Consultar por WhatsApp'}
              </motion.a>
            ) : (
              <p className="pp-no-wa">La empresa no tiene WhatsApp registrado</p>
            )}

            <motion.button
              className="pp-btn pp-btn--secondary"
              disabled={agotado}
              whileTap={{ scale: agotado ? 1 : 0.97 }}
              title={agotado ? 'Producto agotado' : 'Agregar al carrito'}
              onClick={() => {
                if (!agotado) {
                  agregarItem(product)
                  navigate('/carrito')
                }
              }}>
              🛒 {agotado ? 'No disponible' : 'Agregar al carrito'}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Sección de reseñas */}
      <div className="container pp-resenas-section">
        <ResenasSection
          resenasData={resenasData}
          encuestaPendiente={encuestaPendiente}
          onResenaSubmit={async (calificacion, comentario) => {
            if (!encuestaPendiente) return
            try {
              await responderEncuesta(encuestaPendiente.id, calificacion, comentario)
              // Recargar reseñas para mostrar la nueva
              const resenas = await getResenasProducto(id)
              setResenasData(resenas)
              setEncuestaPendiente(null)
              alert('¡Gracias por tu reseña!')
            } catch (err) {
              alert('Error al enviar la reseña: ' + err.message)
            }
          }}
          onResenaEdit={async (resenaId, calificacion, comentario) => {
            try {
              await actualizarEncuesta(resenaId, calificacion, comentario)
              // Recargar reseñas
              const resenas = await getResenasProducto(id)
              setResenasData(resenas)
              alert('¡Reseña actualizada!')
            } catch (err) {
              alert('Error al actualizar la reseña: ' + err.message)
            }
          }}
          onResenaDelete={async (resenaId) => {
            if (!confirm('¿Estás seguro de eliminar esta reseña?')) return
            try {
              await eliminarEncuesta(resenaId)
              // Recargar reseñas
              const resenas = await getResenasProducto(id)
              setResenasData(resenas)
              alert('¡Reseña eliminada!')
            } catch (err) {
              alert('Error al eliminar la reseña: ' + err.message)
            }
          }}
          cliente={user?.rol === 'cliente'}
          clienteId={user?.cliente_id}
          mostrarFormulario={mostrarFormulario}
          setMostrarFormulario={setMostrarFormulario}
        />
      </div>
    </div>
  )
}
