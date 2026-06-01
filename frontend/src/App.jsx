import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import SplashPage from './pages/SplashPage'
import CatalogPage from './pages/CatalogPage'
import ProductPage from './pages/ProductPage'
import PedidosPage from './pages/client/PedidosPage'
import PedidoDetallePage from './pages/client/PedidoDetallePage'
import CarritoPage from './pages/client/CarritoPage'
import ProfilePage from './pages/ProfilePage'
import Login from './pages/auth/Login'
import RegisterCliente from './pages/auth/RegisterCliente'
import RegisterEmpresa from './pages/auth/RegisterEmpresa'
import ConfirmPage from './pages/auth/ConfirmPage'
import EmpresaProductosPage from './pages/empresa/EmpresaProductosPage'
import DashboardVentasPage from './pages/empresa/DashboardVentasPage'
import SolicitudDevolucionPage from './pages/client/SolicitudDevolucionPage'
import MisDevolucionesPage from './pages/client/MisDevolucionesPage'
import EncuestaPage from './pages/client/EncuestaPage'
import GestionDevolucionesPage from './pages/empresa/GestionDevolucionesPage'
import DetalleDevolucionPage from './pages/empresa/DetalleDevolucionPage'
import GestionPedidosPage from './pages/empresa/GestionPedidosPage'
import EncuestaReminderModal from './components/EncuestaReminderModal'
import { useAuth } from './context/AuthContext'
import Analisis from './pages/Analisis' // 🔥 NUEVO
import PrediccionVentas from './pages/empresa/EmpresaPrediccionPage'
import './App.css'

// Componente wrapper para el modal de recordatorio de encuesta
function EncuestaReminderWrapper() {
  const { encuestaPendiente, clearEncuestaPendiente } = useAuth()
  return encuestaPendiente ? (
    <EncuestaReminderModal
      encuesta={encuestaPendiente}
      onClose={clearEncuestaPendiente}
    />
  ) : null
}

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

            {/* Perfil */}
            <Route path="/perfil" element={
              <ProtectedRoute roles={['cliente', 'empresa', 'admin']}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* Cliente */}
            <Route path="/pedidos" element={
              <ProtectedRoute roles={['cliente']}>
                <PedidosPage />
              </ProtectedRoute>
            } />

            <Route path="/pedidos/:id" element={
              <ProtectedRoute roles={['cliente']}>
                <PedidoDetallePage />
              </ProtectedRoute>
            } />

            <Route path="/devoluciones/solicitar/:pedidoId" element={
              <ProtectedRoute roles={['cliente']}>
                <SolicitudDevolucionPage />
              </ProtectedRoute>
            } />

            <Route path="/mis-devoluciones" element={
              <ProtectedRoute roles={['cliente']}>
                <MisDevolucionesPage />
              </ProtectedRoute>
            } />

            <Route path="/encuestas/:encuestaId" element={
              <ProtectedRoute roles={['cliente']}>
                <EncuestaPage />
              </ProtectedRoute>
            } />

            <Route path="/carrito" element={
              <ProtectedRoute roles={['cliente']}>
                <CarritoPage />
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
                <DashboardVentasPage />
              </ProtectedRoute>
            } />

            {/* 🔥 AQUÍ ESTÁ TU CAMBIO IMPORTANTE */}
            <Route path="/empresa/analisis" element={
              <ProtectedRoute roles={['empresa']}>
                <Analisis />  {/* 👈 reemplaza el Placeholder */}
              </ProtectedRoute>
            } />
            <Route path="/empresa/pedidos" element={
              <ProtectedRoute roles={['empresa']}>
                <GestionPedidosPage />
              </ProtectedRoute>
            } />
            <Route path="/empresa/devoluciones" element={
              <ProtectedRoute roles={['empresa']}>
                <GestionDevolucionesPage />
              </ProtectedRoute>
            } />
            <Route path="/empresa/devoluciones/:id" element={
              <ProtectedRoute roles={['empresa']}>
                <DetalleDevolucionPage />
              </ProtectedRoute>
            } />

            <Route path="/empresa/prediccion" element={
              <ProtectedRoute roles={['empresa']}>
                <PrediccionVentas />
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
      <EncuestaReminderWrapper />
    </>
  )
}

export default function App() {
  return <AppRoutes />
}