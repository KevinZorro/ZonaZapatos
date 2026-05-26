import { motion } from 'framer-motion'

/**
 * Envuelve cualquier página para tener transición fade + slide vertical sutil.
 * Funciona con AnimatePresence mode="wait" en App.jsx.
 */
export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}
