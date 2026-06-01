import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'

const ESTADOS = [
  { value: 'pendiente',  label: 'Pendientes',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'confirmado', label: 'Confirmados', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'enviado',    label: 'Enviados',    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'entregado',  label: 'Entregados',  badge: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'cancelado',  label: 'Cancelados',  badge: 'bg-red-50 text-red-600 border-red-200' },
]

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(price)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function badgeFor(estado) {
  return ESTADOS.find(e => e.value === estado)?.badge || 'bg-gray-100 text-gray-600 border-gray-200'
}

function PedidoCard({ pedido, onAceptar, onRechazar, onEnviar, busy }) {
  const [showRechazo, setShowRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')

  const itemsEmpresa = pedido.items.filter(i => i.es_de_esta_empresa)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">Pedido #{pedido.id}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeFor(pedido.estado)}`}>
            {pedido.estado}
          </span>
          <span className="text-xs text-gray-500">{formatDate(pedido.fecha_pedido)}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase">Subtotal tu empresa</p>
          <p className="text-lg font-bold text-gray-900">{formatPrice(pedido.subtotal_empresa)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase">Cliente</p>
          <p className="font-medium text-gray-900">{pedido.cliente_nombre}</p>
          <p className="text-gray-600 text-xs">{pedido.cliente_correo}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Canal</p>
          <p className="font-medium text-gray-900 capitalize">{pedido.canal_contacto}</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-3">
        <p className="text-xs text-gray-500 uppercase mb-2">Productos de tu empresa</p>
        <ul className="space-y-2">
          {itemsEmpresa.map(it => (
            <li key={it.id} className="flex items-center gap-3">
              {it.producto_imagen_url && (
                <img src={it.producto_imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover border" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{it.producto_nombre || `Producto #${it.producto_id}`}</p>
                <p className="text-xs text-gray-500">Cantidad: {it.cantidad} · {formatPrice(it.precio_unitario)} c/u</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pedido.motivo_rechazo && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
          <strong>Motivo de rechazo:</strong> {pedido.motivo_rechazo}
        </div>
      )}

      {pedido.estado === 'pendiente' && !showRechazo && (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setShowRechazo(true)}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Rechazar
          </button>
          <button
            onClick={() => onAceptar(pedido.id)}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50"
          >
            Aceptar pedido
          </button>
        </div>
      )}

      {pedido.estado === 'pendiente' && showRechazo && (
        <div className="space-y-2">
          <label className="text-xs text-gray-600">Motivo del rechazo</label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej: producto agotado, no podemos cumplir el plazo…"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowRechazo(false); setMotivo('') }}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onRechazar(pedido.id, motivo)}
              disabled={busy || motivo.trim().length < 3}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}

      {pedido.estado === 'confirmado' && (
        <div className="flex justify-end">
          <button
            onClick={() => onEnviar(pedido.id)}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Marcar como enviado
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function GestionPedidosPage() {
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('pendiente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const { data } = await api.get(`/empresa/pedidos?estado=${filtro}`)
      setPedidos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron cargar los pedidos')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  const handleAceptar = async (id) => {
    setBusy(true)
    try {
      await api.put(`/empresa/pedidos/${id}/aceptar`)
      await cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo aceptar el pedido')
    } finally {
      setBusy(false)
    }
  }

  const handleRechazar = async (id, motivo) => {
    setBusy(true)
    try {
      await api.put(`/empresa/pedidos/${id}/rechazar`, { motivo })
      await cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo rechazar el pedido')
    } finally {
      setBusy(false)
    }
  }

  const handleEnviar = async (id) => {
    setBusy(true)
    try {
      await api.put(`/empresa/pedidos/${id}/enviar`)
      await cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo marcar como enviado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={{ paddingTop: 'calc(var(--nav-h) + 2rem)' }}>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Gestión de Pedidos</h1>
      <p className="text-gray-600 mb-6">Acepta o rechaza las compras de tus clientes.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {ESTADOS.map(e => (
          <button
            key={e.value}
            onClick={() => setFiltro(e.value)}
            className={`px-4 py-2 text-sm rounded-full border transition ${
              filtro === e.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <span className="text-5xl mb-4 block">📭</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin pedidos en este estado</h3>
          <p className="text-gray-600 text-sm">Cuando lleguen pedidos aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map(p => (
            <PedidoCard
              key={p.id}
              pedido={p}
              busy={busy}
              onAceptar={handleAceptar}
              onRechazar={handleRechazar}
              onEnviar={handleEnviar}
            />
          ))}
        </div>
      )}
    </div>
  )
}
