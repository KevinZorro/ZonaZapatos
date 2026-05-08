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
  const [modalExito, setModalExito] = useState(null)
  const [respuestaEmpresa, setRespuestaEmpresa] = useState('')

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
      await api.post(`/devoluciones/${id}/estado`, { 
        estado: nuevoEstado,
        respuesta_empresa: respuestaEmpresa || undefined
      })
      
      // Mostrar modal de éxito en lugar de mensaje temporal
      setModalExito({
        tipo: nuevoEstado === 'aprobada' ? 'success' : 'error',
        titulo: nuevoEstado === 'aprobada' ? '¡Devolución Aprobada!' : 'Devolución Rechazada',
        mensaje: nuevoEstado === 'aprobada'
          ? 'La solicitud de devolución ha sido aprobada exitosamente. El pedido ha sido marcado como "en devolución" y el cliente ha sido notificado.'
          : 'La solicitud de devolución ha sido rechazada. El cliente será notificado de la decisión.',
        icono: nuevoEstado === 'aprobada' ? '✅' : '❌'
      })
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
      'solicitada': 'bg-yellow-400 text-yellow-900 border-2 border-yellow-600',
      'en_revision': 'bg-blue-400 text-blue-900 border-2 border-blue-600',
      'aprobada': 'bg-green-400 text-green-900 border-2 border-green-600',
      'rechazada': 'bg-red-400 text-red-900 border-2 border-red-600'
    }
    return colores[estado] || 'bg-gray-400 text-gray-900 border-2 border-gray-600'
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
    <div className="max-w-4xl mx-auto px-4 py-8 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
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
          <span 
            className={`px-4 py-2 rounded-full text-sm font-bold shadow self-start sm:self-center relative ${getEstadoColor(devolucion.estado)}`}
            style={{ textTransform: 'uppercase', letterSpacing: '0.5px', zIndex: 100 }}
          >
            {devolucion.estado}
          </span>
        </div>

        {/* Modal de éxito/error centrado */}
        {modalExito && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
              style={{ 
                border: `4px solid ${modalExito.tipo === 'success' ? '#22c55e' : '#dc2626'}`
              }}
            >
              {/* Icono grande animado */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-6xl mb-4"
              >
                {modalExito.icono}
              </motion.div>
              
              {/* Título */}
              <h2 
                className="text-2xl font-bold mb-3"
                style={{ color: modalExito.tipo === 'success' ? '#15803d' : '#b91c1c' }}
              >
                {modalExito.titulo}
              </h2>
              
              {/* Mensaje descriptivo */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                {modalExito.mensaje}
              </p>
              
              {/* Botón de acción - estilos inline explícitos para visibilidad */}
              <button
                onClick={() => navigate('/empresa/devoluciones')}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  backgroundColor: modalExito.tipo === 'success' ? '#16a34a' : '#dc2626'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = modalExito.tipo === 'success' ? '#15803d' : '#b91c1c'
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = modalExito.tipo === 'success' ? '#16a34a' : '#dc2626'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                Entendido →
              </button>
            </motion.div>
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
            {(devolucion.pedido?.productos || []).map((producto, index) => (
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
                  {producto.motivo && (
                    <p className="text-sm text-amber-600 mt-1 font-medium">
                      Motivo: {producto.motivo}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-gray-600">Cantidad: <strong>{producto.cantidad}</strong></span>
                    <span className="text-gray-600">Precio: <strong>${producto.precio_unitario?.toLocaleString('es-CO')}</strong></span>
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
              {devolucion.evidencias.map((evidencia, index) => {
                console.log(`DEBUG: Evidencia ${index + 1} URL:`, evidencia.cloudinary_url)
                return (
                  <a
                    key={evidencia.id}
                    href={evidencia.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                    title="Haz clic para ver en tamaño completo"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all bg-gray-100">
                      <img
                        src={evidencia.cloudinary_url}
                        alt={`Evidencia ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Acciones (solo si está solicitada) */}
        {devolucion.estado === 'solicitada' && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
            
            {/* Campo para respuesta de la empresa */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje para el cliente (opcional)
              </label>
              <textarea
                value={respuestaEmpresa}
                onChange={(e) => setRespuestaEmpresa(e.target.value)}
                placeholder="Ej: Razón del rechazo, instrucciones para el retorno, etc."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este mensaje será visible para el cliente junto con la decisión de la devolución.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => actualizarEstado('aprobada')}
                disabled={procesando}
                style={{ 
                  backgroundColor: '#16a34a', 
                  color: 'white',
                  border: '2px solid #15803d'
                }}
                className="flex-1 py-3 px-6 rounded-lg font-semibold shadow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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
                style={{ 
                  backgroundColor: '#dc2626', 
                  color: 'white',
                  border: '2px solid #b91c1c'
                }}
                className="flex-1 py-3 px-6 rounded-lg font-semibold shadow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Mostrar respuesta de la empresa si existe y ya está procesada */}
        {(devolucion.estado === 'aprobada' || devolucion.estado === 'rechazada') && devolucion.respuesta_empresa && (
          <div className="bg-purple-50 rounded-xl shadow-sm border border-purple-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <span>💬</span> Mensaje de la empresa
            </h2>
            <p className="text-purple-800 italic">
              "{devolucion.respuesta_empresa}"
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
