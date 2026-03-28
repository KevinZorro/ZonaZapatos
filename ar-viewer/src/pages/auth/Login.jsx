import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Auth.css'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = location.state?.from?.pathname || '/'

    const [form, setForm] = useState({ correo: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const data = await login(form.correo, form.password)
            if (data.rol === 'empresa') navigate('/empresa/productos', { replace: true })
            else if (data.rol === 'admin') navigate('/admin', { replace: true })
            else navigate(from, { replace: true })
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <span className="auth-card__icon">🥿</span>
                    <h1 className="auth-card__title">Iniciar sesión</h1>
                    <p className="auth-card__subtitle">Bienvenido de nuevo</p>
                </div>

                <form id="login-form" onSubmit={handleSubmit} className="auth-form" noValidate>
                    {error && <div className="auth-error" role="alert">{error}</div>}

                    <div className="auth-field">
                        <label htmlFor="login-correo">Correo electrónico</label>
                        <input
                            id="login-correo"
                            type="email"
                            name="correo"
                            value={form.correo}
                            onChange={handleChange}
                            required
                            placeholder="tu@correo.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        id="login-submit"
                        type="submit"
                        className="auth-btn"
                        disabled={loading}
                    >
                        {loading ? 'Ingresando…' : 'Iniciar sesión'}
                    </button>
                </form>

                <p className="auth-footer">
                    ¿No tienes cuenta?{' '}
                    <Link to="/registro/cliente" id="link-registro-cliente">Regístrate como cliente</Link>
                    {' o '}
                    <Link to="/registro/empresa" id="link-registro-empresa">como empresa</Link>
                </p>
            </div>
        </div>
    )
}
