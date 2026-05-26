import './ui.css'

/**
 * Título de sección editorial: eyebrow + serif + línea decorativa.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',  // 'left' | 'center'
  as: Tag = 'h2',
  className = '',
}) {
  return (
    <header className={`zz-heading zz-heading--${align} ${className}`}>
      {eyebrow && <span className="zz-heading__eyebrow eyebrow">{eyebrow}</span>}
      <Tag className="zz-heading__title serif">{title}</Tag>
      {description && <p className="zz-heading__desc">{description}</p>}
      <span className="zz-heading__rule" aria-hidden />
    </header>
  )
}
