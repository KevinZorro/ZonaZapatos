import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Auth.css'

export default function RegisterCliente() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        correo: '',
        password: '',
        nombre: '',
        telefono: '',
        direccion: '',
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await api.post('/auth/registro/cliente', form)
            setSuccess(data.msg)
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al registrarse')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__header">
                    <span className="auth-card__icon">👟</span>
                    <h1 className="auth-card__title">Crear cuenta</h1>
                    <p className="auth-card__subtitle">Regístrate como cliente</p>
                </div>

                <form id="register-cliente-form" onSubmit={handleSubmit} className="auth-form" noValidate>
                    {error && <div className="auth-error" role="alert">{error}</div>}
                    {success && <div className="auth-success" role="status">{success}</div>}

                    <div className="auth-field">
                        <label htmlFor="rc-nombre">Nombre completo</label>
                        <input id="rc-nombre" name="nombre" type="text" value={form.nombre}
                            onChange={handleChange} required placeholder="Juan Pérez" />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="rc-correo">Correo electrónico</label>
                        <input id="rc-correo" name="correo" type="email" value={form.correo}
                            onChange={handleChange} required placeholder="tu@correo.com" />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="rc-telefono">Teléfono</label>
                        <input id="rc-telefono" name="telefono" type="tel" value={form.telefono}
                            onChange={handleChange} placeholder="+57 300 000 0000" />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="rc-direccion">Dirección</label>
                        <input id="rc-direccion" name="direccion" type="text" value={form.direccion}
                            onChange={handleChange} placeholder="Calle 12 #3-45, Cúcuta" />
                    </div>
                    <div className="auth-field">
                        <label htmlFor="rc-password">Contraseña</label>
                        <input id="rc-password" name="password" type="password" value={form.password}
                            onChange={handleChange} required placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                    </div>

                    <button id="rc-submit" type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Registrando…' : 'Crear cuenta'}
                    </button>
                </form>

                <p className="auth-footer">
                    ¿Ya tienes cuenta? <Link to="/login" id="link-login-from-rc">Inicia sesión</Link>
                </p>
            </div>
        </div>
    )
}
