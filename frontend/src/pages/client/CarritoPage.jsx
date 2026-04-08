import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCarrito } from '../../context/CarritoContext'
import api from '../../services/api'

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(price)
}

export default function CarritoPage() {
  const { items, quitarItem, cambiarCantidad, vaciarCarrito } = useCarrito()
  const [seleccionados, setSeleccionados] = useState(() =>
    new Set(items.map(i => i.producto_id))
  )
  const [canal, setCanal] = useState('web')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const toggleSeleccion = (producto_id) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(producto_id) ? next.delete(producto_id) : next.add(producto_id)
      return next
    })
  }

  const itemsSeleccionados = items.filter(i => seleccionados.has(i.producto_id))
  const totalSeleccionado = itemsSeleccionados.reduce(
    (acc, i) => acc + i.precio * i.cantidad, 0
  )

  const handleConfirmar = async () => {
    if (itemsSeleccionados.length === 0) return
    setLoading(true)
    setError('')
    try {
      await api.post('/pedidos', {
        canal_contacto: canal,
        items: itemsSeleccionados.map(i => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
        }))
      })
      // Quitar solo los items que se pidieron
      itemsSeleccionados.forEach(i => quitarItem(i.producto_id))
      navigate('/pedidos')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al confirmar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
      style={{ paddingTop: 'var(--nav-h)' }}
    >
      <span className="text-6xl">🛒</span>
      <h2 className="text-xl font-bold text-gray-800">Tu carrito está vacío</h2>
      <p className="text-sm text-gray-400">Agrega productos desde el catálogo</p>
      <Link
        to="/catalogo"
        className="mt-2 px-7 py-3 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition"
      >
        Ver catálogo
      </Link>
    </div>
  )

  return (
    <div
      className="flex justify-center bg-gray-50 px-4"
      style={{ paddingTop: 'calc(var(--nav-h) + 2rem)', paddingBottom: '4rem' }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-4">

        {/* Título */}
        <div className="mb-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Carrito</h1>
          <p className="text-sm text-gray-400 mt-1">
            Selecciona los productos que deseas pedir
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {/* Lista de items */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <AnimatePresence>
            {items.map((item, i) => {
              const seleccionado = seleccionados.has(item.producto_id)
              return (
                <motion.div
                  key={item.producto_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    i !== 0 ? 'border-t border-gray-100' : ''
                  } ${seleccionado ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={() => toggleSeleccion(item.producto_id)}
                    className="w-4 h-4 accent-pink-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Imagen */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                    {item.imagen
                      ? <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl">👟</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.precio)} c/u</p>
                  </div>

                  {/* Cantidad */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, item.cantidad - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-pink-500 hover:text-pink-600 transition text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-gray-800 w-4 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(item.producto_id, item.cantidad + 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-pink-500 hover:text-pink-600 transition text-sm font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm font-black text-gray-800 w-20 text-right flex-shrink-0">
                    {formatPrice(item.precio * item.cantidad)}
                  </span>

                  {/* Quitar */}
                  <button
                    onClick={() => quitarItem(item.producto_id)}
                    className="text-gray-300 hover:text-red-400 transition text-lg flex-shrink-0"
                    title="Quitar"
                  >
                    ✕
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Resumen y confirmar */}
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex flex-col gap-4">

          {/* Sumatoria seleccionados */}
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{itemsSeleccionados.length} producto(s) seleccionado(s)</span>
              <span>{itemsSeleccionados.reduce((acc, i) => acc + i.cantidad, 0)} unidades</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total seleccionado</span>
              <span className="text-2xl font-black text-gray-900 tracking-tight">
                {formatPrice(totalSeleccionado)}
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={vaciarCarrito}
              disabled={loading}
              className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-bold rounded-full hover:border-gray-300 transition disabled:opacity-50"
            >
              Vaciar carrito
            </button>
            <button
              onClick={handleConfirmar}
              disabled={loading || itemsSeleccionados.length === 0}
              className="flex-1 py-3 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando…' : 'Confirmar pedido'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}