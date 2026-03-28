import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ARViewer from '../components/ARViewer'

const API_BASE_URL = import.meta.env.VITE_API_URL

function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/productos/${id}`)
        if (!response.ok) {
          throw new Error('No se pudo cargar el producto')
        }
        const data = await response.json()
        setProduct(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (loading) return <p>Cargando producto...</p>
  if (error) return <p>{error}</p>
  if (!product) return <p>No hay producto</p>

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: '24px' }}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <ARViewer modelSrc={product.modelUrl} title={product.name} />
    </div>
  )
}

export default ProductPage
