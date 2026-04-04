import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import SplashPage from './pages/SplashPage'
import CatalogPage from './pages/CatalogPage'
import ProductPage from './pages/ProductPage'
import ProfilePage from './pages/ProfilePage'
import Login from './pages/auth/Login'
import RegisterCliente from './pages/auth/RegisterCliente'
import RegisterEmpresa from './pages/auth/RegisterEmpresa'
import ConfirmPage from './pages/auth/ConfirmPage'
import EmpresaProductosPage from './pages/empresa/EmpresaProductosPage'

import './App.css'

// Placeholder para rutas futuras
const Placeholder = ({ title }) => (
  <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
    <span style={{ fontSize: '4rem' }}>🚧</span>
    <h1 style={{ fontSize: '1.5rem', color: '#1A1A1A', fontWeight: 800 }}>{title}</h1>
    <p style={{ color: '#6B7280' }}>Funcionalidad próximamente disponible</p>
  </div>
)

// Scroll al tope en cada cambio de ruta
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppRoutes() {
  const location = useLocation()
  const isSplash = location.pathname === '/'

  return (
    <>
      <ScrollToTop />
      {!isSplash && <Navbar />}
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Splash / Onboarding */}
            <Route path="/" element={<SplashPage />} />

            {/* Catálogo público */}
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/productos/:id" element={<ProductPage />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro/cliente" element={<RegisterCliente />} />
            <Route path="/registro/empresa" element={<RegisterEmpresa />} />
            <Route path="/auth/confirmar/:token" element={<ConfirmPage />} />

            {/* Perfil — todos los roles autenticados */}
            <Route path="/perfil" element={
              <ProtectedRoute roles={['cliente', 'empresa', 'admin']}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* Cliente */}
            <Route path="/pedidos" element={
              <ProtectedRoute roles={['cliente']}>
                <Placeholder title="Mis Pedidos" />
              </ProtectedRoute>
            } />

            {/* Empresa */}
            <Route path="/empresa" element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Panel de Empresa" />
              </ProtectedRoute>
            } />
            <Route path="/empresa/productos" element={
              <ProtectedRoute roles={['empresa']}>
                <EmpresaProductosPage />
              </ProtectedRoute>
            } />
            <Route path="/empresa/dashboard" element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Dashboard de Ventas" />
              </ProtectedRoute>
            } />
            <Route path="/empresa/analisis" element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Análisis y Predicción" />
              </ProtectedRoute>
            } />

            {/* Errores */}
            <Route path="/no-autorizado" element={
              <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '4rem' }}>🔒</span>
                <h1 style={{ marginTop: '1rem', color: '#DC2626' }}>Acceso Denegado</h1>
                <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>No tienes permiso para ver esta página.</p>
              </div>
            } />
            <Route path="*" element={
              <div style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '4rem' }}>🔍</span>
                <h1 style={{ marginTop: '1rem', color: '#1A1A1A' }}>Página no encontrada</h1>
              </div>
            } />
          </Routes>
        </AnimatePresence>
      </main>
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
