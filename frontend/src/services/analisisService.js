import api from "./api";

// 👉 ahora acepta inicio y fin como parámetros
export const getAnalisis = async (inicio, fin) => {
  const response = await api.get("/empresa/analisis-devoluciones", {
    params: {
      fecha_inicio: inicio,
      fecha_fin: fin
    }
  });
  return response.data;
};