import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import api from '../../services/api'
import './DashboardVentasPage.css'

// ── Formatters ────────────────────────────────────────────────────────────────
const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatCOP = (value) => COP.format(value)

const formatPeriodo = (periodo) => {
  if (!periodo) return ''
  const [year, month] = periodo.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(month, 10) - 1]} ${year}`
}

const estadoConfig = {
  pendiente:  { label: 'Pendiente',  cls: 'dv-badge--pendiente' },
  confirmado: { label: 'Confirmado', cls: 'dv-badge--confirmado' },
  enviado:    { label: 'Enviado',    cls: 'dv-badge--enviado' },
  entregado:  { label: 'Entregado', cls: 'dv-badge--entregado' },
  cancelado:  { label: 'Cancelado',  cls: 'dv-badge--cancelado' },
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <motion.div
      className={`dv-kpi ${accent ? `dv-kpi--${accent}` : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="dv-kpi__label">{label}</p>
      <p className="dv-kpi__value">{value}</p>
      {sub && <p className="dv-kpi__sub">{sub}</p>}
    </motion.div>
  )
}

function EstadoBadge({ estado }) {
  const cfg = estadoConfig[estado] || { label: estado, cls: '' }
  return <span className={`dv-badge ${cfg.cls}`}>{cfg.label}</span>
}

function CustomTooltipArea({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="dv-tooltip">
      <p className="dv-tooltip__title">{formatPeriodo(label)}</p>
      <p className="dv-tooltip__row dv-tooltip__row--green">
        Ingresos: <strong>{formatCOP(payload[0]?.value ?? 0)}</strong>
      </p>
      <p className="dv-tooltip__row">
        Pedidos: <strong>{payload[1]?.value ?? 0}</strong>
      </p>
    </div>
  )
}

function CustomTooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="dv-tooltip">
      <p className="dv-tooltip__title">{label}</p>
      <p className="dv-tooltip__row">
        Unidades: <strong>{payload[0]?.value ?? 0}</strong>
      </p>
      <p className="dv-tooltip__row dv-tooltip__row--green">
        Ingresos: <strong>{formatCOP(payload[1]?.value ?? 0)}</strong>
      </p>
    </div>
  )
}

function SkeletonBlock({ h }) {
  return <div className="dv-skeleton" style={{ height: h || 120 }} />
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardVentasPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Date range filter
  const today = new Date()
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const toISO = (d) => d.toISOString().split('T')[0]

  const [fechaInicio, setFechaInicio] = useState(toISO(sixMonthsAgo))
  const [fechaFin, setFechaFin] = useState(toISO(today))

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/empresa/dashboard', {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      })
      setData(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [fechaInicio, fechaFin])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Trend chart: normalize pedidos to secondary Y axis using percentage
  const trendData = (data?.tendencia_mensual || []).map((m) => ({
    ...m,
    label: formatPeriodo(m.periodo),
  }))

  const topVendidos = data?.ranking_mas_vendidos || []
  const menosVendidos = data?.ranking_menos_vendidos || []
  const historial = data?.historial_pedidos || []
  const kpis = data?.kpis || {}

  return (
    <div className="dv-page">
      {/* ── Header ── */}
      <div className="dv-header container">
        <div>
          <h1 className="dv-title">Dashboard de Ventas</h1>
          {data && (
            <p className="dv-subtitle">
              {data.empresa.nombre} &nbsp;·&nbsp; {data.periodo.inicio} → {data.periodo.fin}
            </p>
          )}
        </div>

        {/* ── Filtros de fecha ── */}
        <div className="dv-filters">
          <div className="dv-filter-group">
            <label className="dv-filter-label">Desde</label>
            <input
              type="date"
              className="dv-filter-input"
              value={fechaInicio}
              max={fechaFin}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="dv-filter-group">
            <label className="dv-filter-label">Hasta</label>
            <input
              type="date"
              className="dv-filter-input"
              value={fechaFin}
              min={fechaInicio}
              max={toISO(today)}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <button className="dv-btn" onClick={fetchDashboard} disabled={loading}>
            {loading ? <span className="dv-spinner" /> : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dv-error container">
          <span>⚠️ {error}</span>
          <button className="dv-btn dv-btn--sm" onClick={fetchDashboard}>Reintentar</button>
        </div>
      )}

      <div className="container dv-content">

        {/* ── KPI Cards ── */}
        <section className="dv-section">
          <h2 className="dv-section-title">Resumen del periodo</h2>
          {loading ? (
            <div className="dv-kpi-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} h={100} />)}
            </div>
          ) : (
            <div className="dv-kpi-grid">
              <KpiCard
                label="Ingresos totales"
                value={formatCOP(kpis.ingresos_totales ?? 0)}
                sub="Pedidos no cancelados"
                accent="green"
              />
              <KpiCard
                label="Total pedidos"
                value={kpis.total_pedidos ?? 0}
                sub={`${kpis.pedidos_cancelados ?? 0} cancelado(s)`}
              />
              <KpiCard
                label="Entregados"
                value={kpis.pedidos_entregados ?? 0}
                accent="blue"
              />
              <KpiCard
                label="En camino"
                value={(kpis.pedidos_enviados ?? 0) + (kpis.pedidos_confirmados ?? 0)}
                sub="Confirmados + enviados"
                accent="amber"
              />
              <KpiCard
                label="Pendientes"
                value={kpis.pedidos_pendientes ?? 0}
                accent="gray"
              />
              <KpiCard
                label="Ticket promedio"
                value={formatCOP(kpis.ticket_promedio ?? 0)}
                sub="Por pedido entregado"
                accent="purple"
              />
            </div>
          )}
        </section>

        {/* ── Tendencia mensual ── */}
        <section className="dv-section">
          <h2 className="dv-section-title">Tendencia mensual</h2>
          {loading ? (
            <SkeletonBlock h={280} />
          ) : trendData.length === 0 ? (
            <div className="dv-empty">Sin datos en el periodo seleccionado.</div>
          ) : (
            <div className="dv-chart-card">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="ingresos"
                    orientation="left"
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <YAxis
                    yAxisId="pedidos"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltipArea />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: '#6B7280', paddingTop: 8 }}
                    formatter={(value) =>
                      value === 'ingresos' ? 'Ingresos (COP)' : 'Pedidos'
                    }
                  />
                  <Area
                    yAxisId="ingresos"
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#colorIngresos)"
                    dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area
                    yAxisId="pedidos"
                    type="monotone"
                    dataKey="pedidos"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#colorPedidos)"
                    dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* ── Rankings ── */}
        <div className="dv-rankings">
          {/* Más vendidos */}
          <section className="dv-section dv-section--half">
            <h2 className="dv-section-title">Top 5 — Más vendidos</h2>
            {loading ? (
              <SkeletonBlock h={220} />
            ) : topVendidos.length === 0 ? (
              <div className="dv-empty">Sin ventas en el periodo.</div>
            ) : (
              <div className="dv-chart-card">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={topVendidos}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fontSize: 11, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                    />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Bar dataKey="unidades" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    <Bar dataKey="ingresos" fill="#6EE7B7" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Menos vendidos */}
          <section className="dv-section dv-section--half">
            <h2 className="dv-section-title">Menos vendidos</h2>
            {loading ? (
              <SkeletonBlock h={220} />
            ) : menosVendidos.length === 0 ? (
              <div className="dv-empty">
                {topVendidos.length <= 5
                  ? 'No hay suficientes productos para comparar.'
                  : 'Sin datos.'}
              </div>
            ) : (
              <div className="dv-chart-card">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={menosVendidos}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fontSize: 11, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                    />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Bar dataKey="unidades" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    <Bar dataKey="ingresos" fill="#FDE68A" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {/* ── Historial de pedidos ── */}
        <section className="dv-section">
          <h2 className="dv-section-title">Historial reciente de pedidos</h2>
          {loading ? (
            <SkeletonBlock h={200} />
          ) : historial.length === 0 ? (
            <div className="dv-empty">No hay pedidos en el periodo seleccionado.</div>
          ) : (
            <div className="dv-table-wrap">
              <table className="dv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Canal</th>
                    <th>Productos</th>
                    <th>Unidades</th>
                    <th className="dv-table__right">Total empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((p) => (
                    <tr key={p.id}>
                      <td className="dv-table__id">#{p.id}</td>
                      <td className="dv-table__date">
                        {new Date(p.fecha).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td><EstadoBadge estado={p.estado} /></td>
                      <td className="dv-table__canal">{p.canal}</td>
                      <td>{p.num_productos}</td>
                      <td>{p.unidades}</td>
                      <td className="dv-table__right dv-table__total">
                        {formatCOP(p.total_empresa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
