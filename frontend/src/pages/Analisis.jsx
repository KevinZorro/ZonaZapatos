import { useState } from "react";
import { getAnalisis } from "../services/analisisService";
import "./Analisis.css";
import GraficaGlobal from "../components/GraficaGlobal";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function Analisis() {
  const [data, setData] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verGrafica, setVerGrafica] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState("todos");
  const [motivoSeleccionado, setMotivoSeleccionado] = useState("todos");

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

        // 🔔 guardar alertas
        localStorage.setItem("alertas", JSON.stringify(res.alertas || []));

        // 🔔 notificar al Navbar
        window.dispatchEvent(new Event("alertasActualizadas"));

        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar análisis");
        setLoading(false);
      });
  };

  const exportarPDF = async () => {
    const elemento = document.getElementById("reporte");

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(elemento, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("reporte_devoluciones.pdf");
  };

  // 🔥 obtener motivos únicos
  const obtenerMotivosUnicos = () => {
    if (!data?.analisis) return [];

    const motivosSet = new Set();

    Object.values(data.analisis).forEach((motivos) => {
      Object.keys(motivos).forEach((m) => motivosSet.add(m));
    });

    return Array.from(motivosSet);
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

        <button onClick={exportarPDF} style={{ marginLeft: "10px" }}>
          Exportar PDF
        </button>

        <button
          onClick={() => setVerGrafica(!verGrafica)}
          style={{ marginLeft: "10px" }}
        >
          {verGrafica ? "Ocultar gráfica" : "Ver gráfica"}
        </button>
      </div>

      {loading && <p className="analisis-msg">Cargando análisis...</p>}
      {error && <p className="analisis-error">{error}</p>}

      {!data && !loading && (
        <p className="analisis-msg">
          Selecciona un rango de fechas y presiona Filtrar
        </p>
      )}

      {data && !data.datos_suficientes && (
        <p className="analisis-msg">
          No hay suficientes datos para mostrar análisis
        </p>
      )}

      {data && data.datos_suficientes && data.analisis && (
        <div id="reporte">
          <div className="analisis-resultados">

            {/* 🔽 FILTRO PRODUCTO */}
            <div style={{ marginBottom: "10px", textAlign: "left" }}>
              <label style={{ marginRight: "10px", fontWeight: "bold" }}>
                Producto:
              </label>
              <select
                value={productoSeleccionado}
                onChange={(e) => setProductoSeleccionado(e.target.value)}
                style={{ padding: "6px", borderRadius: "6px" }}
              >
                <option value="todos">Todos</option>
                {Object.keys(data.analisis).map((producto) => (
                  <option key={producto} value={producto}>
                    {producto}
                  </option>
                ))}
              </select>
            </div>

            {/* 🔽 FILTRO MOTIVO */}
            <div style={{ marginBottom: "20px", textAlign: "left" }}>
              <label style={{ marginRight: "10px", fontWeight: "bold" }}>
                Motivo:
              </label>
              <select
                value={motivoSeleccionado}
                onChange={(e) => setMotivoSeleccionado(e.target.value)}
                style={{ padding: "6px", borderRadius: "6px" }}
              >
                <option value="todos">Todos</option>
                {obtenerMotivosUnicos().map((motivo) => (
                  <option key={motivo} value={motivo}>
                    {motivo}
                  </option>
                ))}
              </select>
            </div>

            {/* 🔥 GRID */}
            <div className="analisis-grid">
              {Object.entries(data.analisis)
                .filter(([producto, motivos]) => {
                  const cumpleProducto =
                    productoSeleccionado === "todos" ||
                    producto === productoSeleccionado;

                  const cumpleMotivo =
                    motivoSeleccionado === "todos" ||
                    Object.keys(motivos).includes(motivoSeleccionado);

                  return cumpleProducto && cumpleMotivo;
                })
                .map(([producto, motivos]) => (
                  <div key={producto} className="analisis-card">
                    <h3>{producto}</h3>
                    <ul>
                      {Object.entries(motivos)
                        .filter(([motivo]) =>
                          motivoSeleccionado === "todos" ||
                          motivo === motivoSeleccionado
                        )
                        .map(([motivo, porcentaje]) => (
                          <li key={motivo}>
                            {motivo}: {porcentaje}%
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </div>

            {/* 📊 GRÁFICA */}
            {verGrafica && (
              <div className="grafica-global">
                <h2>Gráfica general</h2>
                <GraficaGlobal data={data.analisis} />
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default Analisis;