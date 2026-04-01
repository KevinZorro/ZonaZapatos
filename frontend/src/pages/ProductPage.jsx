// RF6 — Detalle del producto
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ARViewer from '../components/ARViewer'
import './ProductPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ESTADOS = {
  activo:   { label: 'Listo para entrega',   icon: '✅', color: '#16A34A', bg: '#F0FDF4' },
  agotado:  { label: 'Agotado',              icon: '❌', color: '#DC2626', bg: '#FEF2F2' },
  inactivo: { label: 'Pronto disponible',    icon: '🔜', color: '#D97706', bg: '#FFFBEB' },
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
}

// Parsea tallas separadas por coma o espacio
function parseTallas(str) {
  if (!str) return []
  return str.split(/[,\s]+/).filter(Boolean)
}

// Parsea colores separados por coma
function parseColores(str) {
  if (!str) return []
  return str.split(/,\s*/).filter(Boolean)
}

// Intenta mostrar un color CSS. Si no es color válido, devuelve null
function colorSwatch(colorStr) {
  const simple = colorStr.toLowerCase().trim()
  return simple
}

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [selectedTalla, setSelectedTalla] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [showAR, setShowAR] = useState(false)

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
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const syncViewport = (event) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', syncViewport)

    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [])

  if (loading) return (
    <div className="pp-loading">
      <div className="pp-loading__spinner" />
      <p>Cargando producto…</p>
    </div>
  )

  if (error) return (
    <div className="pp-error">
      <span className="pp-error__icon">⚠️</span>
      <h2>{error}</h2>
      <button onClick={() => navigate('/catalogo')} className="pp-back-btn">← Volver al catálogo</button>
    </div>
  )

  if (!product) return null

  const estado = ESTADOS[product.estado] || { label: product.estado, icon: '📦', color: '#6B7280', bg: '#F9FAFB' }
  const imagenes = product.media?.filter(m => m.tipo === 'imagen') || []
  const modelo3D = product.media?.find(m => m.tipo === 'modelo_3d')
  const modelSrc = modelo3D?.cloudinary_url || product.modelo_3d_url
  const tallas    = parseTallas(product.talla)
  const colores   = parseColores(product.color)
  const agotado   = product.estado === 'agotado'

  // Datos incompletos (RF6 — advertencia)
  const incomplete = imagenes.length === 0 || !product.talla || !product.color

  const whatsapp = product.empresa_whatsapp
  const waMsg = encodeURIComponent(`Hola, estoy interesado en el producto: ${product.nombre} (ID: ${product.id})`)
  const waUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${waMsg}` : null

  return (
    <div className="product-page">
      {/* Breadcrumb */}
      <div className="container pp-breadcrumb">
        <Link to="/catalogo" className="pp-breadcrumb__link">Catálogo</Link>
        <span className="pp-breadcrumb__sep">›</span>
        <span>{product.nombre}</span>
      </div>

      <div className="container pp-layout">
        {/* Columna izquierda — Galería */}
        <div className="pp-gallery">
          {/* Imagen principal */}
          <motion.div className="pp-main-img-wrap" layoutId={`img-${id}`}>
            {imagenes.length > 0
              ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImg}
                    src={imagenes[activeImg].cloudinary_url}
                    alt={product.nombre}
                    className="pp-main-img"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>
              )
              : <div className="pp-img-placeholder">👟</div>
            }

            {/* Badge estado */}
            <span className="pp-estado-badge" style={{ background: estado.bg, color: estado.color }}>
              {estado.icon} {estado.label}
            </span>
          </motion.div>

          {/* Thumbnails */}
          {imagenes.length > 1 && (
            <div className="pp-thumbs">
              {imagenes.map((img, i) => (
                <button
                  key={img.id}
                  className={`pp-thumb ${i === activeImg ? 'pp-thumb--active' : ''}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Imagen ${i + 1}`}
                >
                  <img src={img.cloudinary_url} alt="" />
                </button>
              ))}
            </div>
          )}

          {/* Botón AR */}
          {modelSrc && (
            <motion.button
              className="pp-ar-btn"
              onClick={() => setShowAR(!showAR)}
              whileTap={{ scale: 0.97 }}
            >
              🥽 {showAR ? 'Ocultar visor 3D' : 'Ver en 3D / Realidad Aumentada'}
            </motion.button>
          )}

          {/* AR Viewer */}
          <AnimatePresence>
            {showAR && modelSrc && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ARViewer modelSrc={modelSrc} title={product.nombre} isMobile={isMobile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Columna derecha — Info */}
        <motion.div
          className="pp-info"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {/* Empresa */}
          {product.empresa_nombre && (
            <p className="pp-empresa">{product.empresa_nombre}</p>
          )}

          <h1 className="pp-nombre">{product.nombre}</h1>

          {/* Categorías */}
          {product.categorias?.length > 0 && (
            <div className="pp-cats">
              {product.categorias.map(c => (
                <span key={c.id} className="pp-cat-chip">{c.nombre}</span>
              ))}
            </div>
          )}

          {/* Precio */}
          <div className="pp-precio-wrap">
            <span className="pp-precio">{formatPrice(product.precio)}</span>
            {product.stock > 0 && product.stock <= 5 && (
              <span className="pp-stock-warn">⚡ Solo quedan {product.stock}</span>
            )}
          </div>

          {/* Advertencia de datos incompletos — RF6 */}
          {incomplete && (
            <motion.div
              className="pp-incomplete-warn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠️ Este producto tiene información incompleta. {agotado ? 'No disponible para compra.' : 'Contacta a la empresa para más detalles.'}
            </motion.div>
          )}

          {/* Descripción */}
          {product.descripcion && (
            <div className="pp-desc">
              <h3 className="pp-section-title">Descripción</h3>
              <p>{product.descripcion}</p>
            </div>
          )}

          {/* Tallas */}
          {tallas.length > 0 && (
            <div className="pp-tallas">
              <h3 className="pp-section-title">Tallas disponibles</h3>
              <div className="pp-chips">
                {tallas.map(t => (
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

          {/* Colores */}
          {colores.length > 0 && (
            <div className="pp-colores">
              <h3 className="pp-section-title">Colores</h3>
              <div className="pp-chips">
                {colores.map(c => (
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

          {/* Stock */}
          <div className="pp-stock-info">
            <span className="pp-stock-dot" style={{ background: agotado ? 'var(--error)' : 'var(--success)' }} />
            {agotado ? 'Sin stock actualmente' : `${product.stock} unidades disponibles`}
          </div>

          {/* Acciones */}
          <div className="pp-actions">
            {/* Botón contactar por WhatsApp */}
            {waUrl ? (
              <motion.a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`pp-btn pp-btn--wa ${agotado ? 'pp-btn--disabled' : ''}`}
                whileTap={{ scale: agotado ? 1 : 0.97 }}
                onClick={e => agotado && e.preventDefault()}
              >
                <span>📱</span>
                {agotado ? 'Producto agotado' : 'Consultar por WhatsApp'}
              </motion.a>
            ) : (
              <p className="pp-no-wa">La empresa no tiene WhatsApp registrado</p>
            )}

            {/* Botón agregar al carrito (fase futura) */}
            <motion.button
              className="pp-btn pp-btn--secondary"
              disabled={agotado}
              whileTap={{ scale: agotado ? 1 : 0.97 }}
              title={agotado ? 'Producto agotado' : 'Agregar al carrito'}
            >
              🛒 {agotado ? 'No disponible' : 'Agregar al carrito'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
