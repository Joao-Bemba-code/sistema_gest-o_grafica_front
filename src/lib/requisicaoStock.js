// Usa apenas campos já suportados pela API em produção; não exige migração.
const PREFIXO_INTERNA = "Requisição interna: ";

export function dadosBaixaStock(dados) {
  if (dados.tipo_requisicao !== "interna") {
    return { motivo: "Saída para cliente", cliente_nome: String(dados.cliente || "").trim(), observacoes: dados.observacoes || undefined };
  }
  return {
    motivo: `${PREFIXO_INTERNA}${String(dados.destino || "").trim()}`,
    // Contraparte técnica já utilizada pela API para consumo interno, não um cliente.
    cliente_nome: "Consumo interno",
    observacoes: [`Motivo: ${String(dados.motivo || "").trim()}`, String(dados.observacoes || "").trim()].filter(Boolean).join("\n"),
  };
}

export function identificarRequisicaoStock(mov) {
  const motivo = String(mov?.motivo || "");
  const interna = mov?.tipo === "saida" && (motivo.startsWith(PREFIXO_INTERNA) || mov?.tipo_requisicao === "interna" || (!mov?.tipo_requisicao && mov?.cliente_nome === "Consumo interno"));
  return {
    interna,
    destino: interna ? (mov.destino || (motivo.startsWith(PREFIXO_INTERNA) ? motivo.slice(PREFIXO_INTERNA.length) : "") || "Consumo interno") : "",
    identificada: interna || motivo === "Saída para cliente" || mov?.tipo_requisicao === "cliente",
  };
}
