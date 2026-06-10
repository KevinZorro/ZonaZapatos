import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'

const MOTIVOS_DEVOLUCION = [
  "Producto dañado",
  "Talla/Color incorrecto", 
  "No era lo esperado",
  "Calidad inferior a la esperada",
  "Producto defectuoso",
  "Otro"
]

const MOTIVOS_RETRACTO = ["Talla/Color incorrecto", "No era lo esperado", "Otro"]
const MOTIVOS_GARANTIA = ["Producto dañado", "Producto defectuoso", "Calidad inferior a la esperada", "Otro"]

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
  const [selectedItems, setSelectedItems] = useState([])  // Items seleccionados para devolver
  const [comentarioGeneral, setComentarioGeneral] = useState('')  // Comentario general opcional
  const [evidencias, setEvidencias] = useState([])
  const [previewImages, setPreviewImages] = useState([])
  const fileInputRef = useRef(null)  // Ref para limpiar el input file

  // Disponibilidad de devolución por producto
  const [disponibilidad, setDisponibilidad] = useState(null)
  
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
        // Inicializar selectedItems con todos los productos del pedido (no seleccionados)
        // Buscar el nombre del producto en múltiples campos posibles (snapshot o relación)
        const initialItems = data.items?.map(item => {
          // Intentar obtener el nombre de varias fuentes posibles
          const nombreProducto = item.producto_nombre_snapshot 
            || item.producto_nombre 
            || item.producto?.nombre 
            || item.nombre_producto 
            || 'Producto sin nombre'
          
          // Intentar obtener la imagen de varias fuentes posibles
          const imagenProducto = item.producto_imagen_url_snapshot
            || item.producto_imagen_url
            || item.producto?.imagen_url
            || item.imagen_url
            || null
          
          return {
            item_pedido_id: item.id,
            producto_nombre: nombreProducto,
            producto_imagen_url: imagenProducto,
            cantidad_comprada: item.cantidad,
            cantidad_a_devolver: 1,
            seleccionado: false,
            motivo: '',
            comentario: ''
          }
        }) || []
        setSelectedItems(initialItems)
      } catch (err) {
        setError(err.response?.data?.detail || 'No se pudo cargar el pedido')
      } finally {
        setLoading(false)
      }
    }
    fetchPedido()
    // Cargar disponibilidad de devolución por producto
    api.get(`/devoluciones/pedido/${pedidoId}/disponibilidad`)
      .then(({ data }) => setDisponibilidad(data))
      .catch(() => {})
  }, [pedidoId])

  // Funciones para manejar items
  const toggleItemSeleccionado = (itemId) => {
    setSelectedItems(prev => prev.map(item => 
      item.item_pedido_id === itemId 
        ? { ...item, seleccionado: !item.seleccionado }
        : item
    ))
  }

  const updateItemMotivo = (itemId, motivo) => {
    setSelectedItems(prev => prev.map(item => 
      item.item_pedido_id === itemId 
        ? { ...item, motivo }
        : item
    ))
  }

  const updateItemComentario = (itemId, comentario) => {
    setSelectedItems(prev => prev.map(item => 
      item.item_pedido_id === itemId 
        ? { ...item, comentario }
        : item
    ))
  }

  const updateItemCantidad = (itemId, cantidad) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.item_pedido_id === itemId) {
        const cantidadNum = Math.max(1, Math.min(parseInt(cantidad) || 1, item.cantidad_comprada))
        return { ...item, cantidad_a_devolver: cantidadNum }
      }
      return item
    }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    
    // Validar que sean imágenes
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) {
      setError('Solo se permiten archivos de imagen')
      // Limpiar el input para permitir volver a seleccionar
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Limitar a 5 imágenes
    if (evidencias.length + validFiles.length > 5) {
      setError('Máximo 5 imágenes permitidas')
      // Limpiar el input para permitir volver a seleccionar
      if (fileInputRef.current) fileInputRef.current.value = ''
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
    
    // Limpiar el input para permitir volver a seleccionar los mismos archivos
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    const itemsSeleccionados = selectedItems.filter(item => item.seleccionado)
    
    if (itemsSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un producto para devolver')
      return
    }

    // Validar que todos los items seleccionados tengan motivo
    const itemsSinMotivo = itemsSeleccionados.filter(item => !item.motivo)
    if (itemsSinMotivo.length > 0) {
      setError(`Debes seleccionar un motivo para: ${itemsSinMotivo.map(i => i.producto_nombre).join(', ')}`)
      return
    }

    // Validar que si el motivo es "Otro", el comentario sea obligatorio
    const itemsOtroSinComentario = itemsSeleccionados.filter(item => item.motivo === 'Otro' && !item.comentario?.trim())
    if (itemsOtroSinComentario.length > 0) {
      setError(`Debes explicar el motivo en el comentario para: ${itemsOtroSinComentario.map(i => i.producto_nombre).join(', ')}`)
      return
    }

    // Validar disponibilidad por producto y motivo
    if (disponibilidad && disponibilidad.items) {
      const erroresDisponibilidad = []
      for (const item of itemsSeleccionados) {
        const disp = disponibilidad.items.find(d => d.item_pedido_id === item.item_pedido_id)
        if (disp) {
          const esRetracto = MOTIVOS_RETRACTO.includes(item.motivo)
          const esGarantia = MOTIVOS_GARANTIA.includes(item.motivo)
          
          if (esRetracto && !disp.retracto_disponible) {
            erroresDisponibilidad.push(`${item.producto_nombre}: motivo "${item.motivo}" no disponible (retracto expirado hace ${Math.abs(disp.dias_restantes_retracto)} días)`)
          }
          if (esGarantia && !disp.garantia_disponible) {
            erroresDisponibilidad.push(`${item.producto_nombre}: motivo "${item.motivo}" no disponible (garantía expirada hace ${Math.abs(disp.dias_restantes_garantia)} días)`)
          }
        }
      }
      if (erroresDisponibilidad.length > 0) {
        setError(erroresDisponibilidad.join('; '))
        return
      }
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
      
      // Preparar items para enviar
      const itemsParaEnviar = itemsSeleccionados.map(item => ({
        item_pedido_id: item.item_pedido_id,
        cantidad: item.cantidad_a_devolver,
        motivo: item.motivo,
        comentario: item.comentario || undefined
      }))

      console.log('DEBUG: Enviando solicitud con items:', itemsParaEnviar)
      
      const formData = new FormData()
      formData.append('pedido_id', pedidoId)
      formData.append('items', JSON.stringify(itemsParaEnviar))
      if (comentarioGeneral) {
        formData.append('comentario_general', comentarioGeneral)
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

        {/* Banner disponibilidad de devolución */}
        {disponibilidad && disponibilidad.items && disponibilidad.items.length > 0 && (
          <div className="mb-6 px-4 py-3 rounded-xl border text-sm bg-blue-50 border-blue-200 text-blue-800">
            <div className="font-medium mb-1">📋 Disponibilidad por producto:</div>
            <div className="space-y-1 text-xs">
              {disponibilidad.items.map((item) => (
                <div key={item.item_pedido_id} className="flex gap-4 flex-wrap">
                  <span className="font-medium">{item.producto_nombre}</span>
                  <span className={item.retracto_disponible ? 'text-green-700' : 'text-red-700'}>
                    🔄 Retracto: {item.retracto_disponible ? `${item.dias_restantes_retracto} días` : `Expirado`}
                  </span>
                  <span className={item.garantia_disponible ? 'text-green-700' : 'text-red-700'}>
                    🛡️ Garantía: {item.garantia_disponible ? `${item.dias_restantes_garantia} días` : `Expirada`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
            {/* Productos a devolver */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Selecciona los productos a devolver <span className="text-red-500">*</span>
              </label>
              <div className="space-y-4">
                {selectedItems.map((item) => (
                  <div 
                    key={item.item_pedido_id}
                    className={`border rounded-xl p-4 transition-colors ${item.seleccionado ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id={`item-${item.item_pedido_id}`}
                        checked={item.seleccionado}
                        onChange={() => toggleItemSeleccionado(item.item_pedido_id)}
                        className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {item.producto_imagen_url ? (
                          <img 
                            src={item.producto_imagen_url} 
                            alt={item.producto_nombre}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-xl">👟</span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{item.producto_nombre}</h4>
                          <p className="text-sm text-gray-500">Cantidad comprada: {item.cantidad_comprada}</p>
                        </div>
                      </div>
                    </div>
                    
                    {item.seleccionado && (
                      <div className="pl-8 space-y-3 mt-3 border-t border-pink-200 pt-3">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Cantidad a devolver <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={item.cantidad_comprada}
                              value={item.cantidad_a_devolver}
                              onChange={(e) => updateItemCantidad(item.item_pedido_id, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                          <div className="flex-[2]">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Motivo <span className="text-red-500">*</span>
                            </label>
                              <select
                                value={item.motivo}
                                onChange={(e) => updateItemMotivo(item.item_pedido_id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                              >
                                <option value="">Selecciona motivo</option>
                                {(() => {
                                  const disp = disponibilidad?.items?.find(d => d.item_pedido_id === item.item_pedido_id)
                                  const retractoExpirado = disp && !disp.retracto_disponible
                                  const garantiaExpirada = disp && !disp.garantia_disponible
                                  const ambosExpirados = retractoExpirado && garantiaExpirada
                                  return (
                                    <>
                                      <optgroup label="🔄 Retracto (arrepentimiento)">
                                        {MOTIVOS_RETRACTO.map(m => {
                                          const esOtro = m === "Otro"
                                          const deshabilitado = disp && (esOtro ? ambosExpirados : retractoExpirado)
                                          return (
                                            <option key={`ret-${m}`} value={m} disabled={deshabilitado} style={deshabilitado ? { color: '#9ca3af' } : {}}>
                                              {m} {deshabilitado ? ' ⛔' : ''}
                                            </option>
                                          )
                                        })}
                                      </optgroup>
                                      <optgroup label="🛡️ Garantía (defecto/fábrica)">
                                        {MOTIVOS_GARANTIA.map(m => {
                                          const esOtro = m === "Otro"
                                          const deshabilitado = disp && (esOtro ? ambosExpirados : garantiaExpirada)
                                          return (
                                            <option key={`gar-${m}`} value={m} disabled={deshabilitado} style={deshabilitado ? { color: '#9ca3af' } : {}}>
                                              {m} {deshabilitado ? ' ⛔' : ''}
                                            </option>
                                          )
                                        })}
                                      </optgroup>
                                    </>
                                  )
                                })()}
                              </select>
                            {disponibilidad?.items && (() => {
                              const disp = disponibilidad.items.find(d => d.item_pedido_id === item.item_pedido_id)
                              if (!disp) return null
                              const retractoExpirado = !disp.retracto_disponible
                              const garantiaExpirada = !disp.garantia_disponible
                              return (
                                <>
                                  <p className="text-xs mt-1 flex gap-3">
                                    <span className={disp.retracto_disponible ? 'text-green-600' : 'text-red-600'}>
                                      🔄 Retracto: {disp.retracto_disponible ? `${disp.dias_restantes_retracto} días` : `Expirado`}
                                    </span>
                                    <span className={disp.garantia_disponible ? 'text-green-600' : 'text-red-600'}>
                                      🛡️ Garantía: {disp.garantia_disponible ? `${disp.dias_restantes_garantia} días` : `Expirada`}
                                    </span>
                                  </p>
                                  {(retractoExpirado || garantiaExpirada) && (
                                    <p className="text-xs text-amber-600 mt-1">
                                      ⚠️ {retractoExpirado && garantiaExpirada
                                        ? 'Retracto y garantía expirados — solo aplican motivos generales.'
                                        : retractoExpirado
                                          ? 'Retracto expirado — los motivos de retracto no están disponibles.'
                                          : 'Garantía expirada — los motivos de garantía no están disponibles.'}
                                    </p>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Comentario adicional {item.motivo === 'Otro' ? <span className="text-red-500">*</span> : '(opcional)'}
                          </label>
                          <textarea
                            value={item.comentario}
                            onChange={(e) => updateItemComentario(item.item_pedido_id, e.target.value)}
                            placeholder={`¿Qué pasó con ${item.producto_nombre}?`}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                          />
                          {item.motivo === 'Otro' && !item.comentario && (
                            <p className="text-xs text-red-500 mt-1">Especifica el motivo en el comentario</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Comentario general */}
            <div>
              <label 
                htmlFor="comentario-general"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Comentario general (opcional)
              </label>
              <textarea
                id="comentario-general"
                value={comentarioGeneral}
                onChange={(e) => setComentarioGeneral(e.target.value)}
                placeholder="Algún comentario adicional sobre toda la devolución..."
                rows={3}
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
                  ref={fileInputRef}
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
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110"
                        title="Eliminar imagen"
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
