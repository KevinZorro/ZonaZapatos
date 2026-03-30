import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './SplashPage.css'

const slides = [
  {
    id: 1,
    bg: '#C8006E',
    title: 'En Cúcuta desde el 2006',
    subtitle: 'Calzado artesanal con alma cucuteña',
    emoji: '👟',
  },
  {
    id: 2,
    bg: '#960052',
    title: 'Estilos que se adaptan a tí',
    subtitle: 'Encuentra el zapato perfecto para cada momento',
    emoji: '👠',
  },
  {
    id: 3,
    bg: '#8B1A2D',
    title: 'Calidad que se nota',
    subtitle: 'Materiales premium, acabados de lujo',
    emoji: '✨',
  },
  {
    id: 4,
    bg: '#6B2A1A',
    title: 'Directo del fabricante',
    subtitle: 'Sin intermediarios, precios justos',
    emoji: '🏭',
  },
  {
    id: 5,
    bg: '#8B9D3A',
    title: 'Disponibles a nivel nacional',
    subtitle: 'Envíos a toda Colombia con total seguridad',
    emoji: '📦',
  },
  {
    id: 6,
    bg: '#6B7B2A',
    title: 'Pruébalos en realidad aumentada',
    subtitle: 'Visualiza el zapato antes de comprarlo',
    emoji: '🥽',
  },
]

export default function SplashPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('splash') // 'splash' | 'onboarding'
  const [current, setCurrent] = useState(0)

  // After 1.8s splash → onboarding
  useEffect(() => {
    const t = setTimeout(() => setPhase('onboarding'), 1800)
    return () => clearTimeout(t)
  }, [])

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
    } else {
      localStorage.setItem('zz_seen_splash', '1')
      navigate('/catalogo')
    }
  }

  const skip = () => {
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
        <motion.div
          className="splash-logo"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
        >
          <span className="splash-logo__icon">👟</span>
          <span className="splash-logo__name">Zona Zapatos</span>
          <span className="splash-logo__tagline">En Cúcuta desde el 2006</span>
        </motion.div>

        <motion.div
          className="splash-rings"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="ring ring--1" />
          <div className="ring ring--2" />
          <div className="ring ring--3" />
        </motion.div>
      </motion.div>
    )
  }

  const slide = slides[current]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slide.id}
        className="onboarding-screen"
        style={{ background: slide.bg }}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Background rings */}
        <div className="ob-rings">
          <motion.div
            className="ob-ring ob-ring--1"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          />
          <motion.div
            className="ob-ring ob-ring--2"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
          />
        </div>

        {/* Shoe emoji hero */}
        <motion.div
          className="ob-hero"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
        >
          <span className="ob-hero__emoji">{slide.emoji}</span>
        </motion.div>

        {/* Text */}
        <motion.div
          className="ob-text"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="ob-title">{slide.title}</h1>
          <p className="ob-subtitle">{slide.subtitle}</p>
        </motion.div>

        {/* Dots */}
        <div className="ob-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`ob-dot ${i === current ? 'ob-dot--active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="ob-actions">
          <button className="ob-btn ob-btn--skip" onClick={skip}>
            Saltar
          </button>
          <motion.button
            className="ob-btn ob-btn--next"
            onClick={next}
            whileTap={{ scale: 0.95 }}
          >
            {current === slides.length - 1 ? 'Empezar' : 'Siguiente'}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
