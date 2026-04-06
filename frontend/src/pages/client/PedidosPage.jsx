import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'

const ESTADOS_PEDIDO = {
  pendiente:  { 
    label: 'Pendiente',  
    classes: 'bg-gray-100 text-gray-500',
    descripcion: 'Tu pedido fue recibido y está esperando confirmación por parte de la empresa.'
  },
  confirmado: { 
    label: 'Confirmado', 
    classes: 'bg-blue-50 text-blue-700',
    descripcion: 'La empresa ya verificó y preparó tus productos. Pronto será enviado.'
  },
  enviado: { 
    label: 'Enviado',    
    classes: 'bg-amber-50 text-amber-700',
    descripcion: 'Tu pedido está en camino. Pronto llegará a tu dirección.'
  },
  entregado: { 
    label: 'Entregado',  
    classes: 'bg-green-50 text-green-700',
    descripcion: 'Tu pedido fue entregado exitosamente. ¡Gracias por tu compra!'
  },
  cancelado: { 
    label: 'Cancelado',  
    classes: 'bg-red-50 text-red-600',
    descripcion: 'Este pedido fue cancelado. Contáctanos si tienes alguna duda.'
  },
}

function getEstado(estado) {
  return ESTADOS_PEDIDO[estado] || { label: estado, classes: 'bg-gray-100 text-gray-500' }
}

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(price)
}

function PedidoCard({ pedido, index }) {
  const estado = getEstado(pedido.estado)

  // Primera imagen de cada item
  const getImagen = (item) =>
    item.producto?.media?.find(m => m.tipo === 'imagen')?.cloudinary_url || null

  // Máximo 4 imágenes únicas con imagen
  const itemsConImagen = pedido.items
    ?.filter(item => getImagen(item))
    .slice(0, 3) || []

  // Items sin imagen para mostrar en texto
  const itemsSinImagen = pedido.items
    ?.filter(item => !getImagen(item)) || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className='flex flex-col justify-center border border-gray-300 rounded-md p-8 hover:border-pink-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'>
      
      {/* Recuadro del pedido */}
      <Link to={`/pedidos/${pedido.id}`} className="flex flex-col">
        <div>
            <div className='flex flex-row items-center'>
              {/* Info del estado del pedido */}
              <div className="relative group mr-3">
                <div className={'w-5 h-5 rounded-full flex items-center justify-center cursor-help text-[11px] font-black border ${estado.classes} opacity-70'}> ?
                </div>
                
                {/* Tooltip */}
                <div className="absolute left-1 top-7 z-10 w-56 bg-gray-800 text-white text-xs rounded-xl p-3 leading-relaxed shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200"> {estado.descripcion}
                </div>
              </div>
               
              {/* Estado del pedido */}
              <span className='text-md font-bold'>Estado del pedido: </span>
              <span className={`text-md font-bold px-3 py-1 rounded-full ${estado.classes}`}> {estado.label}</span>
            </div>

          {/* Fechas del pedido */}
          <span className="flex text-sm text-gray-400">
            {new Date(pedido.fecha_pedido).toLocaleDateString('es-CO', {
              day: '2-digit', month: 'short', year: 'numeric'
            })}
            <h3 className='flex justify-center w-5'>-</h3>
            {new Date(pedido.fecha_entrega).toLocaleDateString('es-CO', {
              day: '2-digit', month: 'short', year: 'numeric'
            })}
          </span>
          {/* Marca de division */}
          <div className="border-t border-gray-300 !mt-4 !mb-8"></div>
        </div>

          <div className='flex flex-row justify-between'>
            {/* Imágenes de productos */}
            {itemsConImagen.length > 0 && (
              <div className="flex gap-3">
                {itemsConImagen.map((item) => (
                  <div key={item.id} className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={getImagen(item)} alt={item.producto?.nombre || 'Producto'} className="w-full h-full object-cover"/>
                    {/* Badge cantidad */}
                    {item.cantidad > 1 && (
                      <span className="absolute bottom-1 right-1 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        x{item.cantidad}
                      </span>
                    )}
                  </div>
                ))}
                {/* Si hay más productos de los que se muestran */}
                {pedido.items.length > 3 && (
                  <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-400">
                      +{pedido.items.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* Items sin imagen como texto */}
            {itemsSinImagen.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {itemsSinImagen.slice(0, 2).map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center px-4 py-3 text-sm ${
                      i !== 0 ? 'border-t border-gray-100' : ''
                    }`}
                  >
                    <span className="text-gray-600">
                      {item.producto?.nombre || `Producto #${item.producto_id}`}
                    </span>
                    <span className="text-gray-400 text-xs font-semibold">
                      x{item.cantidad}
                    </span>
                  </div>
                ))}
                {itemsSinImagen.length > 2 && (
                  <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      +{itemsSinImagen.length - 2} productos más
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* Costo del pedido */}
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {formatPrice(pedido.total)}
            </span>
          </div>
        <br />
        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-bold text-pink-600">
            Ver detalle →
          </span>
        </div>
        
      </Link>
    </motion.div>
  )
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPedidos = useCallback(async () => {
    try {
      const { data } = await api.get('/clientes/pedidos')
      Array.isArray(data) ? setPedidos(data) : setPedidos([])
    } catch (err) {
      console.error(err)
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPedidos() }, [fetchPedidos])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-600 rounded-full animate-spin" />
      <p className="text-sm">Cargando tus pedidos…</p>
    </div>
  )

return (
  <div className="flex justify-center bg-gray-50 px-4 py-8" style={{ paddingTop: 'calc(var(--nav-h) + 2rem)', paddingBottom: '2rem' }}>
    <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-6xl" style={{ paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Título */}
      <h1 className="text-4xl text-center font-black text-gray-900 tracking-tight leading-tight">
        Mis pedidos
      </h1>
      <p className="text-sm text-center text-gray-400 mt-1">
        Historial de todas tus compras con nosotros
      </p>

      {/* Sin pedidos */}
      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <span className="text-6xl">🛍️</span>
          <h2 className="text-lg font-bold text-gray-800">Aún no tienes pedidos</h2>
          <p className="text-sm text-gray-400">Explora el catálogo y haz tu primera compra</p>
          <Link to="/catalogo" className="mt-2 px-7 py-3 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          <p className="text-xs text-center font-bold uppercase tracking-widest text-gray-400 hover:text-pink-600 mt-5">
            {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
          </p>
          <br />
          <div className="flex flex-col gap-4">
            {pedidos.map((pedido, i) => (
              <PedidoCard key={pedido.id} pedido={pedido} index={i} />
            ))}
          </div>
        </div>
      )}

    </div>
  </div>
)
}