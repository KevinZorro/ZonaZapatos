import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Auth.css'

export default function RegisterEmpresa() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        correo: '',
        password: '',
        nombre: '',
        nit: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        whatsapp: '',
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
            const { data } = await api.post('/auth/registro/empresa', form)
            setSuccess(data.msg)
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al registrar la empresa')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page auth-page--empresa">
            <div className="auth-card auth-card--large">
                <div className="auth-card__header">
                    <span className="auth-card__icon">🏭</span>
                    <h1 className="auth-card__title">Registrar Empresa</h1>
                    <p className="auth-card__subtitle">Vende tus zapatos artesanales</p>
                </div>

                <form id="register-empresa-form" onSubmit={handleSubmit} className="auth-form" noValidate>
                    {error && <div className="auth-error" role="alert">{error}</div>}
                    {success && <div className="auth-success" role="status">{success}</div>}

                    <div className="auth-grid">
                        <div className="auth-field">
                            <label htmlFor="re-nombre">Razón Social o Nombre</label>
                            <input id="re-nombre" name="nombre" type="text" value={form.nombre}
                                onChange={handleChange} required placeholder="Calzados El Cují SAS" />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="re-nit">NIT</label>
                            <input id="re-nit" name="nit" type="text" value={form.nit}
                                onChange={handleChange} required placeholder="900.123.456-7" />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="re-correo">Correo electrónico</label>
                            <input id="re-correo" name="correo" type="email" value={form.correo}
                                onChange={handleChange} required placeholder="ventas@empresa.com" />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="re-telefono">Teléfono fijo</label>
                            <input id="re-telefono" name="telefono" type="tel" value={form.telefono}
                                onChange={handleChange} placeholder="575 1234" />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="re-whatsapp">WhatsApp (Business)</label>
                            <input id="re-whatsapp" name="whatsapp" type="tel" value={form.whatsapp}
                                onChange={handleChange} placeholder="+57 300 000 0000" />
                        </div>
                        <div className="auth-field">
                            <label htmlFor="re-ciudad">Ciudad</label>
                            <input id="re-ciudad" name="ciudad" type="text" value={form.ciudad}
                                onChange={handleChange} placeholder="Cúcuta" />
                        </div>
                        <div className="auth-field auth-field--full">
                            <label htmlFor="re-direccion">Dirección física</label>
                            <input id="re-direccion" name="direccion" type="text" value={form.direccion}
                                onChange={handleChange} placeholder="Av. Principal, Barrio Calzado" />
                        </div>
                        <div className="auth-field auth-field--full">
                            <label htmlFor="re-password">Contraseña</label>
                            <input id="re-password" name="password" type="password" value={form.password}
                                onChange={handleChange} required placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                        </div>
                    </div>

                    <button id="re-submit" type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Registrando…' : 'Crear cuenta de Empresa'}
                    </button>
                </form>

                <p className="auth-footer">
                    ¿Ya tienes cuenta? <Link to="/login" id="link-login-from-re">Inicia sesión</Link>
                </p>
            </div>
        </div>
    )
}
