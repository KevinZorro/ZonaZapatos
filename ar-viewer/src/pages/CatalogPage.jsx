import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL

function CatalogPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/productos`)
        if (!response.ok) throw new Error('No se pudo cargar el catálogo')
        const data = await response.json()
        setProducts(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (loading) return <p>Cargando catálogo...</p>
  if (error) return <p>{error}</p>

  return (
    <div style={{ padding: 24 }}>
      <h1>Catálogo</h1>

      <div style={{ display: 'grid', gap: 16 }}>
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            style={{
              padding: 16,
              border: '1px solid #ddd',
              borderRadius: 12,
              textDecoration: 'none',
              color: '#111'
            }}
          >
            <h2 style={{ margin: 0 }}>{product.name}</h2>
            <p style={{ marginTop: 8 }}>{product.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CatalogPage
