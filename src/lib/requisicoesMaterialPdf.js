import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_CINZA,
  MARGEM_MARCA,
  LARGURA_UTIL_MARCA,
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  desenharKpisMarca,
  tituloSecaoMarca,
  colunasProporcionaisMarca,
  assinaturaMarca,
  finalizarComRodapeMarca,
  formatNumero,
  formatarData,
} from "@/lib/pdfEstilo";

applyPlugin(jsPDF);

const ESTADO_LABEL = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  cancelada: "Cancelada",
  consumida: "Concluída",
};

const SEM_CLIENTE = "Consumo interno / produção";

function texto(v) {
  const t = String(v ?? "").trim();
  return t || "—";
}

function nomeCliente(r) {
  const guardado = String(r?.cliente_nome || "").trim();
  return guardado && guardado !== SEM_CLIENTE ? guardado : SEM_CLIENTE;
}

function dataHora(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-AO")} às ${d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}`;
}

function quantidade(valor, unidade) {
  return `${formatNumero(Number(valor) || 0)} ${unidade || "un"}`;
}

/**
 * Comprovativo de uma requisição de material: dados do pedido, materiais e o
 * registo de quem preparou, entregou e recebeu. É o documento que acompanha a
 * saída do material do stock.
 */
export async function gerarRequisicaoMaterialPdf(requisicao, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const x = MARGEM_MARCA;

  const r = requisicao || {};
  const numero = r.numero || (r.id ? `KREQ-${r.id}` : "KREQ");
  const estado = ESTADO_LABEL[r.estado] || texto(r.estado);
  const cliente = nomeCliente(r);
  const itens = Array.isArray(r.itens) ? r.itens : [];

  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Requisição de Material",
    empresa: org,
    direitos: [numero, estado, `Emissão: ${formatarData(new Date())}`],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COR_MARCA_TEXTO);
  doc.text(
    doc.splitTextToSize(`Cliente: ${cliente}`, LARGURA_UTIL_MARCA).slice(0, 2),
    x,
    y + 4
  );
  y += 14;

  y = desenharKpisMarca(doc, y, [
    { label: "Ordem de produção", value: r.ordem_producao_numero || "—" },
    { label: "Itens pedidos", value: String(itens.length) },
    { label: "Solicitada por", value: texto(r.solicitado_por) },
    { label: "Data", value: formatarData(r.data_requisicao) },
  ]);

  y = tituloSecaoMarca(doc, "Materiais", x, y) + 2;
  doc.autoTable({
    startY: y,
    head: [["Material", "Pedido", "Atendido"]],
    body: itens.length
      ? itens.map((i) => [
          [i.codigo, i.nome].filter(Boolean).join(" — ") || `Material #${i.material_id || "—"}`,
          quantidade(i.quantidade, i.unidade),
          Number(i.quantidade_atendida) > 0 ? quantidade(i.quantidade_atendida, i.unidade) : "—",
        ])
      : [["Sem materiais registados", "—", "—"]],
    ...TEMA_TABELA_MARCA,
    columnStyles: colunasProporcionaisMarca(
      [4, 1.5, 1.5],
      { 1: { halign: "right" }, 2: { halign: "right" } }
    ),
  });
  y = doc.lastAutoTable.finalY + 8;

  const preparado = texto(r.preparado_por);
  const entregue = texto(r.entregue_por);
  const recebido = texto(r.recebido_por);
  if (preparado !== "—" || entregue !== "—" || recebido !== "—" || r.entregue_em) {
    y = tituloSecaoMarca(doc, "Preparação e entrega", x, y) + 2;
    doc.autoTable({
      startY: y,
      head: [["Preparou", "Entregou", "Recebeu", "Data e hora da saída"]],
      body: [[preparado, entregue, recebido, dataHora(r.entregue_em)]],
      ...TEMA_TABELA_MARCA,
      columnStyles: colunasProporcionaisMarca([1.4, 1.4, 1.4, 1.8]),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const motivo = texto(r.motivo_rejeicao);
  const observacoes = texto(r.observacoes);
  if (motivo !== "—" || observacoes !== "—") {
    y = tituloSecaoMarca(doc, "Observações", x, y) + 2;
    const linhas = [];
    if (motivo !== "—") linhas.push(`Motivo da rejeição: ${motivo}`);
    if (observacoes !== "—") linhas.push(observacoes);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(...COR_MARCA_TEXTO);
    const partes = doc.splitTextToSize(linhas.join("\n"), LARGURA_UTIL_MARCA);
    const altura = partes.length * 4.2;
    if (y + altura > ph - 30) {
      doc.addPage();
      y = 30;
    }
    doc.text(partes, x, y + 4);
    y += altura + 10;
  }

  if (y > ph - 40) {
    doc.addPage();
    y = 30;
  }
  assinaturaMarca(doc, y + 8, ["Assinatura — quem entregou", "Assinatura — quem recebeu"]);

  finalizarComRodapeMarca(doc);
  doc.save(`Requisicao_${String(numero).replace(/[^\w-]+/g, "_")}.pdf`);
}

/**
 * Relatório da listagem de requisições (respeita a pesquisa aplicada na ecrã).
 */
export async function gerarRelatorioRequisicoesPdf(requisicoes = [], org = {}, filtros = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const x = MARGEM_MARCA;
  const lista = Array.isArray(requisicoes) ? requisicoes : [];

  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Relatório de Requisições",
    empresa: org,
    direitos: [`Emissão: ${formatarData(new Date())}`],
  });
  desenharMarcaDeAgua(doc, logo);

  const contar = (estado) => lista.filter((r) => r.estado === estado).length;
  let y = desenharKpisMarca(doc, 50, [
    { label: "Total de requisições", value: String(lista.length) },
    { label: "Pendentes", value: String(contar("pendente")) },
    { label: "Aprovadas", value: String(contar("aprovada")) },
    { label: "Rejeitadas", value: String(contar("rejeitada")) },
  ]);
  y += 1;

  const termo = String(filtros?.termo || "").trim();
  if (termo) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text(`Pesquisa aplicada: ${termo}`, x, y + 2);
    y += 5;
  }

  y = tituloSecaoMarca(doc, "Requisições", x, y + 1) + 2;
  doc.autoTable({
    startY: y,
    head: [["Requisição", "OP", "Cliente", "Solicitada por", "Itens", "Data", "Estado"]],
    body: lista.map((r) => [
      r.numero || (r.id ? `#${r.id}` : "—"),
      r.ordem_producao_numero || "—",
      nomeCliente(r),
      texto(r.solicitado_por),
      String((r.itens || []).length || r.total_itens || 0),
      formatarData(r.data_requisicao),
      ESTADO_LABEL[r.estado] || texto(r.estado),
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 4, styles: { fontStyle: "bold" } },
      { content: String(lista.reduce((s, r) => s + ((r.itens || []).length || Number(r.total_itens) || 0), 0)), styles: { fontStyle: "bold", halign: "right" } },
      { content: "", styles: { fontStyle: "bold" } },
      { content: `${lista.length}`, styles: { fontStyle: "bold", halign: "right" } },
    ]],
    ...TEMA_TABELA_MARCA,
    footStyles: {
      fillColor: [244, 244, 244],
      textColor: COR_MARCA_PRINCIPAL,
      fontStyle: "bold",
      fontSize: 7.8,
    },
    columnStyles: colunasProporcionaisMarca(
      [1.3, 1.6, 2.8, 1.8, 0.7, 1.3, 1.3],
      { 4: { halign: "right" }, 6: { halign: "center" } }
    ),
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        const v = String(data.cell.raw);
        if (v === "Rejeitada" || v === "Cancelada") {
          data.cell.styles.textColor = COR_MARCA_SECUNDARIO;
        }
      }
    },
  });

  finalizarComRodapeMarca(doc);
  doc.save(`Relatorio_Requisicoes_${new Date().toISOString().slice(0, 10)}.pdf`);
}
