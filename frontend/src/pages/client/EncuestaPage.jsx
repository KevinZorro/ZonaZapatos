import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getEncuesta, responderEncuesta, omitirEncuesta } from '../../services/encuestas'
import './EncuestaPage.css'

export default function EncuestaPage() {
  const { encuestaId } = useParams()
  const navigate = useNavigate()
  const [encuesta, setEncuesta] = useState(null)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function cargarEncuesta() {
      try {
        const data = await getEncuesta(encuestaId)
        if (data.respondida) {
          setError('Esta encuesta ya ha sido respondida')
        } else {
          setEncuesta(data)
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar la encuesta')
      } finally {
        setLoading(false)
      }
    }
    cargarEncuesta()
  }, [encuestaId])

  const handleEnviar = async () => {
    if (calificacion === 0) {
      setError('Por favor selecciona una calificación de 1 a 5 estrellas')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await responderEncuesta(encuestaId, calificacion, comentario || null)
      setSuccess(true)
      setTimeout(() => navigate('/pedidos'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar la encuesta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOmitir = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await omitirEncuesta(encuestaId)
      navigate('/pedidos')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al omitir la encuesta')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="encuesta-page">
        <div className="encuesta-container">
          <div className="encuesta-loading">Cargando encuesta...</div>
        </div>
      </div>
    )
  }

  if (error && !encuesta) {
    return (
      <div className="encuesta-page">
        <div className="encuesta-container">
          <div className="encuesta-error">
            <span className="encuesta-error-icon">⚠️</span>
            <p>{error}</p>
            <button onClick={() => navigate('/pedidos')} className="encuesta-btn--primary">
              Volver a mis pedidos
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="encuesta-page">
        <motion.div
          className="encuesta-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="encuesta-success">
            <span className="encuesta-success-icon">🎉</span>
            <h2>¡Gracias por tu opinión!</h2>
            <p>Tu calificación nos ayuda a mejorar nuestros productos y servicio.</p>
            <p className="encuesta-redirect">Redirigiendo a tus pedidos...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  const productoNombre = encuesta?.producto?.nombre || 'tu compra'

  return (
    <div className="encuesta-page">
      <motion.div
        className="encuesta-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="encuesta-header">
          <span className="encuesta-icon">⭐</span>
          <h1>Encuesta de Satisfacción</h1>
          <p className="encuesta-subtitle">
            Cuéntanos tu experiencia con <strong>{productoNombre}</strong>
          </p>
        </div>

        <div className="encuesta-form">
          <div className="encuesta-stars-section">
            <label className="encuesta-label">¿Cómo calificas tu experiencia?</label>
            <div className="encuesta-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`encuesta-star ${star <= calificacion ? 'encuesta-star--active' : ''}`}
                  onClick={() => setCalificacion(star)}
                  disabled={submitting}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="encuesta-stars-labels">
              <span>Mala</span>
              <span>Excelente</span>
            </div>
          </div>

          <div className="encuesta-comment-section">
            <label className="encuesta-label" htmlFor="comentario">
              Comentario opcional
            </label>
            <textarea
              id="comentario"
              className="encuesta-textarea"
              rows={4}
              placeholder="Cuéntanos más sobre el producto y el proceso de compra..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <span className="encuesta-char-count">{comentario.length}/500</span>
          </div>

          {error && (
            <div className="encuesta-error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="encuesta-actions">
            <button
              onClick={handleEnviar}
              disabled={submitting}
              className="encuesta-btn encuesta-btn--primary"
            >
              {submitting ? 'Enviando...' : 'Enviar calificación'}
            </button>
            <button
              onClick={handleOmitir}
              disabled={submitting}
              className="encuesta-btn encuesta-btn--secondary"
            >
              Omitir por ahora
            </button>
          </div>
        </div>

        <div className="encuesta-info">
          <p>Pedido #{encuesta?.pedido_id}</p>
        </div>
      </motion.div>
    </div>
  )
}
