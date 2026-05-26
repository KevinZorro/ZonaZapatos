/* ============================================
   ZONA ZAPATOS — Icon set (line-art, orgánico)
   Uso:  <Icon name="shoe" size={24} />
         <Icon name="cart" />
   Todos los íconos heredan `currentColor` y stroke 1.5
   ============================================ */

const STROKE = 1.6

const wrap = (children, label) => (props) => {
  const { size = 22, color, strokeWidth = STROKE, className = '', ...rest } = props
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`zz-icon ${className}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---------- Brand ---------- */
export const ShoeIcon = wrap(
  <>
    <path d="M3 15c1.2-.4 2.3-1 3.2-1.9l3-3c.5-.5 1.2-.8 1.9-.6l3.5 1c.7.2 1.3.7 1.6 1.4l.4.9c.3.7.9 1.2 1.6 1.4l3.3 1c.8.2 1.3 1 1.3 1.8v.9c0 1.2-1 2.1-2.1 2.1H4.4C3.6 20 3 19.4 3 18.6V15z" />
    <path d="M8 13.5l1.2-3.2c.3-.7 1-1.2 1.8-1.2" />
    <path d="M14 11l-.7-2.5c-.2-.7.1-1.5.7-1.9l1.5-1" />
    <circle cx="6.5" cy="17" r=".5" fill="currentColor" />
    <circle cx="10" cy="17" r=".5" fill="currentColor" />
    <circle cx="14" cy="17" r=".5" fill="currentColor" />
    <circle cx="18" cy="17" r=".5" fill="currentColor" />
  </>, 'Zapato'
)

/* ---------- UI ---------- */
export const SearchIcon = wrap(
  <>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m20 20-4.6-4.6" />
  </>, 'Buscar'
)

export const BellIcon = wrap(
  <>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.2c.3.4 0 1-.5 1h-14c-.5 0-.8-.6-.5-1L6 16z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </>, 'Notificaciones'
)

export const CartIcon = wrap(
  <>
    <path d="M3 4h2l2.4 11.3c.2.8.9 1.4 1.7 1.4h8.4c.8 0 1.5-.6 1.7-1.4L21 8H6" />
    <circle cx="10" cy="20" r="1.2" />
    <circle cx="17" cy="20" r="1.2" />
  </>, 'Carrito'
)

export const UserIcon = wrap(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
  </>, 'Usuario'
)

export const HeartIcon = wrap(
  <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z" />, 'Favorito'
)

export const StarIcon = wrap(
  <path d="m12 3.5 2.5 5.4 5.9.7-4.4 4.1 1.2 5.8L12 16.8 6.8 19.5 8 13.7 3.6 9.6l5.9-.7z" />, 'Estrella'
)

export const StarFilledIcon = (props) => {
  const { size = 18, color = 'currentColor', className = '', ...rest } = props
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill={color} className={`zz-icon ${className}`} {...rest}>
      <path d="m12 3.5 2.5 5.4 5.9.7-4.4 4.1 1.2 5.8L12 16.8 6.8 19.5 8 13.7 3.6 9.6l5.9-.7z" />
    </svg>
  )
}

export const CloseIcon = wrap(
  <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>, 'Cerrar'
)

export const MenuIcon = wrap(
  <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>, 'Menú'
)

export const FilterIcon = wrap(
  <>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
    <circle cx="9" cy="6" r="1.5" fill="var(--cream,#fff)" />
    <circle cx="15" cy="12" r="1.5" fill="var(--cream,#fff)" />
    <circle cx="11" cy="18" r="1.5" fill="var(--cream,#fff)" />
  </>, 'Filtros'
)

export const CheckIcon = wrap(
  <path d="M5 12.5l4.5 4.5L19 7.5" />, 'OK'
)

export const PlusIcon = wrap(
  <><path d="M12 5v14" /><path d="M5 12h14" /></>, 'Más'
)

export const MinusIcon = wrap(
  <path d="M5 12h14" />, 'Menos'
)

export const ArrowRightIcon = wrap(
  <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>, 'Siguiente'
)

export const ArrowLeftIcon = wrap(
  <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>, 'Anterior'
)

export const ChevronDownIcon = wrap(<path d="M6 9l6 6 6-6" />, 'Desplegar')
export const ChevronUpIcon   = wrap(<path d="M6 15l6-6 6 6" />, 'Cerrar')
export const ChevronRightIcon = wrap(<path d="M9 6l6 6-6 6" />, 'Más')
export const ChevronLeftIcon  = wrap(<path d="M15 6l-6 6 6 6" />, 'Volver')

/* ---------- Domain ---------- */
export const StoreIcon = wrap(
  <>
    <path d="M4 9l1.5-4h13L20 9" />
    <path d="M4 9v10h16V9" />
    <path d="M4 9c0 1.6 1.3 2.5 2.7 2.5S9.3 10.6 9.3 9" />
    <path d="M9.3 9c0 1.6 1.3 2.5 2.7 2.5S14.7 10.6 14.7 9" />
    <path d="M14.7 9c0 1.6 1.3 2.5 2.7 2.5S20 10.6 20 9" />
    <path d="M10 19v-5h4v5" />
  </>, 'Tienda'
)

export const TagIcon = wrap(
  <>
    <path d="M3 12V4h8l10 10-8 8L3 12z" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" />
  </>, 'Categoría'
)

export const ARGlassesIcon = wrap(
  <>
    <circle cx="7" cy="13" r="3.5" />
    <circle cx="17" cy="13" r="3.5" />
    <path d="M10.5 13c.7-.7 2.3-.7 3 0" />
    <path d="M3 11l1.5-3h4" />
    <path d="M21 11l-1.5-3h-4" />
    <path d="M9 6.5l1.5-1.5h3L15 6.5" />
  </>, 'AR'
)

export const PackageIcon = wrap(
  <>
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" />
    <path d="M3.5 7.5 12 12l8.5-4.5" />
    <path d="M12 12v9" />
    <path d="M7.5 5.2l8.5 4.6" />
  </>, 'Paquete'
)

export const LocationIcon = wrap(
  <>
    <path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>, 'Ubicación'
)

export const TruckIcon = wrap(
  <>
    <path d="M3 16V6h11v10" />
    <path d="M14 9h4l3 3v4h-7" />
    <circle cx="7.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>, 'Envío'
)

export const SparkleIcon = wrap(
  <>
    <path d="M12 4l1.4 4.2L17.5 10l-4.1 1.4L12 16l-1.4-4.6L6.5 10l4.1-1.4L12 4z" />
    <path d="M19 4l.6 1.6L21 6l-1.4.6L19 8l-.6-1.4L17 6l1.4-.4z" />
    <path d="M5 16l.6 1.6L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.4z" />
  </>, 'Premium'
)

export const LogoutIcon = wrap(
  <>
    <path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
    <path d="M9 12h12" />
    <path d="M17 8l4 4-4 4" />
  </>, 'Salir'
)

export const EditIcon = wrap(
  <>
    <path d="M4 20h4l10-10-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </>, 'Editar'
)

export const TrashIcon = wrap(
  <>
    <path d="M4 7h16" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4h6v3" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>, 'Eliminar'
)

export const EyeIcon = wrap(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>, 'Ver'
)

export const InfoIcon = wrap(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5" />
    <circle cx="12" cy="8" r=".7" fill="currentColor" />
  </>, 'Información'
)

export const WarningIcon = wrap(
  <>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r=".8" fill="currentColor" />
  </>, 'Atención'
)

export const SunIcon = wrap(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.9 4.9 1.4 1.4" />
    <path d="m17.7 17.7 1.4 1.4" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.9 19.1 1.4-1.4" />
    <path d="m17.7 6.3 1.4-1.4" />
  </>, 'Modo claro'
)

export const MoonIcon = wrap(
  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  'Modo oscuro'
)

/* ---------- Dispatcher ---------- */
const ICONS = {
  shoe: ShoeIcon,
  search: SearchIcon,
  bell: BellIcon,
  cart: CartIcon,
  user: UserIcon,
  heart: HeartIcon,
  star: StarIcon,
  'star-filled': StarFilledIcon,
  close: CloseIcon,
  menu: MenuIcon,
  filter: FilterIcon,
  check: CheckIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': ArrowLeftIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-left': ChevronLeftIcon,
  store: StoreIcon,
  tag: TagIcon,
  ar: ARGlassesIcon,
  package: PackageIcon,
  location: LocationIcon,
  truck: TruckIcon,
  sparkle: SparkleIcon,
  logout: LogoutIcon,
  edit: EditIcon,
  trash: TrashIcon,
  eye: EyeIcon,
  info: InfoIcon,
  warning: WarningIcon,
  sun: SunIcon,
  moon: MoonIcon,
}

export default function Icon({ name, ...props }) {
  const Component = ICONS[name]
  if (!Component) {
    if (typeof window !== 'undefined') console.warn(`[Icon] no existe: "${name}"`)
    return null
  }
  return <Component {...props} />
}
