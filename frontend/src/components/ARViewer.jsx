import '@google/model-viewer'

export default function ARViewer({ modelSrc, iosSrc, title = 'Zapato 3D', isMobile = false }) {
  if (!modelSrc) return null

  return (
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
        height: '100%',
        background: 'linear-gradient(180deg, #F9F5EE 0%, #EFE3D0 100%)',
        borderRadius: '16px',
        display: 'block',
      }}
    />
  )
}
