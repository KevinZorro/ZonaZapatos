import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useCarrito } from '../context/CarritoContext'
import useTheme from '../context/useTheme'
import Icon from '../assets/icons'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const { totalItems } = useCarrito()
  const { isDark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Alertas (campana empresa)
  const [alertas, setAlertas] = useState([])
  const [openAlertas, setOpenAlertas] = useState(false)

  useEffect(() => {
    const read = () => {
      try {
        setAlertas(JSON.parse(localStorage.getItem('alertas')) || [])
      } catch {
        setAlertas([])
      }
    }
    read()
    // Cross-tab: nativo del navegador, dispara solo cuando cambia
    window.addEventListener('storage', read)
    window.addEventListener('alertasActualizadas', read)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener('alertasActualizadas', read)
    }
  }, [])

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cerrar drawer al cambiar ruta
  useEffect(() => { setMenuOpen(false); setOpenAlertas(false) }, [location.pathname])

  const toggleAlertas = () => {
    const nuevo = !openAlertas
    setOpenAlertas(nuevo)
    if (!nuevo) {
      localStorage.removeItem('alertas')
      setAlertas([])
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  const navLinks = (
    <>
      <NavLink to="/catalogo" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
        <span>Catálogo</span>
      </NavLink>

      {isAuthenticated && user?.rol === 'empresa' && (
        <>
          <NavLink to="/empresa/productos" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Productos</span>
          </NavLink>
          <NavLink to="/empresa/devoluciones" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Devoluciones</span>
          </NavLink>
          <NavLink to="/empresa/dashboard" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/empresa/analisis" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Análisis</span>
          </NavLink>
          <NavLink to="/empresa/prediccion" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Predicción</span>
          </NavLink>
        </>
      )}

      {isAuthenticated && user?.rol === 'cliente' && (
        <>
          <NavLink to="/pedidos" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Mis pedidos</span>
          </NavLink>
          <NavLink to="/mis-devoluciones" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
            <span>Devoluciones</span>
          </NavLink>
        </>
      )}
    </>
  )

  const cartButton = isAuthenticated && user?.rol === 'cliente' && (
    <NavLink
      to="/carrito"
      className={({ isActive }) => `nb-icon-btn ${isActive ? 'is-active' : ''}`}
      aria-label="Carrito"
    >
      <Icon name="cart" size={20} />
      {totalItems > 0 && <span className="nb-badge">{totalItems > 9 ? '9+' : totalItems}</span>}
    </NavLink>
  )

  const bellButton = isAuthenticated && user?.rol === 'empresa' && (
    <div className="nb-bell-wrap">
      <button onClick={toggleAlertas} className="nb-icon-btn" aria-label="Alertas">
        <Icon name="bell" size={20} />
        {alertas.length > 0 && <span className="nb-badge">{alertas.length}</span>}
      </button>
      <AnimatePresence>
        {openAlertas && (
          <motion.div
            className="nb-alerts"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <h4 className="nb-alerts__title">Alertas</h4>
            {alertas.length === 0 ? (
              <p className="nb-alerts__empty">No hay alertas</p>
            ) : (
              alertas.map((a, i) => (
                <div key={i} className="nb-alerts__item">
                  <strong>{a.producto}</strong>
                  <span>{a.motivo} ({a.porcentaje}%)</span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const themeButton = (
    <button
      onClick={toggleTheme}
      className="nb-icon-btn nb-theme-toggle"
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      <motion.span
        key={isDark ? 'moon' : 'sun'}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ display: 'inline-flex' }}
      >
        <Icon name={isDark ? 'sun' : 'moon'} size={20} />
      </motion.span>
    </button>
  )

  const authButtons = isAuthenticated ? (
    <>
      {cartButton}
      {bellButton}
      {themeButton}
      <NavLink to="/perfil" className={({ isActive }) => `nb-avatar ${isActive ? 'is-active' : ''}`} title="Mi perfil">
        {user?.correo?.[0]?.toUpperCase() || '?'}
      </NavLink>
      <button onClick={handleLogout} className="nb-btn nb-btn--ghost" aria-label="Cerrar sesión">
        <Icon name="logout" size={18} />
        <span className="nb-btn__label-desktop">Salir</span>
      </button>
    </>
  ) : (
    <>
      {themeButton}
      <Link to="/login" className="nb-link">Iniciar sesión</Link>
      <Link to="/registro/cliente" className="nb-btn nb-btn--primary">Registrarse</Link>
    </>
  )

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} role="navigation">
        <div className="navbar__inner container">
          <Link to="/" className="navbar__brand" aria-label="Inicio">
            <span className="navbar__brand-mark">
              <Icon name="shoe" size={26} />
            </span>
            <span className="navbar__brand-name serif">Zona Zapatos</span>
          </Link>

          <div className="navbar__links navbar__links--desktop">
            {navLinks}
          </div>

          <div className="navbar__auth navbar__auth--desktop">
            {authButtons}
          </div>

          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span className={`ham-line ${menuOpen ? 'ham-line--open-1' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'ham-line--open-2' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'ham-line--open-3' : ''}`} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="nb-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="nb-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="nb-drawer__header">
                <span className="nb-drawer__brand serif">
                  <Icon name="shoe" size={22} /> Zona Zapatos
                </span>
                <div className="nb-drawer__actions">
                  <button
                    onClick={toggleTheme}
                    className="nb-drawer__close"
                    aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
                    title={isDark ? 'Modo claro' : 'Modo oscuro'}
                  >
                    <Icon name={isDark ? 'sun' : 'moon'} size={18} />
                  </button>
                  <button className="nb-drawer__close" onClick={() => setMenuOpen(false)} aria-label="Cerrar">
                    <Icon name="close" size={18} />
                  </button>
                </div>
              </div>

              {isAuthenticated && (
                <Link to="/perfil" className="nb-drawer__user" onClick={() => setMenuOpen(false)}>
                  <div className="nb-drawer__avatar">{user?.correo?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <div className="nb-drawer__user-email">{user?.correo}</div>
                    <div className="nb-drawer__user-role">{user?.rol}</div>
                  </div>
                </Link>
              )}

              <nav className="nb-drawer__links">
                {navLinks}
                {isAuthenticated && user?.rol === 'cliente' && (
                  <NavLink to="/carrito" className={({ isActive }) => `nb-link ${isActive ? 'is-active' : ''}`}>
                    <span>Carrito {totalItems > 0 && `(${totalItems})`}</span>
                  </NavLink>
                )}
              </nav>

              <div className="nb-drawer__auth">
                {isAuthenticated
                  ? (
                    <button onClick={handleLogout} className="nb-btn nb-btn--ink nb-btn--block">
                      <Icon name="logout" size={18} /> Cerrar sesión
                    </button>
                  )
                  : (
                    <>
                      <Link to="/login" className="nb-btn nb-btn--outline nb-btn--block">Iniciar sesión</Link>
                      <Link to="/registro/cliente" className="nb-btn nb-btn--primary nb-btn--block">Registrarse</Link>
                    </>
                  )
                }
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
