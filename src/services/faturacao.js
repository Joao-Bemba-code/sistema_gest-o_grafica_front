import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/faturacao", { params });
  return data;
}

export async function listarFaturas(params) {
  const { data } = await api.get("/faturacao", { params });
  return data;
}

export async function buscarFatura(id) {
  const { data } = await api.get(`/faturacao/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/faturacao", dados);
  return data;
}

export async function criarFatura(dados) {
  const { data } = await api.post("/faturacao", dados);
  return data;
}

export async function faturarOrcamento(id, dados) {
  const { data } = await api.post(`/faturacao/orcamento/${id}`, dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/faturacao/${id}`, dados);
  return data;
}

export async function atualizarFatura(id, dados) {
  const { data } = await api.put(`/faturacao/${id}`, dados);
  return data;
}

export async function marcarPaga(id, dados) {
  const { data } = await api.put(`/faturacao/${id}/pagar`, dados);
  return data;
}

// Validação na Tesouraria: fatura em análise passa a emitida.
export async function validarFatura(id, dados = {}) {
  const { data } = await api.put(`/faturacao/${id}/validar`, dados);
  return data;
}

// Anexos de fatura (comprovativos/autorizações). O conteúdo fica na BD.
export async function anexarFicheirosFatura(faturaId, ficheiros) {
  const form = new FormData();
  ficheiros.forEach((f) => form.append("anexos", f));
  const { data } = await api.post(`/faturacao/${faturaId}/anexos`, form, { timeout: 60000 });
  return data;
}

export async function removerAnexoFatura(anexoId) {
  const { data } = await api.delete(`/faturacao/anexos/${anexoId}`);
  return data;
}

// Abre o anexo (PDF/imagem) guardado na base de dados numa nova aba.
export async function abrirAnexoFatura(anexoId) {
  const janela = window.open("", "_blank");
  try {
    const res = await api.get(`/faturacao/anexos/${anexoId}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (janela) janela.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (janela) janela.close();
    throw err;
  }
}

// Anula a fatura (mantém o registo) e estorna os movimentos de tesouraria
// ligados a ela. O motivo é obrigatório.
export async function anularFatura(id, dados = {}) {
  const { data } = await api.post(`/faturacao/${id}/anular`, dados);
  return data;
}

export async function exportarFaturas(params) {
  const { data } = await api.get("/faturacao/exportar", { params, responseType: "blob" });
  return data;
}

export async function buscarConfigAGT() {
  const { data } = await api.get("/faturacao/agt/config");
  return data;
}

export async function solicitarSerieAGT(dados) {
  const { data } = await api.post("/faturacao/agt/serie", dados);
  return data;
}

export async function listarSeriesAGT(params) {
  const { data } = await api.get("/faturacao/agt/series", { params });
  return data;
}

export async function consultarEstadoAGT(id) {
  const { data } = await api.post(`/faturacao/agt/consultar/${id}`);
  return data;
}

export async function enviarFaturaAGT(id) {
  const { data } = await api.post(`/faturacao/agt/enviar/${id}`);
  return data;
}
