import '@google/model-viewer'

function ARViewer({ modelSrc, title = 'Zapato 3D', iosSrc }) {
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
        height: '70vh',
        backgroundColor: '#f3f4f6',
        borderRadius: '16px',
        display: 'block'
      }}
    ></model-viewer>
  )
}

export default ARViewer
