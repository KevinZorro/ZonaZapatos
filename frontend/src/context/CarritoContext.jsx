import { createContext, useContext, useState, useEffect } from 'react'

const CarritoContext = createContext()

export function CarritoProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('zz_carrito')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('zz_carrito', JSON.stringify(items))
  }, [items])

  const agregarItem = (producto) => {
    setItems(prev => {
      const existe = prev.find(i => i.producto_id === producto.id)
      if (existe) {
        return prev.map(i =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.media?.find(m => m.tipo === 'imagen')?.cloudinary_url || null,
        cantidad: 1,
      }]
    })
  }

  const quitarItem = (producto_id) =>
    setItems(prev => prev.filter(i => i.producto_id !== producto_id))

  const cambiarCantidad = (producto_id, cantidad) => {
    if (cantidad < 1) return quitarItem(producto_id)
    setItems(prev =>
      prev.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i)
    )
  }

  const vaciarCarrito = () => setItems([])

  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <CarritoContext.Provider value={{
      items, agregarItem, quitarItem, cambiarCantidad, vaciarCarrito, totalItems
    }}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarrito() {
  return useContext(CarritoContext)
}