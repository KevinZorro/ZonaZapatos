import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'

const MOTIVOS_DEVOLUCION = [
  "Producto dañado",
  "Talla/Color incorrecto", 
  "No era lo esperado",
  "Calidad inferior a la esperada",
  "Producto defectuoso",
  "Otro"
]

function formatPrice(price) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(price)
}

export default function SolicitudDevolucionPage() {
  const { pedidoId } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [motivo, setMotivo] = useState('')
  const [comentario, setComentario] = useState('')
  const [evidencias, setEvidencias] = useState([])
  const [previewImages, setPreviewImages] = useState([])
  
  // Verificar autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    const token = localStorage.getItem('zz_token')
    setIsAuthenticated(!!token)
  }, [])

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const { data } = await api.get(`/pedidos/${pedidoId}`)
        setPedido(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar el pedido')
      } finally {
        setLoading(false)
      }
    }
    fetchPedido()
  }, [pedidoId])

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    
    // Validar que sean imágenes
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) {
      setError('Solo se permiten archivos de imagen')
      return
    }

    // Limitar a 5 imágenes
    if (evidencias.length + validFiles.length > 5) {
      setError('Máximo 5 imágenes permitidas')
      return
    }

    setEvidencias([...evidencias, ...validFiles])
    setError('')

    // Crear previews
    const newPreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }))
    setPreviewImages([...previewImages, ...newPreviews])
  }

  const removeImage = (index) => {
    const newEvidencias = evidencias.filter((_, i) => i !== index)
    const newPreviews = previewImages.filter((_, i) => i !== index)
    
    // Limpiar URL object
    if (previewImages[index]) {
      URL.revokeObjectURL(previewImages[index].url)
    }
    
    setEvidencias(newEvidencias)
    setPreviewImages(newPreviews)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (!motivo) {
      setError('Selecciona un motivo para la devolución')
      return
    }

    if (evidencias.length === 0) {
      setError('Debes adjuntar al menos una foto como evidencia')
      return
    }

    if (evidencias.length > 5) {
      setError('Máximo 5 imágenes permitidas')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Verificar que el usuario esté autenticado
      const token = localStorage.getItem('zz_token')
      if (!token) {
        setError('Debes iniciar sesión para solicitar una devolución')
        setSubmitting(false)
        return
      }
      
      // Validar que los campos requeridos estén definidos
      if (!pedidoId) {
        setError('ID del pedido no encontrado')
        setSubmitting(false)
        return
      }
      
      if (!motivo || motivo === '') {
        setError('Debes seleccionar un motivo para la devolución')
        setSubmitting(false)
        return
      }

      console.log('DEBUG: Enviando solicitud con pedidoId:', pedidoId, 'motivo:', motivo)
      
      const formData = new FormData()
      formData.append('pedido_id', pedidoId)
      formData.append('motivo', motivo)
      if (comentario) {
        formData.append('comentario', comentario)
      }
      
      evidencias.forEach(file => {
        formData.append('evidencias', file)
      })

      console.log('DEBUG: FormData preparado con', formData.getAll('evidencias').length, 'evidencias')
      await api.post('/devoluciones/', formData)

      setSuccess(true)
      
      // Limpiar previews
      previewImages.forEach(preview => URL.revokeObjectURL(preview.url))

    } catch (err) {
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al enviar la solicitud'
      
      if (err.response?.status === 401) {
        errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
      } else if (err.response?.status === 404) {
        errorMessage = 'Pedido no encontrado o no tienes permiso para verlo.'
      } else if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(d => d.msg).join(', ')
        } else {
          errorMessage = JSON.stringify(err.response.data)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      console.error('Error completo:', err)
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-400">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-600 rounded-full animate-spin" />
      <p className="text-sm">Cargando información del pedido...</p>
    </div>
  )
  
  if (!isAuthenticated) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <span className="text-5xl">🔒</span>
      <h2 className="text-lg font-bold text-gray-800">Debes iniciar sesión</h2>
      <p className="text-gray-600">Para solicitar una devolución, primero debes iniciar sesión con tu cuenta.</p>
      <button
        onClick={() => navigate('/login')}
        className="px-6 py-2.5 bg-pink-600 text-white text-sm font-bold rounded-full hover:opacity-80 transition"
      >
        Iniciar sesión
      </button>
    </div>
  )

  if (error && !pedido) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <span className="text-5xl">??</span>
      <h2 className="text-lg font-bold text-gray-800">{error}</h2>
      <button
        onClick={() => navigate('/pedidos')}
        className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition"
      >
        Volver a mis pedidos
      </button>
    </div>
  )

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
      >
        <span className="text-3xl">??</span>
      </motion.div>
      <div>
        <h2 className="text-xl font-bold text-gray-800">Solicitud enviada</h2>
        <p className="text-sm text-gray-400 mt-2">
          Tu solicitud de devolución ha sido recibida y está en proceso de revisión.
          Te notificaremos sobre el estado de tu solicitud.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/pedidos')}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:opacity-80 transition"
        >
          Ver mis pedidos
        </button>
        <button
          onClick={() => navigate(`/pedidos/${pedidoId}`)}
          className="px-6 py-2.5 bg-pink-600 text-white text-sm font-bold rounded-full hover:bg-pink-700 transition"
        >
          Ver pedido
        </button>
      </div>
    </div>
  )

  if (!pedido) return null

  return (
    <div className="flex justify-center bg-gray-50 px-4" style={{ paddingTop: 'calc(var(--nav-h) + 2rem)', paddingBottom: '4rem' }}>
      <div className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/pedidos" className="text-pink-600 font-medium hover:underline">
            Mis pedidos
          </Link>
          <span>/</span>
          <Link to={`/pedidos/${pedidoId}`} className="text-pink-600 font-medium hover:underline">
            Pedido #{pedidoId}
          </Link>
          <span>/</span>
          <span>Solicitar devolución</span>
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6"
        >
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Solicitar Devolución</h1>
            <p className="text-sm text-gray-400 mt-1">
              Cuéntanos qué pasó con tu pedido para poder ayudarte
            </p>
          </div>
        </motion.div>

        {/* Info del pedido */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Pedido #{pedidoId}
            </h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fecha del pedido</p>
                <p className="text-sm font-semibold text-gray-700">
                  {new Date(pedido.fecha_pedido).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-black text-gray-900">{formatPrice(pedido.total)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Formulario */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Detalles de la devolución
            </h2>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Motivo */}
            <div>
              <label 
                htmlFor="motivo-devolucion"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Motivo de la devolución <span className="text-red-500">*</span>
              </label>
              <select
                id="motivo-devolucion"
                name="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              >
                <option value="">Selecciona un motivo</option>
                {MOTIVOS_DEVOLUCION.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Comentarios */}
            <div>
              <label 
                htmlFor="comentarios-devolucion"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Comentarios adicionales
              </label>
              <textarea
                id="comentarios-devolucion"
                name="comentarios"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Describe con más detalle lo que sucedió..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Evidencias */}
            <div>
              <label 
                htmlFor="evidencias-upload"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Evidencias fotográficas <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Adjunta fotos que muestren el problema. Máximo 5 imágenes.
              </p>
              
              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-pink-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="evidencias-upload"
                  name="evidencias"
                />
                <label
                  htmlFor="evidencias-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
                >
                  <span>??</span>
                  Seleccionar imágenes
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  o arrastra y suelta las imágenes aquí
                </p>
              </div>

              {/* Preview images */}
              {previewImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview.url}
                        alt={`Evidencia ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600">
                  {typeof error === 'string' ? error : JSON.stringify(error)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate(`/pedidos/${pedidoId}`)}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-red-600 text-white text-sm font-bold rounded-full hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ 
                  backgroundColor: '#dc2626', 
                  color: '#ffffff',
                  border: '2px solid #dc2626',
                  fontWeight: '700',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </motion.form>

        {/* Espacio adicional para asegurar visibilidad de botones */}
        <div className="h-8"></div>

      </div>
    </div>
  )
}
