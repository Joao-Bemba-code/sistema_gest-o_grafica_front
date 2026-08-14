import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/pedidos", { params });
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/pedidos", dados);
  return data;
}

export async function cancelar(id) {
  const { data } = await api.post(`/pedidos/${id}/cancelar`);
  return data;
}

export async function receber(id, itens) {
  const { data } = await api.post(`/pedidos/${id}/receber`, { itens });
  return data;
}

export async function enviarEmail(id, anexoBase64, anexoNome) {
  const { data } = await api.post(`/pedidos/${id}/enviar-email`, {
    anexo_base64: anexoBase64,
    anexo_nome: anexoNome,
  });
  return data;
}
