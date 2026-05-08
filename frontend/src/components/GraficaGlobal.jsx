import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

const colores = {
  talla_pequena: "#8884d8",
  talla_grande: "#82ca9d",
  producto_defectuoso: "#ff6b6b",
  material_rigido: "#ffa94d",
  acabado: "#4dabf7",
  otro: "#adb5bd",
};

function GraficaGlobal({ data }) {
  // 🔥 combinar todos los productos
  const acumulado = {};

  Object.values(data).forEach((motivos) => {
    Object.entries(motivos).forEach(([motivo, porcentaje]) => {
      if (!acumulado[motivo]) {
        acumulado[motivo] = 0;
      }
      acumulado[motivo] += porcentaje;
    });
  });

  // convertir a array
  const chartData = Object.entries(acumulado).map(([motivo, valor]) => ({
    motivo,
    valor: Number(valor.toFixed(2)),
  }));

  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="motivo" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="valor">
            {chartData.map((entry, index) => (
              <Cell key={index} fill={colores[entry.motivo] || "#8884d8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GraficaGlobal;