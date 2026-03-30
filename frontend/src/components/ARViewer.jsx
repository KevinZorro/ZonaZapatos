import '@google/model-viewer'

export default function ARViewer({ modelSrc, iosSrc, title = 'Zapato 3D' }) {
  if (!modelSrc) return null

  return (
    <model-viewer
      src={modelSrc}
      ios-src={iosSrc}
      alt={title}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      exposure="1"
      shadow-intensity="1"
      style={{
        width: '100%',
        height: '380px',
        backgroundColor: '#F9F5EE',
        borderRadius: '16px',
        display: 'block',
      }}
    />
  )
}
