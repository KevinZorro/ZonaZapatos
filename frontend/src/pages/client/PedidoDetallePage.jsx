import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'

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

export default function PedidoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [devolucion, setDevolucion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pedido
        const { data: pedidoData } = await api.get(`/pedidos/${id}`)
        setPedido(pedidoData)

        // Fetch devolución si existe - TEMPORALMENTE COMENTADO
        // try {
        //   const { data: devolucionData } = await api.get(`/devoluciones/pedido/${id}`)
        //   console.log('Devolución cargada:', devolucionData)
        //   setDevolucion(devolucionData)
        // } catch (devErr) {
        //   // Si no hay devolución, es normal (404)
        //   if (devErr.response?.status === 404) {
        //     console.log('No hay devolución para este pedido (404)')
        //     // Es normal que no haya devolución, no mostrar error
        //   } else if (devErr.response?.status === 401) {
        //     console.error('Error de autenticación al cargar devolución:', devErr)
        //     setError('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')
        //   } else if (devErr.response?.status >= 500) {
        //     console.error('Error del servidor al cargar devolución:', devErr)
        //     setError('Error temporal del servidor. Por favor intenta más tarde.')
        //   } else {
        //     console.error('Error al cargar devolución:', devErr)
        //     console.error('Response:', devErr.response)
        //     setError('Error al cargar información de devolución.')
        //   }
        // }
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