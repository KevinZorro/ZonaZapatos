// RF5 — Catálogo general público
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../assets/icons'
import { Button, Chip, EmptyState, SectionHeading } from '../components/ui'
import './CatalogPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ESTADOS = {
  activo:   { label: 'Disponible',      tone: 'success' },
  agotado:  { label: 'Agotado',         tone: 'danger' },
  inactivo: { label: 'Pronto disponible', tone: 'olive' },
}

function getEstado(e) {
  return ESTADOS[e] || { label: e, tone: 'neutral' }
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)
}

// Hook: debounce de un valor (espera N ms sin cambios antes de exponerlo)
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function StarRatingMini({ rating, total = 0 }) {
  if (!rating || rating === 0) {
    return (
      <div className="prod-card__stars prod-card__stars--empty">
        <Icon name="star" size={14} />
        <span>Sin reseñas</span>
      </div>
    )
  }
  return (
    <div className="prod-card__stars">
      <Icon name="star-filled" size={14} />
      <span className="prod-card__rating">{rating.toFixed(1)}</span>
      <span className="prod-card__count">({total})</span>
    </div>
  )
}

function ProductCard({ product, index }) {
  const estado = getEstado(product.estado)
  const imagen = product.media?.find(m => m.tipo === 'imagen')?.cloudinary_url
  const promedio = Number(product.promedio_resenas) || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <Link to={`/productos/${product.id}`} className="prod-card">
        <div className="prod-card__img-wrap">
          {imagen
            ? <img src={imagen} alt={product.nombre} className="prod-card__img" loading="lazy" />
            : <div className="prod-card__img-placeholder">
                <Icon name="shoe" size={48} />
              </div>
          }

          <Chip
            tone={estado.tone}
            size="sm"
            active
            className="prod-card__badge"
          >
            {estado.label}
          </Chip>

          {product.stock <= 5 && product.stock > 0 && (
            <span className="prod-card__stock-badge">
              Últimas {product.stock}
            </span>
          )}

          <div className="prod-card__overlay">
            <span className="prod-card__view">
              Ver detalle
              <Icon name="arrow-right" size={14} />
            </span>
          </div>
        </div>

        <div className="prod-card__body">
          <p className="prod-card__empresa eyebrow">{product.empresa_nombre || `Empresa #${product.empresa_id}`}</p>
          <h3 className="prod-card__name serif">{product.nombre}</h3>

          <div className="prod-card__meta">
            {product.talla && <span className="prod-card__chip">T: {product.talla}</span>}
            {product.color && (
              <span className="prod-card__chip prod-card__chip--color">
                <span className="prod-card__color-dot" style={{ background: product.color }} />
                {product.color}
              </span>
            )}
          </div>

          <div className="prod-card__footer">
            <span className="prod-card__price serif">{formatPrice(product.precio)}</span>
            <StarRatingMini rating={promedio} total={product.total_resenas || 0} />
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
  const [filterEmpresa, setFilterEmpresa] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [empresas, setEmpresas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const PAGE_SIZE = 20

  // Debounce de precios: evita un fetch por tecla
  const debouncedPrecioMin = useDebouncedValue(precioMin, 500)
  const debouncedPrecioMax = useDebouncedValue(precioMax, 500)

  // Aborta requests en vuelo cuando llegan nuevos filtros (evita race conditions)
  const abortRef = useRef(null)

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const params = new URLSearchParams({ page: p, page_size: PAGE_SIZE })
      if (filterEstado) params.append('estado', filterEstado)
      if (filterEmpresa) params.append('empresa_id', filterEmpresa)
      if (filterCategoria) params.append('categoria_id', filterCategoria)
      if (debouncedPrecioMin) params.append('precio_min', debouncedPrecioMin)
      if (debouncedPrecioMax) params.append('precio_max', debouncedPrecioMax)
      if (filterTalla) params.append('talla', filterTalla)
      const res = await fetch(`${API}/productos?${params.toString()}`, { signal: ctrl.signal })
      if (!res.ok) throw new Error('No se pudo cargar el catálogo')
      const data = await res.json()
      setTotal(data.total)
      if (p === 1) setProducts(data.items)
      else setProducts(prev => [...prev, ...data.items])
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (abortRef.current === ctrl) setLoading(false)
    }
  }, [filterEstado, filterEmpresa, filterCategoria, debouncedPrecioMin, debouncedPrecioMax, filterTalla])

  useEffect(() => {
    setPage(1)
    fetchProducts(1)
  }, [fetchProducts])

  useEffect(() => {
    // Endpoint ligero: solo id + nombre, una query SQL (antes 100 productos con N+1 = ~300 queries)
    fetch(`${API}/empresas-publicas`)
      .then(r => r.json())
      .then(setEmpresas)
      .catch(() => {})

    fetch(`${API}/categorias`)
      .then(r => r.json())
      .then(setCategorias)
      .catch(() => {})
  }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchProducts(next)
  }

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.empresa_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = !filterEstado || p.estado === filterEstado
    return matchSearch && matchEstado
  })

  const limpiarFiltros = () => {
    setSearch('')
    setFilterEstado('')
    setFilterEmpresa('')
    setFilterCategoria('')
    setPrecioMin('')
    setPrecioMax('')
    setFilterTalla('')
  }

  const activeFiltersCount = [filterEstado, filterEmpresa, filterCategoria, filterTalla, precioMin, precioMax]
    .filter(Boolean).length

  const hasMore = products.length < total

  return (
    <div className="catalog-page has-grain">
      {/* Hero editorial */}
      <section className="catalog-hero">
        <div className="container catalog-hero__inner">
          <motion.div
            className="catalog-hero__text"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
            }}
          >
            <motion.span
              className="catalog-hero__eyebrow eyebrow"
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              Cúcuta · Desde 2006
            </motion.span>

            <h1 className="catalog-hero__title serif display-2">
              <motion.span
                style={{ display: 'block' }}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              >
                Calzado hecho
              </motion.span>
              <motion.em
                style={{ display: 'block' }}
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              >
                con alma cucuteña
              </motion.em>
            </h1>

            <motion.p
              className="catalog-hero__sub"
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6 }}
            >
              Una selección curada de los mejores fabricantes de la ciudad.
              Cuero, costura y carácter. Directo a tu puerta.
            </motion.p>
          </motion.div>

          <motion.div
            className="catalog-hero__deco"
            aria-hidden
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          >
            <motion.div
              className="catalog-hero__shoe"
              animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon name="shoe" size={140} />
            </motion.div>

            <motion.span
              className="catalog-hero__deco-ring catalog-hero__deco-ring--1"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              className="catalog-hero__deco-ring catalog-hero__deco-ring--2"
              animate={{ rotate: -360 }}
              transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              className="catalog-hero__deco-pulse"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.div>
        </div>
      </section>

      <div className="container catalog-layout">
        {/* Search + filter toggle */}
        <div className="catalog-toolbar">
          <div className="catalog-search-wrap">
            <span className="catalog-search-icon"><Icon name="search" size={18} /></span>
            <input
              className="catalog-search"
              type="text"
              placeholder="Buscar zapatos, empresas, colores…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="catalog-search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          <button
            className={`catalog-filter-toggle ${filtersOpen ? 'is-open' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
          >
            <Icon name="filter" size={18} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="catalog-filter-toggle__count">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        {/* Estado chips siempre visibles */}
        <div className="catalog-quick-filters">
          <Chip tone="magenta" active={!filterEstado} onClick={() => setFilterEstado('')} size="sm">
            Todos
          </Chip>
          <Chip tone="success" active={filterEstado === 'activo'} onClick={() => setFilterEstado('activo')} size="sm">
            Disponibles
          </Chip>
          <Chip tone="danger" active={filterEstado === 'agotado'} onClick={() => setFilterEstado('agotado')} size="sm">
            Agotados
          </Chip>
          <Chip tone="olive" active={filterEstado === 'inactivo'} onClick={() => setFilterEstado('inactivo')} size="sm">
            Próximamente
          </Chip>
        </div>

        {/* Filtros avanzados expandibles */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              className="catalog-filters-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="catalog-filters-grid">
                <label className="catalog-field">
                  <span className="catalog-field__label">Empresa</span>
                  <select
                    className="catalog-field__select"
                    value={filterEmpresa}
                    onChange={e => { setFilterEmpresa(e.target.value); setPage(1) }}
                  >
                    <option value="">Todas las empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </label>

                <label className="catalog-field">
                  <span className="catalog-field__label">Categoría</span>
                  <select
                    className="catalog-field__select"
                    value={filterCategoria}
                    onChange={e => { setFilterCategoria(e.target.value); setPage(1) }}
                  >
                    <option value="">Todas</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </label>

                <label className="catalog-field">
                  <span className="catalog-field__label">Talla</span>
                  <select
                    className="catalog-field__select"
                    value={filterTalla}
                    onChange={e => { setFilterTalla(e.target.value); setPage(1) }}
                  >
                    <option value="">Cualquier talla</option>
                    {['35','36','37','38','39','40','41','42','43'].map(t => (
                      <option key={t} value={t}>Talla {t}</option>
                    ))}
                  </select>
                </label>

                <div className="catalog-field">
                  <span className="catalog-field__label">Rango de precio</span>
                  <div className="catalog-price-range">
                    <input
                      className="catalog-field__input"
                      type="number"
                      placeholder="Mín"
                      value={precioMin}
                      onChange={e => setPrecioMin(e.target.value)}
                    />
                    <span className="catalog-price-range__sep" aria-hidden>—</span>
                    <input
                      className="catalog-field__input"
                      type="number"
                      placeholder="Máx"
                      value={precioMax}
                      onChange={e => setPrecioMax(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="catalog-filters-actions">
                  <Button variant="ghost" size="sm" onClick={limpiarFiltros} iconLeft={<Icon name="close" size={14} />}>
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Counter */}
        {!loading && !error && (
          <p className="catalog-count">
            {filtered.length === 0 && search
              ? 'Sin resultados'
              : <><strong>{total}</strong> {total !== 1 ? 'productos' : 'producto'}</>}
            {search && <span> para "<em>{search}</em>"</span>}
          </p>
        )}

        {/* Error */}
        {error && (
          <EmptyState
            illustration="error"
            tone="dark"
            title="No pudimos cargar el catálogo"
            description={error}
            actions={
              <Button variant="primary" onClick={() => fetchProducts(1)}>
                Reintentar
              </Button>
            }
          />
        )}

        {/* Empty con filtros */}
        <AnimatePresence>
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              illustration="empty-search"
              title="No encontramos lo que buscas"
              description="Probá con otros términos o limpiá los filtros para ver el catálogo completo."
              actions={
                <>
                  {search && <Button variant="outline" onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
                  {activeFiltersCount > 0 && <Button variant="primary" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                </>
              }
            />
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

        {/* Skeleton */}
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
            <Button variant="outline" size="lg" onClick={loadMore} iconRight={<Icon name="arrow-right" size={16} />}>
              Cargar más productos
            </Button>
          </div>
        )}

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
