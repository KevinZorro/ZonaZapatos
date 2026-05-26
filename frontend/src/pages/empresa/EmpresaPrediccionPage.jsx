import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import api from "../../services/api";
import "./EmpresaPrediccionPage.css";

const NIVEL_CONFIG = {
  "muy alta": { emoji: "🔥", color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  "alta":     { emoji: "📈", color: "#065F46", bg: "#D1FAE5", border: "#6EE7B7" },
  "moderada": { emoji: "📊", color: "#1E40AF", bg: "#DBEAFE", border: "#93C5FD" },
  "baja":     { emoji: "📉", color: "#92400E", bg: "#FEF3C7", border: "#FCD34D" },
};

export default function EmpresaPrediccionPage() {
  const [productos, setProductos] = useState([]);
  const [modo, setModo] = useState("individual");
  const [seleccionado, setSeleccionado] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/empresa/productos")
      .then((res) => {
        const data = res.data;
        setProductos(Array.isArray(data) ? data : data.productos || data.items || []);
      })
      .catch(() => setError("No se pudieron cargar los productos."));
  }, []);

  const toggleSeleccion = (producto) => {
    setSeleccionados((prev) =>
      prev.find((p) => p.id === producto.id)
        ? prev.filter((p) => p.id !== producto.id)
        : [...prev, producto]
    );
  };

  const predecirIndividual = async () => {
    if (!seleccionado) return;
    setCargando(true);
    setResultado(null);
    setError(null);
    try {
      const res = await api.get(`/empresa/prediccion/${seleccionado.id}`);
      setResultado(res.data);
    } catch {
      setError("Error al obtener la predicción. Asegúrate de que el modelo esté entrenado.");
    } finally {
      setCargando(false);
    }
  };

  const predecirConjunto = async () => {
    if (seleccionados.length === 0) return;
    setCargando(true);
    setResultados([]);
    setError(null);
    try {
      const res = await api.post("/empresa/prediccion/conjunto", {
        producto_ids: seleccionados.map((p) => p.id),
      });
      setResultados(res.data.predicciones);
    } catch {
      setError("Error al obtener las predicciones.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="prediccion-container"
    >
      <h1 className="prediccion-titulo">Predicción de Ventas</h1>
      <p className="prediccion-subtitulo">
        Estima cuántas unidades venderás en las próximas 4 semanas y entiende por qué.
      </p>

      {/* Tabs */}
      <div className="modo-botones">
        {["individual", "conjunto"].map((m) => (
          <button
            key={m}
            className={`modo-btn ${modo === m ? "activo" : "inactivo"}`}
            onClick={() => {
              setModo(m);
              setResultado(null);
              setResultados([]);
              setError(null);
            }}
          >
            {m === "individual" ? "🔍 Individual" : "📦 Conjunto"}
          </button>
        ))}
      </div>

      {/* ── MODO INDIVIDUAL ── */}
      {modo === "individual" && (
        <>
          <label className="prediccion-label">Producto</label>
          <select
            className="prediccion-select"
            value={seleccionado?.id || ""}
            onChange={(e) => {
              const p = productos.find((p) => p.id === parseInt(e.target.value));
              setSeleccionado(p || null);
              setResultado(null);
            }}
          >
            <option value="">-- Selecciona un producto --</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — Talla {p.talla} | {p.color} | ${p.precio?.toLocaleString()}
              </option>
            ))}
          </select>

          <button
            className={`prediccion-btn ${seleccionado && !cargando ? "activo" : "deshabilitado"}`}
            onClick={predecirIndividual}
            disabled={!seleccionado || cargando}
          >
            {cargando ? "Analizando..." : "Predecir ventas"}
          </button>

          {resultado && (() => {
            const nivel = resultado.nivel_demanda || "moderada";
            const cfg = NIVEL_CONFIG[nivel] || NIVEL_CONFIG["moderada"];
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="resultado-card"
                style={{ borderColor: cfg.border }}
              >
                {/* Encabezado */}
                <p className="resultado-nombre">
                  {seleccionado.nombre}
                </p>

                {/* Número principal */}
                <div className="resultado-hero">
                  <span className="resultado-numero">
                    {Math.round(resultado.unidades_estimadas)}
                  </span>
                  <span className="resultado-label">unidades estimadas</span>
                  <span className="resultado-periodo">en las próximas 4 semanas</span>
                </div>

                {/* Badge de nivel */}
                <div
                  className="nivel-badge"
                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                >
                  {cfg.emoji} Demanda {nivel}
                </div>

                {/* Consejo */}
                {resultado.consejo && (
                  <div className="consejo-box" style={{ borderColor: cfg.border }}>
                    <p className="consejo-titulo">💡 Recomendación</p>
                    <p className="consejo-texto">{resultado.consejo}</p>
                  </div>
                )}

                {/* Explicación de factores */}
                {resultado.explicacion_factores?.length > 0 && (
                  <div className="explicacion-box">
                    <p className="explicacion-titulo">¿Por qué esta predicción?</p>
                    <div className="explicacion-lista">
                      {resultado.explicacion_factores.map((exp, i) => {
                        const factor = resultado.factores_principales?.[i] || "";
                        const pct = factor.match(/\((\d+)%/)?.[1] || "";
                        return (
                          <div key={i} className="explicacion-item">
                            <div className="explicacion-barra-wrap">
                              <div
                                className="explicacion-barra"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="explicacion-texto">{exp}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}
        </>
      )}

      {/* ── MODO CONJUNTO ── */}
      {modo === "conjunto" && (
        <>
          <label className="prediccion-label">
            Selecciona productos ({seleccionados.length} seleccionados)
          </label>

          <div className="conjunto-lista">
            {productos.map((p) => (
              <label
                key={p.id}
                className={`conjunto-item ${seleccionados.find((s) => s.id === p.id) ? "seleccionado" : "normal"}`}
              >
                <input
                  type="checkbox"
                  checked={!!seleccionados.find((s) => s.id === p.id)}
                  onChange={() => toggleSeleccion(p)}
                />
                <span>{p.nombre} — ${p.precio?.toLocaleString()}</span>
              </label>
            ))}
          </div>

          <button
            className={`prediccion-btn ${seleccionados.length > 0 && !cargando ? "activo" : "deshabilitado"}`}
            onClick={predecirConjunto}
            disabled={seleccionados.length === 0 || cargando}
          >
            {cargando ? "Analizando..." : `Predecir ${seleccionados.length} productos`}
          </button>

          {resultados.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="conjunto-resultados"
            >
              <p className="conjunto-resultados-titulo">
                Resultados — próximas 4 semanas
              </p>

              {resultados.map((r, i) => {
                const nivel = r.nivel_demanda || "moderada";
                const cfg = NIVEL_CONFIG[nivel] || NIVEL_CONFIG["moderada"];
                return (
                  <div
                    key={r.producto_id}
                    className="conjunto-resultado-card"
                    style={{
                      borderColor: i === 0 ? cfg.border : "#E5E7EB",
                      background: i === 0 ? cfg.bg : "#F9FAFB",
                    }}
                  >
                    <div className="conjunto-resultado-header">
                      <div>
                        {i === 0 && (
                          <span
                            className="conjunto-mejor-badge"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                          >
                            Mayor demanda
                          </span>
                        )}
                        <p className="conjunto-resultado-nombre">
                          {i > 0 ? `${i + 1}. ` : ""}{r.nombre}
                        </p>
                        {r.consejo && (
                          <p className="conjunto-resultado-consejo">{r.consejo}</p>
                        )}
                      </div>
                      <div className="conjunto-resultado-derecha">
                        <span className="conjunto-resultado-unidades">
                          {Math.round(r.unidades_estimadas)}
                        </span>
                        <span className="conjunto-resultado-uds-label">uds.</span>
                        <span
                          className="nivel-badge-small"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.emoji} {nivel}
                        </span>
                      </div>
                    </div>

                    {r.factores_principales?.length > 0 && (
                      <p className="conjunto-resultado-factores">
                        Factores: {r.factores_principales.join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Conclusión general */}
              {resultados[0] && (
                <div className="consejo-box" style={{ marginTop: "1rem" }}>
                  <p className="consejo-titulo">💡 Conclusión</p>
                  <p className="consejo-texto">
                    <strong>{resultados[0].nombre}</strong> lidera con{" "}
                    <strong>{Math.round(resultados[0].unidades_estimadas)} unidades</strong> estimadas.{" "}
                    {resultados[0].consejo}{" "}
                    {resultados.length > 1 &&
                      `Los demás productos también tienen demanda — revisa cada uno para planear tu inventario.`}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}
    </motion.div>
  );
}