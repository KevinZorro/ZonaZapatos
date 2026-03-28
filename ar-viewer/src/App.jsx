import { Routes, Route } from 'react-router-dom'

// Layout & Context
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import CatalogPage from './pages/CatalogPage'
import ProductPage from './pages/ProductPage'

// Auth Pages
import Login from './pages/auth/Login'
import RegisterCliente from './pages/auth/RegisterCliente'
import RegisterEmpresa from './pages/auth/RegisterEmpresa'

// Placeholder components
const Placeholder = ({ title }) => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1 style={{ fontSize: '2rem', color: '#1a1a2e', marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: '#6b7280' }}>Funcionalidad pendiente (Fases 2-7)</p>
  </div>
)

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<CatalogPage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/registro/cliente" element={<RegisterCliente />} />
          <Route path="/registro/empresa" element={<RegisterEmpresa />} />

          {/* Protected Routes — Cliente */}
          <Route
            path="/pedidos"
            element={
              <ProtectedRoute roles={['cliente']}>
                <Placeholder title="Mis Pedidos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ra"
            element={
              <ProtectedRoute roles={['cliente']}>
                <Placeholder title="Experiencia RA M\u00f3vil" />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes — Empresa */}
          <Route
            path="/empresa"
            element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Panel de Empresa" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/empresa/productos"
            element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Mis Productos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/empresa/dashboard"
            element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="Dashboard de Ventas" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/empresa/analisis"
            element={
              <ProtectedRoute roles={['empresa']}>
                <Placeholder title="An\u00e1lisis y Predicci\u00f3n" />
              </ProtectedRoute>
            }
          />

          {/* Acceso Denegado */}
          <Route
            path="/no-autorizado"
            element={
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h1 style={{ color: '#e84e4e' }}>Acceso Denegado</h1>
                <p>No tienes permiso para ver esta p\u00e1gina.</p>
              </div>
            }
          />

          {/* Catch All */}
          <Route
            path="*"
            element={
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h2>P\u00e1gina no encontrada</h2>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default App
