import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useCarrito } from "../context/CarritoContext";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { totalItems } = useCarrito();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 🔔 NUEVO
  // 🔔 ALERTAS
  const [alertas, setAlertas] = useState([]);
  const [openAlertas, setOpenAlertas] = useState(false);

  // 🔔 cargar y escuchar cambios
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = JSON.parse(localStorage.getItem("alertas")) || [];
      setAlertas(stored);
    }, 800); // cada 0.8s (rápido pero liviano)

    return () => clearInterval(interval);
  }, []);

  // 🔔 abrir/cerrar campana
  const toggleAlertas = () => {
    const nuevoEstado = !openAlertas;
    setOpenAlertas(nuevoEstado);

    // ❌ NO borrar al abrir
    // ✔ borrar cuando se CIERRA
    if (!nuevoEstado) {
      localStorage.removeItem("alertas");
      setAlertas([]);
    }
  };

  // Cierra el menú si cambia la ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [navigate]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  const navLinks = (
    <>
      <NavLink
        to="/catalogo"
        className={({ isActive }) =>
          `nb-link ${isActive ? "nb-link--active" : ""}`
        }
      >
        Catálogo
      </NavLink>

      {isAuthenticated && user?.rol === "empresa" && (
        <>
          <NavLink
            to="/empresa/productos"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Mis Productos
          </NavLink>
          <NavLink
            to="/empresa/devoluciones"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Devoluciones
          </NavLink>
          <NavLink
            to="/empresa/dashboard"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/empresa/analisis"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Analisis
          </NavLink>
          <NavLink
            to="/empresa/prediccion"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Predicción
          </NavLink>
        </>
      )}

      {isAuthenticated && user?.rol === "cliente" && (
        <>
          <NavLink
            to="/pedidos"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Mis Pedidos
          </NavLink>
          <NavLink
            to="/mis-devoluciones"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
          >
            Mis Devoluciones
          </NavLink>

          <NavLink
            to="/carrito"
            className={({ isActive }) =>
              `nb-link ${isActive ? "nb-link--active" : ""}`
            }
            style={{ position: "relative" }}
          >
            Carrito
            {totalItems > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-10px",
                  background: "var(--magenta)",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 800,
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </NavLink>
        </>
      )}
    </>
  );

  const authButtons = isAuthenticated ? (
    <>
      {/* 🔔 CAMPANA SOLO EMPRESA */}
      {user?.rol === "empresa" && (
        <div style={{ position: "relative", marginRight: "10px" }}>
          <button
            onClick={toggleAlertas}
            className="nb-link"
            style={{ fontSize: "18px" }}
          >
            🔔
          </button>

          {alertas.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "red",
                color: "#fff",
                borderRadius: "50%",
                fontSize: "10px",
                padding: "2px 6px",
              }}
            >
              {alertas.length}
            </span>
          )}

          {openAlertas && (
            <div
              style={{
                position: "absolute",
                top: "35px",
                right: 0,
                background: "#fff",
                padding: "10px",
                borderRadius: "10px",
                width: "260px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                zIndex: 1000,
              }}
            >
              <h4 style={{ marginBottom: "10px" }}>Alertas</h4>

              {alertas.length === 0 ? (
                <p>No hay alertas</p>
              ) : (
                alertas.map((a, i) => (
                  <p key={i} style={{ fontSize: "13px", marginBottom: "5px" }}>
                    <b>{a.producto}</b>
                    <br />
                    {a.motivo} ({a.porcentaje}%)
                  </p>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <NavLink
        to="/perfil"
        className={({ isActive }) =>
          `nb-avatar ${isActive ? "nb-avatar--active" : ""}`
        }
        title="Mi perfil"
      >
        {user?.correo?.[0]?.toUpperCase() || "?"}
      </NavLink>

      <button onClick={handleLogout} className="nb-btn nb-btn--danger">
        Cerrar sesión
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="nb-link">
        Iniciar sesión
      </Link>
      <Link to="/registro/cliente" className="nb-btn nb-btn--primary">
        Registrarse
      </Link>
    </>
  );

  return (
    <>
      <nav
        className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}
        role="navigation"
      >
        <div className="navbar__inner container">
          <Link to="/" className="navbar__brand">
            <span className="navbar__brand-icon">👟</span>
            <span className="navbar__brand-name">Zona Zapatos</span>
          </Link>

          <div className="navbar__links navbar__links--desktop">{navLinks}</div>

          <div className="navbar__auth navbar__auth--desktop">
            {authButtons}
          </div>

          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span
              className={`ham-line ${menuOpen ? "ham-line--open-1" : ""}`}
            />
            <span
              className={`ham-line ${menuOpen ? "ham-line--open-2" : ""}`}
            />
            <span
              className={`ham-line ${menuOpen ? "ham-line--open-3" : ""}`}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="nb-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="nb-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="nb-drawer__header">
                <span className="nb-drawer__brand">
                  <span>👟</span> Zona Zapatos
                </span>
                <button
                  className="nb-drawer__close"
                  onClick={() => setMenuOpen(false)}
                >
                  ✕
                </button>
              </div>

              <nav className="nb-drawer__links">{navLinks}</nav>

              <div className="nb-drawer__auth">
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="nb-btn nb-btn--danger"
                  >
                    Cerrar sesión
                  </button>
                ) : (
                  authButtons
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
