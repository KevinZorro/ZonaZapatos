import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cierra el menú si cambia la ruta
  useEffect(() => { setMenuOpen(false) }, [navigate])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')  // RF4: redirige al home público
  }

  const navLinks = (
    <>
      <NavLink to="/catalogo" className={({ isActive }) => `nb-link ${isActive ? 'nb-link--active' : ''}`}>
        Catálogo
      </NavLink>

      {isAuthenticated && user?.rol === 'empresa' && (
        <>
          <NavLink to="/empresa/productos" className={({ isActive }) => `nb-link ${isActive ? 'nb-link--active' : ''}`}>
            Mis Productos
          </NavLink>
          <NavLink to="/empresa/dashboard" className={({ isActive }) => `nb-link ${isActive ? 'nb-link--active' : ''}`}>
            Dashboard
          </NavLink>
        </>
      )}

      {isAuthenticated && user?.rol === 'cliente' && (
        <NavLink to="/pedidos" className={({ isActive }) => `nb-link ${isActive ? 'nb-link--active' : ''}`}>
          Mis Pedidos
        </NavLink>
      )}
    </>
  )

  const authButtons = isAuthenticated ? (
    <>
      <NavLink to="/perfil" className={({ isActive }) => `nb-avatar ${isActive ? 'nb-avatar--active' : ''}`} title="Mi perfil">
        {user?.correo?.[0]?.toUpperCase() || '?'}
      </NavLink>
      <button onClick={handleLogout} className="nb-btn nb-btn--danger">
        Cerrar sesión
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="nb-link">Iniciar sesión</Link>
      <Link to="/registro/cliente" className="nb-btn nb-btn--primary">Registrarse</Link>
    </>
  )

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} role="navigation">
        <div className="navbar__inner container">
          {/* Brand */}
          <Link to="/" className="navbar__brand">
            <span className="navbar__brand-icon">👟</span>
            <span className="navbar__brand-name">Zona Zapatos</span>
          </Link>

          {/* Desktop links */}
          <div className="navbar__links navbar__links--desktop">
            {navLinks}
          </div>

          {/* Desktop auth */}
          <div className="navbar__auth navbar__auth--desktop">
            {authButtons}
          </div>

          {/* Hamburger */}
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

      {/* Mobile drawer */}
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
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="nb-drawer__header">
                <span className="nb-drawer__brand">
                  <span>👟</span> Zona Zapatos
                </span>
                <button className="nb-drawer__close" onClick={() => setMenuOpen(false)} aria-label="Cerrar">✕</button>
              </div>

              {isAuthenticated && user && (
                <div className="nb-drawer__user">
                  <div className="nb-drawer__avatar">
                    {user.correo?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="nb-drawer__user-email">{user.correo}</p>
                    <p className="nb-drawer__user-role">{user.rol === 'empresa' ? 'Empresa' : 'Cliente'}</p>
                  </div>
                </div>
              )}

              <nav className="nb-drawer__links">
                {navLinks}
              </nav>

              {isAuthenticated && (
                <NavLink to="/perfil" className="nb-drawer__profile-link" onClick={() => setMenuOpen(false)}>
                  <div className="nb-drawer__avatar">
                    {user?.correo?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span>Mi perfil</span>
                </NavLink>
              )}

              <div className="nb-drawer__auth">
                {isAuthenticated
                  ? <button onClick={handleLogout} className="nb-btn nb-btn--danger">Cerrar sesión</button>
                  : authButtons
                }
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
