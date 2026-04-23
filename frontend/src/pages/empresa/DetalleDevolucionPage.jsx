import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'

export default function DetalleDevolucionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [devolucion, setDevolucion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState(null)

  useEffect(() => {
    cargarDetalleDevolucion()
  }, [id])

  const cargarDetalleDevolucion = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/devoluciones/${id}/detalle`)
      setDevolucion(response.data)
    } catch (err) {
      console.error('Error cargando detalle:', err)
      setError('No se pudo cargar el detalle de la devolución')
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (nuevoEstado) => {
    try {
      setProcesando(true)
      await api.put(`/devoluciones/${id}/estado`, { estado: nuevoEstado })
      
      setMensajeExito(
        nuevoEstado === 'aprobada' 
          ? 'Devolución aprobada exitosamente. El pedido ha sido marcado como "en devolución".'
          : 'Devolución rechazada.'
      )
      
      // Actualizar la vista después de 2 segundos
      setTimeout(() => {
        navigate('/empresa/devoluciones')
      }, 2000)
    } catch (err) {
      console.error('Error actualizando estado:', err)
      setError('No se pudo actualizar el estado de la devolución')
    } finally {
      setProcesando(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstadoColor = (estado) => {
    const colores = {
      'solicitada': 'bg-yellow-100 text-yellow-800',
      'en_revision': 'bg-blue-100 text-blue-800',
      'aprobada': 'bg-green-100 text-green-800',
      'rechazada': 'bg-red-100 text-red-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  if (!devolucion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Devolución no encontrada'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/empresa/devoluciones')}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a la bandeja
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Solicitud de Devolución #{devolucion.id}
            </h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getEstadoColor(devolucion.estado)}`}>
            {devolucion.estado}
          </span>
        </div>

        {mensajeExito && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {mensajeExito}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Cliente */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>👤</span> Información del Cliente
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">{devolucion.cliente.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Correo electrónico</p>
                <p className="font-medium text-gray-900">{devolucion.cliente.correo}</p>
              </div>
              {devolucion.cliente.telefono && (
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium text-gray-900">{devolucion.cliente.telefono}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Pedido */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📦</span> Información del Pedido
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Número de pedido</p>
                <p className="font-medium text-gray-900">#{devolucion.pedido.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha del pedido</p>
                <p className="font-medium text-gray-900">{formatDate(devolucion.pedido.fecha_pedido)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium text-gray-900">${devolucion.pedido.total.toLocaleString('es-CO')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Motivo y Comentario */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📝</span> Motivo de la Devolución
          </h2>
          <div className="mb-4">
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium">
              {devolucion.motivo}
            </span>
          </div>
          {devolucion.comentario && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Comentario del cliente:</p>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg italic">
                "{devolucion.comentario}"
              </p>
            </div>
          )}
          <div className="mt-4 text-sm text-gray-500">
            Fecha de solicitud: {formatDate(devolucion.fecha_solicitud)}
          </div>
        </div>

        {/* Productos (Snapshot Inmutable - RF10) */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>👟</span> Productos Solicitados
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Snapshot inmutable (datos del momento de la compra)
            </span>
          </h2>
          <div className="space-y-4">
            {devolucion.pedido.productos.map((producto, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                {producto.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👟</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{producto.nombre}</h3>
                  <p className="text-sm text-gray-600">SKU: {producto.sku}</p>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-500 mt-1">{producto.descripcion}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">Cantidad: <strong>{producto.cantidad}</strong></span>
                    <span className="text-gray-600">Precio: <strong>${producto.precio_unitario.toLocaleString('es-CO')}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidencias Fotográficas desde Cloudinary */}
        {devolucion.evidencias && devolucion.evidencias.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📷</span> Evidencias Fotográficas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {devolucion.evidencias.map((evidencia) => (
                <a
                  key={evidencia.id}
                  href={evidencia.cloudinary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={evidencia.cloudinary_url}
                      alt="Evidencia de devolución"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                        Ver en tamaño completo
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Acciones (solo si está solicitada) */}
        {devolucion.estado === 'solicitada' && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => actualizarEstado('aprobada')}
                disabled={procesando}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Aprobar Devolución
                  </>
                )}
              </button>
              <button
                onClick={() => actualizarEstado('rechazada')}
                disabled={procesando}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rechazar Devolución
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              Al aprobar, el pedido cambiará automáticamente al estado "en devolución"
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
