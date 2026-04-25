import api from './api'

export async function getEncuestaPendiente() {
  const { data } = await api.get('/encuestas/pendiente')
  return data
}

export async function getEncuesta(encuestaId) {
  const { data } = await api.get(`/encuestas/${encuestaId}`)
  return data
}

export async function responderEncuesta(encuestaId, calificacion, comentario) {
  const { data } = await api.post(`/encuestas/${encuestaId}/responder`, {
    calificacion,
    comentario,
  })
  return data
}

export async function omitirEncuesta(encuestaId) {
  const { data } = await api.post(`/encuestas/${encuestaId}/omitir`)
  return data
}

export async function getResenasProducto(productoId) {
  const { data } = await api.get(`/productos/${productoId}/resenas`)
  return data
}

export async function getEncuestaPendientePorProducto(productoId) {
  const { data } = await api.get(`/encuestas/producto/${productoId}`)
  return data
}

export async function getEncuestasRespondidasPorPedido(pedidoId) {
  const { data } = await api.get(`/encuestas/pedido/${pedidoId}/respondidas`)
  return data
}

export async function actualizarEncuesta(encuestaId, calificacion, comentario) {
  const { data } = await api.put(`/encuestas/${encuestaId}`, {
    calificacion,
    comentario,
  })
  return data
}

export async function eliminarEncuesta(encuestaId) {
  await api.delete(`/encuestas/${encuestaId}`)
}
