import '@google/model-viewer'

export default function ARViewer({ modelSrc, iosSrc, title = 'Zapato 3D', isMobile = false }) {
  if (!modelSrc) return null

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <model-viewer
        src={modelSrc}
        ios-src={iosSrc}
        alt={title}
        ar={isMobile}
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        exposure="1"
        shadow-intensity="1"
        style={{
          width: '100%',
          height: isMobile ? '60vh' : '420px',
          minHeight: '380px',
          background: 'linear-gradient(180deg, #F9F5EE 0%, #EFE3D0 100%)',
          borderRadius: '16px',
          display: 'block',
        }}
      />

      <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>
        {isMobile
          ? 'En celular compatible veras la opcion para abrir el modelo en realidad aumentada.'
          : 'En computador se muestra el visor 3D interactivo del producto.'}
      </p>
    </div>
  )
}
