import api from "./api";

export async function listarMovimentos(params = {}) {
  const { data } = await api.get("/tesouraria", { params });
  return data;
}

export async function buscarMovimento(id) {
  const { data } = await api.get(`/tesouraria/${id}`);
  return data;
}

export async function criarMovimento(dados) {
  const { data } = await api.post("/tesouraria", dados);
  return data;
}

export async function atualizarMovimento(id, dados) {
  const { data } = await api.put(`/tesouraria/${id}`, dados);
  return data;
}

export async function removerMovimento(id) {
  const { data } = await api.delete(`/tesouraria/${id}`);
  return data;
}

export async function resumoTesouraria(params = {}) {
  const { data } = await api.get("/tesouraria/resumo", { params });
  return data;
}

export async function exportarTesouraria(params = {}) {
  const { data } = await api.get("/tesouraria/exportar", { params, responseType: "blob" });
  return data;
}

export async function anexarFicheiros(movimentoId, ficheiros) {
  const form = new FormData();
  ficheiros.forEach((f) => form.append("anexos", f));
  const { data } = await api.post(`/tesouraria/${movimentoId}/anexos`, form, { timeout: 60000 });
  return data;
}

export async function removerAnexo(id) {
  const { data } = await api.delete(`/tesouraria/anexos/${id}`);
  return data;
}

// Abre o anexo (PDF/imagem) guardado na base de dados numa nova aba.
// Usa a API autenticada (o ficheiro já não está em /uploads público).
export async function abrirAnexo(id) {
  const janela = window.open("", "_blank");
  try {
    const res = await api.get(`/tesouraria/anexos/${id}`, { responseType: "blob" });
    const blob = res.data;
    const url = URL.createObjectURL(blob);
    if (janela) {
      janela.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (janela) janela.close();
    throw err;
  }
}
