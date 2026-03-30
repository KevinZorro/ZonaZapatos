// RF5 — Catálogo general público
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './CatalogPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ESTADOS = {
  activo:   { label: 'Disponible',      color: '#16A34A', bg: '#F0FDF4' },
  agotado:  { label: 'Agotado',         color: '#DC2626', bg: '#FEF2F2' },
  inactivo: { label: 'Pronto disponible', color: '#D97706', bg: '#FFFBEB' },
}

function getEstado(e) {
  return ESTADOS[e] || { label: e, color: '#6B7280', bg: '#F9FAFB' }
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
}

function ProductCard({ product, index }) {
  const estado = getEstado(product.estado)
  const imagen = product.media?.find(m => m.tipo === 'imagen')?.cloudinary_url

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <Link to={`/productos/${product.id}`} className="prod-card">
        {/* Imagen */}
        <div className="prod-card__img-wrap">
          {imagen
            ? <img src={imagen} alt={product.nombre} className="prod-card__img" loading="lazy" />
            : <div className="prod-card__img-placeholder">👟</div>
          }
          <span className="prod-card__badge" style={{ background: estado.bg, color: estado.color }}>
            {estado.label}
          </span>
          {product.stock <= 5 && product.stock > 0 && (
            <span className="prod-card__badge prod-card__badge--stock">Últimas {product.stock}</span>
          )}
        </div>

        {/* Info */}
        <div className="prod-card__body">
          <p className="prod-card__empresa">{product.empresa_nombre || `Empresa #${product.empresa_id}`}</p>
          <h3 className="prod-card__name">{product.nombre}</h3>

          <div className="prod-card__meta">
            {product.talla && <span className="prod-card__chip">T: {product.talla}</span>}
            {product.color && (
              <span className="prod-card__chip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: product.color, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />
                {product.color}
              </span>
            )}
          </div>

          <div className="prod-card__footer">
            <span className="prod-card__price">{formatPrice(product.precio)}</span>
            <span className="prod-card__cta">Ver →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function CatalogPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const PAGE_SIZE = 20

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/productos?page=${p}&page_size=${PAGE_SIZE}`)
      if (!res.ok) throw new Error('No se pudo cargar el catálogo')
      const data = await res.json()
      setTotal(data.total)
      if (p === 1) setProducts(data.items)
      else setProducts(prev => [...prev, ...data.items])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchProducts(1)
  }, [fetchProducts])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchProducts(next)
  }

  // Filtrado local por búsqueda y estado
  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.empresa_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = !filterEstado || p.estado === filterEstado
    return matchSearch && matchEstado
  })

  const hasMore = products.length < total

  return (
    <div className="catalog-page">
      {/* Hero */}
      <div className="catalog-hero">
        <div className="container">
          <motion.h1
            className="catalog-hero__title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Catálogo de Zapatos
          </motion.h1>
          <motion.p
            className="catalog-hero__sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Los mejores fabricantes de Cúcuta, al alcance de tu mano
          </motion.p>
        </div>
      </div>

      <div className="container catalog-layout">
        {/* Barra de búsqueda y filtros */}
        <div className="catalog-filters">
          <div className="catalog-search-wrap">
            <span className="catalog-search-icon">🔍</span>
            <input
              className="catalog-search"
              type="text"
              placeholder="Buscar por nombre, empresa, descripción…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="catalog-search-clear" onClick={() => setSearch('')} aria-label="Limpiar">✕</button>
            )}
          </div>

          <div className="catalog-filter-tabs">
            {[
              { key: '', label: 'Todos' },
              { key: 'activo', label: '✅ Disponibles' },
              { key: 'agotado', label: '❌ Agotados' },
              { key: 'inactivo', label: '🔜 Próximamente' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`catalog-tab ${filterEstado === tab.key ? 'catalog-tab--active' : ''}`}
                onClick={() => setFilterEstado(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contador */}
        {!loading && !error && (
          <p className="catalog-count">
            {filtered.length === 0 && search ? 'Sin resultados' : `${total} producto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            {search && ` para "${search}"`}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="catalog-empty">
            <span className="catalog-empty__icon">⚠️</span>
            <h3>No se pudo cargar el catálogo</h3>
            <p>{error}</p>
            <button className="catalog-retry" onClick={() => fetchProducts(1)}>Reintentar</button>
          </div>
        )}

        {/* Sin resultados con filtros */}
        <AnimatePresence>
          {!loading && !error && filtered.length === 0 && (
            <motion.div
              className="catalog-empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="catalog-empty__icon">👟</span>
              <h3>Sin resultados</h3>
              <p>No encontramos productos que coincidan con tu búsqueda.</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {search && (
                  <button className="catalog-retry" onClick={() => setSearch('')}>Limpiar búsqueda</button>
                )}
                {filterEstado && (
                  <button className="catalog-retry" onClick={() => setFilterEstado('')}>Ver todos</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {!error && filtered.length > 0 && (
          <div className="catalog-grid">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && page === 1 && (
          <div className="catalog-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="prod-card prod-card--skeleton">
                <div className="prod-card__img-wrap skeleton" />
                <div className="prod-card__body">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line--lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && filtered.length > 0 && (
          <div className="catalog-more">
            <motion.button
              className="catalog-more-btn"
              onClick={loadMore}
              whileTap={{ scale: 0.96 }}
            >
              Cargar más productos
            </motion.button>
          </div>
        )}

        {/* Loading more */}
        {loading && page > 1 && (
          <div className="catalog-more">
            <span className="catalog-loading-dot" />
            <span className="catalog-loading-dot" />
            <span className="catalog-loading-dot" />
          </div>
        )}
      </div>
    </div>
  )
}
