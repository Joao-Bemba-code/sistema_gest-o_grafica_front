import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/propostas", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/propostas/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/propostas", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/propostas/${id}`, dados);
  return data;
}

export async function mudarEstado(id, estado, extra = {}) {
  const { data } = await api.put(`/propostas/${id}/estado`, { estado, ...extra });
  return data;
}

export async function vincularOrcamento(id, orcamentoId) {
  const { data } = await api.put(`/propostas/${id}/orcamento`, { orcamento_id: orcamentoId });
  return data;
}

export async function anular(id, motivo) {
  const { data } = await api.post(`/propostas/${id}/anular`, { motivo });
  return data;
}

export async function listarDocumentos(propostaId) {
  const { data } = await api.get(`/propostas/${propostaId}/documentos`);
  return data;
}

export async function anexarDocumentos(propostaId, ficheiros) {
  const form = new FormData();
  ficheiros.forEach((f) => form.append("anexos", f));
  const { data } = await api.post(`/propostas/${propostaId}/documentos`, form, { timeout: 60000 });
  return data;
}

// Um documento nunca é eliminado: fica no histórico marcado como anulado.
export async function anularDocumento(docId) {
  const { data } = await api.patch(`/propostas/documentos/${docId}/anular`);
  return data;
}

// Abre o documento (PDF/imagem) guardado na base de dados numa nova aba.
export async function abrirDocumento(docId) {
  const janela = window.open("", "_blank");
  try {
    const res = await api.get(`/propostas/documentos/${docId}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (janela) {
      janela.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (janela) janela.close();
    throw err;
  }
}

export const UNIDADES = [
  { value: "UN-01", sigla: "AG", label: "UN-01 · Artes Gráficas" },
  { value: "UN-02", sigla: "FP", label: "UN-02 · Formação Profissional" },
  { value: "UN-03", sigla: "SD", label: "UN-03 · Solução Digital" },
];

export const ESTADOS_PROPOSTA = [
  { value: "rascunho", label: "EM PREPARAÇÃO" },
  { value: "enviada", label: "ENVIADAS" },
  { value: "recebida", label: "EM REVISÃO" },
  { value: "avaliada", label: "AVALIADA" },
  { value: "aprovada", label: "ACEITES" },
  { value: "rejeitada", label: "RECUSADAS" },
  { value: "expirada", label: "EXPIRADAS" },
  { value: "anulada", label: "ANULADAS" },
];

export const META_ESTADO = {
  rascunho: { rotulo: "EM PREPARAÇÃO", tom: "warning", icone: "edit" },
  enviada: { rotulo: "ENVIADAS", tom: "info", icone: "send" },
  recebida: { rotulo: "EM REVISÃO", tom: "neutral", icone: "email" },
  avaliada: { rotulo: "AVALIADA", tom: "primary", icone: "hourglass_top" },
  aprovada: { rotulo: "ACEITES", tom: "success", icone: "verified" },
  rejeitada: { rotulo: "RECUSADAS", tom: "error", icone: "block" },
  expirada: { rotulo: "EXPIRADAS", tom: "neutral", icone: "event_busy" },
  anulada: { rotulo: "ANULADAS", tom: "error", icone: "block" },
};

// Listas fixas de sugestão para os campos abertos da proposta.
export const TIPOS_PROPOSTA = [
  "Proposta comercial",
  "Proposta técnica",
  "Cotação",
  "Renovação de contrato",
  "Proposta institucional",
];

export const ORIGENS_PROPOSTA = [
  "Contacto directo",
  "Indicação de cliente",
  "Pedido formal do cliente",
  "Feira / evento",
  "Redes sociais",
  "Website",
  "Licitação / concurso",
];

export const FAMILIAS_PRODUTO = [
  "Artes gráficas",
  "Impressão digital",
  "Impressão offset",
  "Grande formato",
  "Material publicitário",
  "Brindes promocionais",
  "Formação profissional",
  "Soluções digitais",
];

export const FORMATOS_SUGERIDOS = [
  "A4",
  "A5",
  "A3",
  "A2",
  "A1",
  "A0",
  "10x15 cm",
  "15x21 cm",
  "85x55 mm",
  "Personalizado",
];

export const CORES_SUGERIDAS = [
  "Preto e branco",
  "1 cor",
  "2 cores",
  "4/0 (frente a cores)",
  "4/4 (frente e verso a cores)",
  "PANTONE",
  "Cores institucionais",
];

export const ACABAMENTOS_SUGERIDOS = [
  "Sem acabamento",
  "Corte simples",
  "Corte especial",
  "Dobra",
  "Vinco",
  "Laminação brilhante",
  "Laminação mate",
  "Verniz localizado",
  "Relevo seco",
  "Hot stamping",
  "Encadernação agrafada",
  "Encadernação a quente",
  "Lombada quadrada",
  "Ilhós",
  "Bainha",
];

export const MODELOS_DOCUMENTAIS = [
  "Modelo standard SIGRAF",
  "Modelo institucional do cliente",
  "Modelo simples",
  "Modelo detalhado",
  "Sem modelo definido",
];

export const ESTADOS_DOCUMENTAIS = [
  "Em preparação",
  "Incompleto",
  "Completo",
  "Pendente de assinatura",
  "Assinado",
  "Arquivado",
];
