import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — guards a route behind authentication and optional role check.
 *
 * @param {React.ReactNode} children - Element to render if access is granted.
 * @param {string[]} [roles] - Allowed roles. If omitted any authenticated user may pass.
 */
export default function ProtectedRoute({ children, roles }) {
    const { isAuthenticated, user } = useAuth()
    const location = useLocation()

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (roles && user && !roles.includes(user.rol)) {
        return <Navigate to="/no-autorizado" replace />
    }

    return children
}
