import api from "./api";

export async function listarSessoesCaixa(params = {}) {
  const { data } = await api.get("/caixa", { params });
  return data;
}

export async function abrirCaixa(dados) {
  const { data } = await api.post("/caixa", dados);
  return data;
}

export async function fecharCaixa(id, dados) {
  const { data } = await api.post(`/caixa/${id}/fechar`, dados);
  return data;
}
