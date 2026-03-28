import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <nav className="navbar" role="navigation" aria-label="Navegación principal">
            <Link to="/" className="navbar__brand" id="navbar-brand">
                🥿 Zapatos Artesanales
            </Link>

            <div className="navbar__links">
                <Link to="/catalogo" id="nav-catalogo">Catálogo</Link>

                {!isAuthenticated && (
                    <>
                        <Link to="/login" id="nav-login">Iniciar sesión</Link>
                        <Link to="/registro/cliente" id="nav-registro-cliente" className="navbar__btn">
                            Registrarse
                        </Link>
                    </>
                )}

                {isAuthenticated && user?.rol === 'empresa' && (
                    <>
                        <Link to="/empresa/productos" id="nav-empresa-productos">Mis productos</Link>
                        <Link to="/empresa/dashboard" id="nav-dashboard">Dashboard</Link>
                    </>
                )}

                {isAuthenticated && user?.rol === 'cliente' && (
                    <Link to="/pedidos" id="nav-pedidos">Mis pedidos</Link>
                )}

                {isAuthenticated && (
                    <button onClick={handleLogout} className="navbar__btn navbar__btn--danger" id="nav-logout">
                        Salir
                    </button>
                )}
            </div>
        </nav>
    )
}
