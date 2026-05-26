import './ui.css'

/**
 * Chip orgánico: pill que puede ser estática o seleccionable (checkbox visual).
 */
export default function Chip({
  children,
  active = false,
  onClick,
  icon,
  tone = 'neutral',  // neutral | magenta | olive | danger | success
  size = 'md',       // sm | md
  className = '',
  ...rest
}) {
  const cls = [
    'zz-chip',
    `zz-chip--${tone}`,
    `zz-chip--${size}`,
    active ? 'is-active' : '',
    onClick ? 'is-clickable' : '',
    className,
  ].filter(Boolean).join(' ')

  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag className={cls} onClick={onClick} {...rest}>
      {icon && <span className="zz-chip__icon">{icon}</span>}
      <span className="zz-chip__label">{children}</span>
    </Tag>
  )
}
