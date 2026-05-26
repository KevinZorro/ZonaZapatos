import { motion } from 'framer-motion'
import './ui.css'

/**
 * Botón premium con feedback físico.
 * variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'ink'
 * size:    'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  loading = false,
  className = '',
  type = 'button',
  ...rest
}) {
  const cls = [
    'zz-btn',
    `zz-btn--${variant}`,
    `zz-btn--${size}`,
    fullWidth ? 'zz-btn--full' : '',
    loading ? 'is-loading' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <motion.button
      type={type}
      className={cls}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="zz-btn__spinner" />}
      {!loading && iconLeft && <span className="zz-btn__icon">{iconLeft}</span>}
      <span className="zz-btn__label">{children}</span>
      {!loading && iconRight && <span className="zz-btn__icon">{iconRight}</span>}
    </motion.button>
  )
}
