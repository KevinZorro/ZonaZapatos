import { useState } from "react";
import { getAnalisis } from "../services/analisisService";
import "./Analisis.css"; // 👉 importa el archivo de estilos

function Analisis() {
  const [data, setData] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarAnalisis = () => {
    if (!fechaInicio || !fechaFin) {
      setError("Debes seleccionar ambas fechas");
      return;
    }

    setError(null);
    setLoading(true);

    getAnalisis(fechaInicio, fechaFin)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar análisis");
        setLoading(false);
      });
  };

  return (
    <div className="analisis-container">
      <h2 className="analisis-title">Análisis de devoluciones</h2>

      <div className="analisis-form">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
        />
        <button onClick={cargarAnalisis}>Filtrar</button>
      </div>

      {loading && <p className="analisis-msg">Cargando análisis...</p>}
      {error && <p className="analisis-error">{error}</p>}

      {!data && !loading && (
        <p className="analisis-msg">Selecciona un rango de fechas y presiona Filtrar</p>
      )}

      {data && !data.datos_suficientes && (
        <p className="analisis-msg">No hay suficientes datos para mostrar análisis</p>
      )}

      {data && data.datos_suficientes && data.analisis && (
        <div className="analisis-result">
          {Object.entries(data.analisis).map(([producto, motivos]) => (
            <div key={producto} className="analisis-card">
              <h3>{producto}</h3>
              <ul>
                {Object.entries(motivos).map(([motivo, porcentaje]) => (
                  <li key={motivo}>
                    {motivo}: {porcentaje}%
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Analisis;