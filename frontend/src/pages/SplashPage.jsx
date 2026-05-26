import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '../assets/icons'
import './SplashPage.css'

const slides = [
  {
    id: 1,
    bg: '#C8006E',
    eyebrow: 'Desde 2006',
    title: 'Hecho en Cúcuta',
    subtitle: 'Calzado artesanal con alma cucuteña, generación tras generación.',
    icon: 'shoe',
  },
  {
    id: 2,
    bg: '#960052',
    eyebrow: 'A tu medida',
    title: 'Estilos que se adaptan a ti',
    subtitle: 'Encuentra el par perfecto para cada momento de tu día.',
    icon: 'sparkle',
  },
  {
    id: 3,
    bg: '#8B1A2D',
    eyebrow: 'Calidad real',
    title: 'Materiales que se sienten',
    subtitle: 'Cuero genuino, acabados premium y costuras que duran.',
    icon: 'star-filled',
  },
  {
    id: 4,
    bg: '#6B2A1A',
    eyebrow: 'Sin intermediarios',
    title: 'Directo del fabricante',
    subtitle: 'Pagas el precio justo. Lo demás se queda en quien lo hace.',
    icon: 'store',
  },
  {
    id: 5,
    bg: '#8B9D3A',
    eyebrow: 'Envíos nacionales',
    title: 'En toda Colombia',
    subtitle: 'Empacado con cuidado, entregado con seguridad, donde estés.',
    icon: 'truck',
  },
  {
    id: 6,
    bg: '#6B7B2A',
    eyebrow: 'Realidad aumentada',
    title: 'Pruébalos antes de pedirlos',
    subtitle: 'Visualiza cada zapato en tu espacio con tu propio teléfono.',
    icon: 'ar',
  },
]

export default function SplashPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('splash')
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setPhase('onboarding'), 2000)
    return () => clearTimeout(t)
  }, [])

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1)
    else finish()
  }

  const finish = () => {
    localStorage.setItem('zz_seen_splash', '1')
    navigate('/catalogo')
  }

  if (phase === 'splash') {
    return (
      <motion.div
        className="splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="splash-grain" aria-hidden />
        <motion.div
          className="splash-logo"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="splash-mark"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
          >
            <Icon name="shoe" size={56} />
          </motion.div>

          <motion.h1
            className="splash-name serif"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            Zona Zapatos
          </motion.h1>

          <motion.span
            className="splash-rule"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            aria-hidden
          />

          <motion.p
            className="splash-tagline eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            Cúcuta · Desde 2006
          </motion.p>
        </motion.div>
      </motion.div>
    )
  }

  const slide = slides[current]

  return (
    <div className="onboarding-screen" style={{ background: slide.bg }}>
      <div className="splash-grain" aria-hidden />

      {/* Skip floating */}
      <button className="ob-skip" onClick={finish}>Saltar</button>

      <div className="ob-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="ob-content"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="ob-visual">
              <motion.div
                className="ob-medallion"
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                aria-hidden
              >
                <svg viewBox="0 0 240 240" className="ob-medallion__svg">
                  <defs>
                    <path id={`circle-${slide.id}`} d="M120,120 m-90,0 a90,90 0 1,1 180,0 a90,90 0 1,1 -180,0" />
                  </defs>
                  <text fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="Inter" fontWeight="600">
                    <textPath
                      href={`#circle-${slide.id}`}
                      textLength="555"
                      lengthAdjust="spacing"
                    >
                      ZONA ZAPATOS  ·  CÚCUTA 2006  ·  HECHO A MANO  ·
                    </textPath>
                  </text>
                </svg>
              </motion.div>

              <motion.div
                className="ob-icon"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 18 }}
              >
                <Icon name={slide.icon} size={88} />
              </motion.div>
            </div>

            <div className="ob-text">
              <motion.span
                className="ob-eyebrow eyebrow"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slide.eyebrow}
              </motion.span>
              <motion.h2
                className="ob-title serif"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {slide.title}
              </motion.h2>
              <motion.p
                className="ob-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {slide.subtitle}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="ob-dots" role="tablist" aria-label="Progreso">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`ob-dot ${i === current ? 'ob-dot--active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Ir a slide ${i + 1}`}
              role="tab"
              aria-selected={i === current}
            />
          ))}
        </div>

        {/* CTA principal */}
        <motion.button
          className="ob-next"
          onClick={next}
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -2 }}
        >
          <span>{current === slides.length - 1 ? 'Entrar a la tienda' : 'Siguiente'}</span>
          <Icon name="arrow-right" size={18} />
        </motion.button>
      </div>
    </div>
  )
}
