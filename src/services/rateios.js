import api from "./api";

export async function listarRateios(params = {}) {
  const { data } = await api.get("/rateios", { params });
  return data;
}

export async function salvarRateio(movimento_id, itens = []) {
  const { data } = await api.post("/rateios", { movimento_id, itens });
  return data;
}
