import api from "./api";

export async function listar(params) {
  const { data } = await api.get("/clientes", { params });
  return data;
}

export async function buscarPorId(id) {
  const { data } = await api.get(`/clientes/${id}`);
  return data;
}

export async function criar(dados) {
  const { data } = await api.post("/clientes", dados);
  return data;
}

export async function atualizar(id, dados) {
  const { data } = await api.put(`/clientes/${id}`, dados);
  return data;
}

export async function anular(id, motivo) {
  const { data } = await api.post(`/clientes/${id}/anular`, { motivo });
  return data;
}

export async function listarDocumentos(clienteId) {
  const { data } = await api.get(`/clientes/${clienteId}/documentos`);
  return data;
}

export async function anexarDocumentos(clienteId, ficheiros) {
  const form = new FormData();
  ficheiros.forEach((f) => form.append("anexos", f));
  const { data } = await api.post(`/clientes/${clienteId}/documentos`, form, { timeout: 60000 });
  return data;
}

// Um documento nunca é eliminado: fica no histórico marcado como anulado.
export async function anularDocumento(docId) {
  const { data } = await api.patch(`/clientes/documentos/${docId}/anular`);
  return data;
}

// Abre o documento (PDF/imagem) guardado na base de dados numa nova aba.
export async function abrirDocumento(docId) {
  const janela = window.open("", "_blank");
  try {
    const res = await api.get(`/clientes/documentos/${docId}`, { responseType: "blob" });
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
