/* ============================================
   ZONA ZAPATOS — Ilustraciones (empty states / heros)
   Line-art a mano, paleta magenta/olive/dark.
   Uso:  <Illustration name="empty-search" />
   ============================================ */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Wrap = ({ children, size = 220, viewBox = '0 0 240 200', className = '', ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size * (200 / 240)}
    viewBox={viewBox}
    className={`zz-illu ${className}`}
    {...rest}
  >
    {children}
  </svg>
)

const ACCENT = 'var(--magenta, #C8006E)'
const SOFT   = 'var(--ink-soft, #5B524A)'
const OLIVE  = 'var(--olive, #8B9D3A)'

export function EmptySearch(props) {
  return (
    <Wrap {...props}>
      {/* Suelo */}
      <path d="M30 165 H210" stroke={SOFT} strokeWidth="1.2" strokeDasharray="2 5" fill="none" />
      {/* Lupa grande */}
      <g {...base} stroke={ACCENT}>
        <circle cx="105" cy="95" r="42" />
        <path d="m138 128 22 22" />
        <path d="M85 95a20 20 0 0 1 20-20" stroke={SOFT} />
      </g>
      {/* Zapato dentro de lupa */}
      <g {...base} stroke={SOFT} strokeWidth="1.4" transform="translate(78 95)">
        <path d="M0 12c4-1 7-3 10-6l6-6c1-1 3-1 5-1l7 2c1.5.5 2.5 1.5 3 3l1 2c.5 1.5 1.5 2 3 2l5 1c1.5.5 2 1.5 2 3v3c0 1-.5 1.5-1.5 1.5H1c-.5 0-1-.5-1-1V12z" />
        <circle cx="6" cy="16" r=".6" fill={SOFT} />
        <circle cx="14" cy="16" r=".6" fill={SOFT} />
        <circle cx="22" cy="16" r=".6" fill={SOFT} />
        <circle cx="32" cy="16" r=".6" fill={SOFT} />
      </g>
      {/* Sparkles */}
      <g {...base} stroke={OLIVE}>
        <path d="M170 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M50 60l1.5 3 3 1-3 1-1.5 3-1.5-3-3-1 3-1z" />
      </g>
    </Wrap>
  )
}

export function EmptyCart(props) {
  return (
    <Wrap {...props}>
      {/* Carrito */}
      <g {...base} stroke={ACCENT}>
        <path d="M50 60 h22 l15 75 c1 4 5 7 9 7 h60 c4 0 8-3 9-7 L180 80 H78" />
        <circle cx="98" cy="160" r="9" />
        <circle cx="155" cy="160" r="9" />
      </g>
      {/* Líneas vacío dentro */}
      <g stroke={SOFT} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="2 4">
        <path d="M95 100 h70" />
        <path d="M100 115 h60" />
      </g>
      {/* Burbujas wind */}
      <g {...base} stroke={OLIVE}>
        <path d="M195 80c4-3 4-9 0-12" />
        <path d="M205 95c6-4 6-12 0-16" />
      </g>
    </Wrap>
  )
}

export function EmptyOrders(props) {
  return (
    <Wrap {...props}>
      {/* Caja paquete */}
      <g {...base} stroke={ACCENT}>
        <path d="M70 75 L120 50 L170 75 V145 L120 170 L70 145 Z" />
        <path d="M70 75 L120 100 L170 75" />
        <path d="M120 100 V170" />
        <path d="M95 62 L145 87" strokeDasharray="3 4" stroke={SOFT} />
      </g>
      {/* Cinta */}
      <g {...base} stroke={OLIVE} strokeWidth="2">
        <path d="M70 75 L120 50 L170 75" />
      </g>
      {/* Sombra suelo */}
      <ellipse cx="120" cy="180" rx="50" ry="4" fill={SOFT} opacity="0.15" />
      {/* Sparkle */}
      <g {...base} stroke={OLIVE}>
        <path d="M50 110l1.5 3 3 1-3 1-1.5 3-1.5-3-3-1 3-1z" />
        <path d="M195 60l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
      </g>
    </Wrap>
  )
}

export function ErrorState(props) {
  return (
    <Wrap {...props}>
      {/* Zapato con curita */}
      <g {...base} stroke={ACCENT}>
        <path d="M40 130c12-3 22-9 30-18l16-17c4-4 10-7 16-5l24 7c5 1.5 9 5 11 10l2 5c2 5 6 8 11 10l22 7c6 2 10 7 10 13v6c0 7-6 13-13 13H50c-6 0-10-5-10-10v-21z" />
        <circle cx="60" cy="160" r="2" fill={ACCENT} />
        <circle cx="85" cy="160" r="2" fill={ACCENT} />
        <circle cx="115" cy="160" r="2" fill={ACCENT} />
        <circle cx="145" cy="160" r="2" fill={ACCENT} />
        <circle cx="175" cy="160" r="2" fill={ACCENT} />
      </g>
      {/* Curita */}
      <g transform="rotate(-25 120 90)">
        <rect x="95" y="78" width="50" height="22" rx="11" fill="var(--cream,#F9F5EE)" stroke={OLIVE} strokeWidth="1.6" />
        <path d="M120 84v10" stroke={OLIVE} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M120 88c-1.5 0-2 1-2 1" stroke={OLIVE} strokeWidth="1.4" fill="none" />
        <circle cx="105" cy="89" r="1.2" fill={OLIVE} />
        <circle cx="135" cy="89" r="1.2" fill={OLIVE} />
      </g>
    </Wrap>
  )
}

export function ConstructionState(props) {
  return (
    <Wrap {...props}>
      {/* Trono de conos */}
      <g {...base} stroke={ACCENT}>
        <path d="M100 160 L120 80 L140 160 Z" />
        <path d="M108 130 H132" />
        <path d="M112 115 H128" />
      </g>
      <g {...base} stroke={SOFT}>
        <path d="M60 165 H180" />
      </g>
      <g {...base} stroke={OLIVE}>
        <path d="M70 100l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        <path d="M170 90l1.5 3 3 1-3 1-1.5 3-1.5-3-3-1 3-1z" />
      </g>
    </Wrap>
  )
}

const ILLUS = {
  'empty-search': EmptySearch,
  'empty-cart':   EmptyCart,
  'empty-orders': EmptyOrders,
  'error':        ErrorState,
  'construction': ConstructionState,
}

export default function Illustration({ name, ...props }) {
  const Component = ILLUS[name]
  if (!Component) return null
  return <Component {...props} />
}
