import { motion } from 'framer-motion'
import Illustration from '../../assets/icons/illustrations'
import './ui.css'

/**
 * Empty state ilustrado y editorial.
 * illustration: 'empty-search' | 'empty-cart' | 'empty-orders' | 'error' | 'construction'
 */
export default function EmptyState({
  illustration = 'empty-search',
  title,
  description,
  actions,
  tone = 'magenta',  // color del trazo de la ilustración
  illustrationSize = 220,
}) {
  const colorMap = {
    magenta: 'var(--magenta)',
    olive:   'var(--olive)',
    dark:    'var(--ink)',
  }

  return (
    <motion.div
      className="zz-empty"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="zz-empty__illu" style={{ color: colorMap[tone] || colorMap.magenta }}>
        <Illustration name={illustration} size={illustrationSize} />
      </div>
      {title && <h3 className="zz-empty__title">{title}</h3>}
      {description && <p className="zz-empty__desc">{description}</p>}
      {actions && <div className="zz-empty__actions">{actions}</div>}
    </motion.div>
  )
}
