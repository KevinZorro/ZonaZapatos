import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'

export default function GestionDevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    cargarDevolucionesPendientes()
  }, [])

  const cargarDevolucionesPendientes = async () => {
    try {
      setLoading(true)
      const response = await api.get('/devoluciones/pendientes')
      setDevoluciones(response.data)
    } catch (err) {
      console.error('Error cargando devoluciones:', err)
      setError('No se pudieron cargar las solicitudes de devolución')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMotivoColor = (motivo) => {
    const colores = {
      'Producto dañado': 'bg-red-100 text-red-800',
      'Producto defectuoso': 'bg-orange-100 text-orange-800',
      'Talla/Color incorrecto': 'bg-blue-100 text-blue-800',
      'No era lo esperado': 'bg-yellow-100 text-yellow-800',
      'Calidad inferior a la esperada': 'bg-purple-100 text-purple-800',
      'Otro': 'bg-gray-100 text-gray-800'
    }
    return colores[motivo] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Bandeja de Devoluciones
        </h1>
        <p className="text-gray-600 mb-6">
          Gestiona las solicitudes de devolución de los clientes
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {devoluciones.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <span className="text-5xl mb-4 block">📭</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay solicitudes pendientes
            </h3>
            <p className="text-gray-600">
              La bandeja de devoluciones está vacía. Las nuevas solicitudes aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devoluciones.map((devolucion) => (
              <motion.div
                key={devolucion.id}
                whileHover={{ scale: 1.01 }}
                className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/empresa/devoluciones/${devolucion.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMotivoColor(devolucion.motivo)}`}>
                        {devolucion.motivo}
                      </span>
                      <span className="text-sm text-gray-500">
                        Pedido #{devolucion.pedido_id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Cliente</p>
                        <p className="font-medium text-gray-900">{devolucion.cliente_nombre}</p>
                        <p className="text-sm text-gray-600">{devolucion.cliente_correo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Fecha de solicitud</p>
                        <p className="font-medium text-gray-900">{formatDate(devolucion.fecha_solicitud)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Productos</p>
                        <p className="font-medium text-gray-900">{devolucion.total_productos} items</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {devolucion.estado}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
