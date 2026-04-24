import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'

export default function MisDevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarDevoluciones()
  }, [])

  const cargarDevoluciones = async () => {
    try {
      setLoading(true)
      const response = await api.get('/devoluciones/mis-devoluciones')
      setDevoluciones(response.data)
    } catch (err) {
      console.error('Error cargando devoluciones:', err)
      setError('No se pudieron cargar tus solicitudes de devolución')
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'solicitada': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'en_revision': 'bg-blue-100 text-blue-800 border-blue-300',
      'aprobada': 'bg-green-100 text-green-800 border-green-300',
      'rechazada': 'bg-red-100 text-red-800 border-red-300'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getEstadoLabel = (estado) => {
    const labels = {
      'solicitada': 'Solicitada',
      'en_revision': 'En revisión',
      'aprobada': 'Aprobada',
      'rechazada': 'Rechazada'
    }
    return labels[estado] || estado
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tus devoluciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={cargarDevoluciones}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-800 mb-8"
        >
          Mis Solicitudes de Devolución
        </motion.h1>

        {devoluciones.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-8 text-center"
          >
            <p className="text-gray-500 text-lg">
              No tienes solicitudes de devolución registradas.
            </p>
            <p className="text-gray-400 mt-2">
              Puedes solicitar una devolución desde el detalle de un pedido entregado.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {devoluciones.map((devolucion) => (
              <motion.div
                key={devolucion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                {/* Productos específicos solicitados para devolución */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Productos solicitados para devolución:</h4>
                  <div className="space-y-3">
                    {devolucion.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.producto_imagen_url ? (
                          <img
                            src={item.producto_imagen_url}
                            alt={item.producto_nombre}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">👟</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.producto_nombre || 'Producto'}</h5>
                          <p className="text-sm text-gray-500">SKU: {item.producto_sku || 'N/A'}</p>
                          <p className="text-sm text-gray-600">
                            Cantidad a devolver: <strong>{item.cantidad}</strong>
                          </p>
                          <p className="text-sm mt-1">
                            <span className="font-medium">Motivo:</span> <span className="text-red-600">{item.motivo}</span>
                          </p>
                          {item.comentario && (
                            <p className="text-xs text-gray-500 mt-1 italic">"{item.comentario}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-start mb-4 pt-4 border-t border-gray-100">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                      Devolución #{devolucion.id}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Pedido #{devolucion.pedido_id}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getEstadoColor(devolucion.estado)}`}
                  >
                    {getEstadoLabel(devolucion.estado)}
                  </span>
                </div>

                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {devolucion.comentario_general && (
                    <p className="text-gray-600 italic">
                      <span className="font-medium">Comentario general:</span> "{devolucion.comentario_general}"
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Solicitado el: {new Date(devolucion.fecha_solicitud).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Respuesta de la empresa */}
                {(devolucion.estado === 'aprobada' || devolucion.estado === 'rechazada') && devolucion.respuesta_empresa && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 mb-1">💬 Mensaje de la empresa:</p>
                    <p className="text-sm text-purple-800 italic">
                      "{devolucion.respuesta_empresa}"
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {devolucion.estado === 'aprobada' && (
                      <span className="text-green-600 font-medium">
                        ✓ Tu devolución fue aprobada. Pronto te contactaremos para coordinar la recolección.
                      </span>
                    )}
                    {devolucion.estado === 'rechazada' && (
                      <span className="text-red-600 font-medium">
                        ✗ Tu solicitud fue rechazada. Contacta soporte para más información.
                      </span>
                    )}
                    {devolucion.estado === 'en_revision' && (
                      <span className="text-blue-600 font-medium">
                        ⏳ Tu solicitud está siendo revisada por nuestro equipo.
                      </span>
                    )}
                    {devolucion.estado === 'solicitada' && (
                      <span className="text-yellow-600 font-medium">
                        ⏳ Tu solicitud está pendiente de revisión.
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
