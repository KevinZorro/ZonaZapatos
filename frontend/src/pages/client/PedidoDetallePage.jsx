import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import {
  responderEncuesta,
  getEncuestasRespondidasPorPedido,
  actualizarEncuesta,
  eliminarEncuesta
} from '../../services/encuestas'
import useTheme from '../../context/useTheme'

// Paleta para los formularios de reseña según tema
function useResenaColors() {
  const { isDark } = useTheme()
  return isDark
    ? {
        formBg: '#1F2937', formBorder: '#374151',
        label: '#E5E7EB', textareaBg: '#111827', textareaBorder: '#374151', textareaText: '#F3F4F6',
        starEmpty: '#4B5563', muted: '#6B7280',
        cancelBg: '#374151', cancelText: '#E5E7EB',
        disabledBg: '#374151', disabledText: '#9CA3AF',
      }
    : {
        formBg: '#fff', formBorder: '#e5e7eb',
        label: '#1f2937', textareaBg: '#f9fafb', textareaBorder: '#e5e7eb', textareaText: '#111827',
        starEmpty: '#d1d5db', muted: '#9ca3af',
        cancelBg: '#f3f4f6', cancelText: '#374151',
        disabledBg: '#f3f4f6', disabledText: '#9ca3af',
      }
}

const ESTADOS_PEDIDO = {
  pendiente:  { label: 'Pendiente',  classes: 'bg-gray-100 text-gray-500',   descripcion: 'Tu pedido fue recibido y está esperando confirmación por parte de la empresa.' },
  confirmado: { label: 'Confirmado', classes: 'bg-blue-50 text-blue-700',    descripcion: 'La empresa ya verificó y preparó tus productos. Pronto será enviado.' },
  enviado:    { label: 'Enviado',    classes: 'bg-amber-50 text-amber-700',  descripcion: 'Tu pedido está en camino. Pronto llegará a tu dirección.' },
  entregado:  { label: 'Entregado',  classes: 'bg-green-50 text-green-700',  descripcion: 'Tu pedido fue entregado exitosamente. ¡Gracias por tu compra!' },
  cancelado:  { label: 'Cancelado',  classes: 'bg-red-50 text-red-600',      descripcion: 'Este pedido fue cancelado. Contáctanos si tienes alguna duda.' },
}

const ESTADOS_DEVOLUCION = {
  solicitada: { 
    label: 'Solicitada', 
    classes: 'bg-yellow-50 text-yellow-700',
    descripcion: 'Tu solicitud de devolución ha sido recibida y está siendo revisada.'
  },
  en_revision: { 
    label: 'En revisión', 
    classes: 'bg-blue-50 text-blue-700',
    descripcion: 'Estamos evaluando tu solicitud y las evidencias proporcionadas.'
  },
  aprobada: { 
    label: 'Aprobada', 
    classes: 'bg-green-50 text-green-700',
    descripcion: 'Tu devolución ha sido aprobada. Procederemos con el reembolso.'
  },
  rechazada: { 
    label: 'Rechazada', 
    classes: 'bg-red-50 text-red-600',
    descripcion: 'Tu solicitud de devolución no ha sido aprobada.'
  }
}

function getEstadoDevolucion(estado) {
  return ESTADOS_DEVOLUCION[estado] || { label: estado, classes: 'bg-gray-100 text-gray-500', descripcion: '' }
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(price)
}

function getEstado(estado) {
  return ESTADOS_PEDIDO[estado] || { label: estado, classes: 'bg-gray-100 text-gray-500', descripcion: '' }
}

function ResenaForm({ onSubmit, submitting }) {
  const [calificacion, setCalificacion] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const c = useResenaColors()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (calificacion === 0) return
    onSubmit(calificacion, comentario)
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: c.formBg, padding: '16px', borderRadius: '12px', border: `1px solid ${c.formBorder}` }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: c.label, marginBottom: '8px' }}>
          Tu calificación
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              style={{
                fontSize: '24px',
                color: star <= (hoverRating || calificacion) ? '#fbbf24' : c.starEmpty,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0'
              }}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setCalificacion(star)}
            >
              ★
            </button>
          ))}
        </div>
        {calificacion > 0 && (
          <p style={{ fontSize: '14px', color: '#db2777', marginTop: '4px', fontWeight: '500' }}>
            {['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][calificacion - 1]}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: c.label, marginBottom: '8px' }}>
          Comentario (opcional)
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Cuéntanos tu experiencia con el producto..."
          rows={3}
          maxLength={500}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: c.textareaBg,
            border: `1px solid ${c.textareaBorder}`,
            color: c.textareaText,
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none'
          }}
        />
        <p style={{ fontSize: '12px', color: c.muted, textAlign: 'right', marginTop: '4px' }}>
          {comentario.length}/500
        </p>
      </div>

      <button
        type="submit"
        disabled={calificacion === 0 || submitting}
        style={{
          width: '100%',
          padding: '12px 24px',
          backgroundColor: calificacion === 0 ? c.disabledBg : '#db2777',
          color: calificacion === 0 ? c.disabledText : '#fff',
          fontWeight: '700',
          borderRadius: '12px',
          border: 'none',
          cursor: calificacion === 0 ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {submitting ? 'Enviando...' : 'Enviar reseña ➤'}
      </button>
    </form>
  )
}

function ResenaFormEdit({ initialCalificacion, initialComentario, onSubmit, onCancel, submitting }) {
  const [calificacion, setCalificacion] = useState(initialCalificacion)
  const [hoverRating, setHoverRating] = useState(0)
  const [comentario, setComentario] = useState(initialComentario)
  const c = useResenaColors()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (calificacion === 0) return
    onSubmit(calificacion, comentario)
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: c.textareaBg, padding: '16px', borderRadius: '12px', border: `1px solid ${c.formBorder}` }}>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: c.label, marginBottom: '8px' }}>
          Tu calificación
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              style={{
                fontSize: '24px',
                color: star <= (hoverRating || calificacion) ? '#fbbf24' : c.starEmpty,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0'
              }}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setCalificacion(star)}
            >
              ★
            </button>
          ))}
        </div>
        {calificacion > 0 && (
          <p style={{ fontSize: '14px', color: '#db2777', marginTop: '4px', fontWeight: '500' }}>
            {['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][calificacion - 1]}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: c.label, marginBottom: '8px' }}>
          Comentario (opcional)
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Cuéntanos tu experiencia con el producto..."
          rows={3}
          maxLength={500}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: c.formBg,
            border: `1px solid ${c.textareaBorder}`,
            color: c.textareaText,
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none'
          }}
        />
        <p style={{ fontSize: '12px', color: c.muted, textAlign: 'right', marginTop: '4px' }}>
          {comentario.length}/500
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            flex: '1',
            padding: '12px 24px',
            backgroundColor: c.cancelBg,
            color: c.cancelText,
            fontWeight: '600',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={calificacion === 0 || submitting}
          style={{
            flex: '2',
            padding: '12px 24px',
            backgroundColor: calificacion === 0 ? c.disabledBg : '#db2777',
            color: calificacion === 0 ? c.disabledText : '#fff',
            fontWeight: '700',
            borderRadius: '12px',
            border: 'none',
            cursor: calificacion === 0 ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {submitting ? 'Guardando...' : 'Guardar cambios ✓'}
        </button>
      </div>
    </form>
  )
}

export default function PedidoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [devolucion, setDevolucion] = useState(null)
  const [encuestasPendientes, setEncuestasPendientes] = useState([])
  const [encuestasRespondidas, setEncuestasRespondidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submittingResenas, setSubmittingResenas] = useState({})
  const [editandoResena, setEditandoResena] = useState(null)

  const handleResenaSubmit = async (encuestaId, calificacion, comentario) => {
    setSubmittingResenas(prev => ({ ...prev, [encuestaId]: true }))
    try {
      await responderEncuesta(encuestaId, calificacion, comentario)
      // Remover la encuesta respondida de la lista pendiente
      setEncuestasPendientes(prev => prev.filter(e => e.id !== encuestaId))
      // Agregar a respondidas
      const nuevaResena = { id: encuestaId, calificacion, comentario, producto: encuestasPendientes.find(e => e.id === encuestaId)?.producto }
      setEncuestasRespondidas(prev => [nuevaResena, ...prev])
      alert('¡Gracias por tu reseña!')
    } catch (err) {
      alert('Error al enviar la reseña: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSubmittingResenas(prev => ({ ...prev, [encuestaId]: false }))
    }
  }

  const handleResenaUpdate = async (encuestaId, calificacion, comentario) => {
    setSubmittingResenas(prev => ({ ...prev, [encuestaId]: true }))
    try {
      await actualizarEncuesta(encuestaId, calificacion, comentario)
      // Actualizar la reseña en la lista
      setEncuestasRespondidas(prev => prev.map(e => 
        e.id === encuestaId ? { ...e, calificacion, comentario } : e
      ))
      setEditandoResena(null)
      alert('¡Reseña actualizada!')
    } catch (err) {
      alert('Error al actualizar la reseña: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSubmittingResenas(prev => ({ ...prev, [encuestaId]: false }))
    }
  }

  const handleResenaDelete = async (encuestaId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reseña?')) return
    try {
      await eliminarEncuesta(encuestaId)
      // Mover de respondidas a pendientes
      const resenaEliminada = encuestasRespondidas.find(e => e.id === encuestaId)
      setEncuestasRespondidas(prev => prev.filter(e => e.id !== encuestaId))
      if (resenaEliminada) {
        setEncuestasPendientes(prev => [...prev, resenaEliminada])
      }
      alert('Reseña eliminada. Puedes volver a reseñar este producto.')
    } catch (err) {
      alert('Error al eliminar la reseña: ' + (err.response?.data?.detail || err.message))
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pedido
        const { data: pedidoData } = await api.get(`/pedidos/${id}`)
        setPedido(pedidoData)

        // Fetch devolución si existe
        try {
          const { data: devolucionData } = await api.get(`/devoluciones/pedido/${id}`)
          if (devolucionData) {
            console.log('Devolución cargada:', devolucionData)
            setDevolucion(devolucionData)
          }
          // Si es null, no hay devolución - es normal, no hacer nada
        } catch (devErr) {
          // Solo manejar errores reales (401, 500+)
          if (devErr.response?.status === 401) {
            console.error('Error de autenticación al cargar devolución:', devErr)
            setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
          } else if (devErr.response?.status >= 500) {
            console.error('Error del servidor al cargar devolución:', devErr)
            setError('Error temporal del servidor. Por favor intenta más tarde.')
          }
          // Otros errores los ignoramos - no hay devolución
        }

        // Fetch todas las encuestas del pedido (pendientes y respondidas)
        if (pedidoData.estado === 'entregado') {
          try {
            const { data: encuestasPendientesData } = await api.get(`/encuestas/pedido/${id}/pendientes`)
            console.log('Encuestas pendientes cargadas:', encuestasPendientesData)
            if (encuestasPendientesData && encuestasPendientesData.length > 0) {
              setEncuestasPendientes(encuestasPendientesData)
            }
          } catch (encErr) {
            console.log('No hay encuestas pendientes o error:', encErr)
          }
          
          try {
            const { data: encuestasRespondidasData } = await api.get(`/encuestas/pedido/${id}/respondidas`)
            console.log('Encuestas respondidas cargadas:', encuestasRespondidasData)
            // Actualizar siempre el estado, incluso si está vacío
            setEncuestasRespondidas(encuestasRespondidasData || [])
          } catch (encErr) {
            console.log('No hay encuestas respondidas o error:', encErr)
            setEncuestasRespondidas([])
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar el pedido')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-600 rounded-full animate-spin" />
      <p className="text-sm">Cargando pedido…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <span className="text-5xl">⚠️</span>
      <h2 className="text-lg font-bold text-gray-800">{error}</h2>
      <button
        onClick={() => navigate('/pedidos')}
        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition"
      >
        ← Volver a mis pedidos
      </button>
    </div>
  )

  if (!pedido) return null

  const estado = getEstado(pedido.estado)
  const fechaPedido = new Date(pedido.fecha_pedido).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
  const fechaEntrega = pedido.fecha_entrega
    ? new Date(pedido.fecha_entrega).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
    : null

  return (
    <div
      className="flex justify-center bg-gray-50 px-4"
      style={{ paddingTop: 'calc(var(--nav-h) + 2rem)', paddingBottom: '4rem' }}
    >
      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-6xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/pedidos" className="text-pink-600 font-medium hover:underline">
            Volver
          </Link>
          <span>/</span>
          <span>Detalle del pedido</span>
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">

          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100 ">
            <div className="flex flex-col gap-0.5 w-full ">
              <div className='flex flex-row justify-between'>
                <span className="text-xs font-bold text-gray-400 mt-4 mb-5 uppercase tracking-wider">
                    Pedido #{pedido.id}
                </span>
                
                {/* Badge estado con tooltip */}
                <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${estado.classes}`}>
                    Estado: {estado.label}
                </span>
                <div className="relative group">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center cursor-help text-[11px] font-black border ${estado.classes} opacity-70`}>
                    ?
                    </div>
                    <div className="absolute left-0 top-7 z-10 w-56 bg-gray-900 text-white text-xs rounded-xl p-3 leading-relaxed shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                    {estado.descripcion}
                    <div className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45" />
                    </div>
                </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                Realizado el {fechaPedido}
              </span>
              {fechaEntrega && (
                <span className="text-sm text-gray-500">
                  Entregado el {fechaEntrega}
                </span>
              )}
            </div>
          </div>

          {/* Total y canal */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Canal
              </span>
              <span className="text-sm font-semibold text-gray-700 capitalize">
                {pedido.canal_contacto}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Total
              </span>
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {formatPrice(pedido.total)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Productos */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Productos del pedido
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {pedido.items?.map((item) => {
              const imagen = item.producto?.media?.find(m => m.tipo === 'imagen')?.cloudinary_url
              return (
                <Link
                  key={item.id}
                  to={item.producto_id ? `/productos/${item.producto_id}` : '#'}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                >
                  {/* Imagen */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {imagen
                      ? <img src={imagen} alt={item.producto?.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {item.producto?.nombre || `Producto #${item.producto_id}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPrice(item.precio_unitario)} c/u
                    </p>
                  </div>

                  {/* Cantidad y subtotal */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-800">
                      {formatPrice(item.precio_unitario * item.cantidad)}
                    </span>
                    <span className="text-xs text-gray-400">
                      x{item.cantidad}
                    </span>
                  </div>

                  {/* Flecha */}
                  {item.producto_id && (
                    <span className="text-gray-300 text-sm flex-shrink-0">›</span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Total final */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total</span>
            <span className="text-xl font-black text-gray-900">{formatPrice(pedido.total)}</span>
          </div>
        </motion.div>

        {/* Estado de devolución */}
        {devolucion && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-4"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Estado de devolución
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getEstadoDevolucion(devolucion.estado).classes}`}>
                      {getEstadoDevolucion(devolucion.estado).label}
                    </span>
                    <div className="relative group">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center cursor-help text-[11px] font-black border ${getEstadoDevolucion(devolucion.estado).classes} opacity-70`}>
                        ?
                      </div>
                      <div className="absolute left-0 top-7 z-10 w-56 bg-gray-900 text-white text-xs rounded-xl p-3 leading-relaxed shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200">
                        {getEstadoDevolucion(devolucion.estado).descripcion}
                        <div className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45" />
                      </div>
                    </div>
                  </div>
                  {devolucion.motivo && (
                    <p className="text-xs text-gray-400 mt-2">
                      Motivo: {devolucion.motivo}
                    </p>
                  )}
                  {devolucion.fecha_solicitud && (
                    <p className="text-xs text-gray-400 mt-1">
                      Solicitada el: {new Date(devolucion.fecha_solicitud).toLocaleDateString('es-CO', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sección de reseñas - pendientes y respondidas */}
        {pedido.estado === 'entregado' && (
          <>
            {/* Formularios de reseña - uno por cada producto pendiente */}
            {encuestasPendientes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-amber-200 rounded-2xl overflow-hidden mt-4"
              >
                <div className="px-6 py-4">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">✍️</span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        ¿Qué tal tu experiencia?
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Califica cada producto que recibiste. Tu opinión ayuda a otros clientes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {encuestasPendientes.map((encuesta) => (
                      <div key={encuesta.id} className="bg-white rounded-xl p-4 border border-amber-100">
                        <div className="flex items-center gap-3 mb-3">
                          {encuesta.producto?.media?.[0]?.cloudinary_url ? (
                            <img 
                              src={encuesta.producto.media[0].cloudinary_url} 
                              alt={encuesta.producto?.nombre}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">👟</div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{encuesta.producto?.nombre || `Producto #${encuesta.producto_id}`}</p>
                            <p className="text-xs text-gray-500">Deja tu reseña</p>
                          </div>
                        </div>
                        <ResenaForm 
                          onSubmit={(calificacion, comentario) => handleResenaSubmit(encuesta.id, calificacion, comentario)} 
                          submitting={submittingResenas[encuesta.id] || false} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Mensaje cuando hay reseñas completadas */}
            {encuestasRespondidas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-50 border border-green-200 rounded-2xl overflow-hidden mt-4"
              >
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">
                        Reseñas completadas
                      </h3>
                      <p className="text-xs text-green-600 mt-1">
                        Gracias por compartir tu opinión. ¡Ayuda a la comunidad!
                      </p>
                    </div>
                  </div>

                  {/* Mostrar reseñas completadas con opciones de editar/eliminar */}
                  <div className="space-y-3 mt-4">
                    {encuestasRespondidas.map((encuesta) => (
                      <div key={encuesta.id} className="bg-white rounded-xl p-4 border border-green-100">
                        {editandoResena === encuesta.id ? (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              {encuesta.producto?.media?.[0]?.cloudinary_url ? (
                                <img 
                                  src={encuesta.producto.media[0].cloudinary_url} 
                                  alt={encuesta.producto?.nombre}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">👟</div>
                              )}
                              <div>
                                <p className="font-medium text-gray-800">{encuesta.producto?.nombre || `Producto #${encuesta.producto_id}`}</p>
                                <p className="text-xs text-gray-500">Editando reseña...</p>
                              </div>
                            </div>
                            <ResenaFormEdit 
                              initialCalificacion={encuesta.calificacion}
                              initialComentario={encuesta.comentario || ''}
                              onSubmit={(calificacion, comentario) => handleResenaUpdate(encuesta.id, calificacion, comentario)}
                              onCancel={() => setEditandoResena(null)}
                              submitting={submittingResenas[encuesta.id] || false}
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-start gap-3">
                              {encuesta.producto?.media?.[0]?.cloudinary_url ? (
                                <img 
                                  src={encuesta.producto.media[0].cloudinary_url} 
                                  alt={encuesta.producto?.nombre}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">👟</div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{encuesta.producto?.nombre || `Producto #${encuesta.producto_id}`}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-yellow-400">{'★'.repeat(encuesta.calificacion || 0)}{'☆'.repeat(5 - (encuesta.calificacion || 0))}</span>
                                  <span className="text-sm text-gray-600">({encuesta.calificacion || 0}/5)</span>
                                </div>
                                {encuesta.comentario && (
                                  <p className="text-sm text-gray-600 mt-2 italic">"{encuesta.comentario}"</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {encuesta.respondida_en ? new Date(encuesta.respondida_en).toLocaleDateString('es-CO') : ''}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditandoResena(encuesta.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar reseña"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleResenaDelete(encuesta.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar reseña"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Mensaje cuando no hay ninguna reseña */}
            {encuestasPendientes.length === 0 && encuestasRespondidas.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden mt-4"
              >
                <div className="px-6 py-4 flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Sin reseñas disponibles
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Este pedido no tiene productos para reseñar en este momento.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Botón de devolución - solo para pedidos entregados sin devolución activa */}
        {pedido.estado === 'entregado' && !devolucion && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-4"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    ¿Tienes algún problema con tu pedido?
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Puedes solicitar una devolución si el producto no cumple con tus expectativas
                  </p>
                </div>
                <Link
                  to={`/devoluciones/solicitar/${pedido.id}`}
                  className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-full hover:bg-red-700 transition-colors duration-200"
                >
                  Solicitar Devolución
                </Link>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}