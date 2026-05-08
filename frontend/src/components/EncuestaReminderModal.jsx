import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './EncuestaReminderModal.css'

export default function EncuestaReminderModal({ encuesta, onClose }) {
  const navigate = useNavigate()

  if (!encuesta) return null

  const productoNombre = encuesta?.producto?.nombre || 'tu compra'

  const handleResponder = () => {
    navigate(`/encuestas/${encuesta.id}`)
    onClose()
  }

  const handleOmitir = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="encuesta-modal-overlay">
        <motion.div
          className="encuesta-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="encuesta-modal-header">
            <span className="encuesta-modal-icon">📋</span>
            <h2>Tienes una encuesta pendiente</h2>
          </div>

          <div className="encuesta-modal-body">
            <p>
              Nos gustaría conocer tu opinión sobre <strong>{productoNombre}</strong>.
            </p>
            <p className="encuesta-modal-subtext">
              Tu calificación nos ayuda a mejorar nuestros productos y servicio.
            </p>

            {encuesta.recordatorio_activo && (
              <div className="encuesta-modal-reminder">
                <span>⏰</span> Encuesta omitida anteriormente - te recordamos responder
              </div>
            )}
          </div>

          <div className="encuesta-modal-actions">
            <button
              onClick={handleResponder}
              className="encuesta-modal-btn encuesta-modal-btn--primary"
            >
              Responder ahora
            </button>
            <button
              onClick={handleOmitir}
              className="encuesta-modal-btn encuesta-modal-btn--secondary"
            >
              Recordar más tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
