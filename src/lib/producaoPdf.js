import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_CINZA,
  MARGEM_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
  formatNumero,
  formatarData,
  TEMA_TABELA_MARCA,
} from "@/lib/pdfEstilo";

applyPlugin(jsPDF);

const ESTADO_LABEL = {
  aguardando: "Aguardando",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  entregue: "Entregue",
};

function texto(v) {
  if (v && typeof v === "object") {
    return String(v.nome || v.razao_social || v.descricao || "").trim() || "—";
  }
  const t = String(v ?? "").trim();
  return t || "—";
}

/**
 * Materiais apenas para produtos/serviços compostos com material de stock.
 * As quantidades vêm guardadas por unidade do item, por isso multiplica-se
 * pela quantidade do item para obter o total a consumir na OP.
 * Se a OP não tiver orçamento ligado, usa as reservas de stock como lista simples.
 */
function materiaisDaOrdem(op, matPorId = {}) {
  const itens = Array.isArray(op?.orcamentoDados?.orcamento_items) ? op.orcamentoDados.orcamento_items : [];
  const linhas = [];
  itens.forEach((it) => {
    const fator = Number(it.quantidade) || 1;
    const nomeItem = it.descricao || "—";
    (it.materiais || [])
      .filter((m) => m.material_id)
      .forEach((m) => {
        linhas.push([
          nomeItem,
          m.descricao || `Material #${m.material_id}`,
          `${formatNumero(Number((m.quantidade || 0) * fator).toFixed(2))} ${m.unidade || "un"}`,
        ]);
      });
  });
  if (linhas.length) return linhas;

  const reservas = Array.isArray(op?.reserva_estoques) ? op.reserva_estoques : [];
  return reservas.map((r) => {
    const m = matPorId?.[r.material_id] || {};
    const nome = [m.codigo, m.nome].filter(Boolean).join(" — ") || `Material #${r.material_id}`;
    return [
      "—",
      nome,
      `${formatNumero(Number(r.quantidade_reservada || 0))} ${m.unidade || "un"}${r.lote ? ` · Lote ${r.lote}` : ""}`,
    ];
  });
}

/**
 * Folha de trabalho da Ordem de Produção, no estilo do orçamento:
 * apenas detalhes técnicos (sem preços). Materiais aparecem só quando há
 * composição com material de stock; caso contrário fica serviço/produto + quantidade.
 */
export default async function gerarOrdemProducaoPdf(op, org = {}, matPorId = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const x = MARGEM_MARCA;
  const w = pw - MARGEM_MARCA * 2;

  const numero = op?.numero || (op?.id ? `OP-${op.id}` : "OP");
  const impressoEm = new Date();
  const estado = ESTADO_LABEL[op?.estado || op?.status] || op?.estado || "—";
  const clienteDados = op?.clienteDados || (op?.cliente && typeof op.cliente === "object" ? op.cliente : null);

  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Ordem de Produção",
    empresa: org,
    direitos: [numero, estado, `Impresso em ${formatarData(impressoEm)}`],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = 50;

  // ─── Cliente (apenas o nome) ───
  const nomeCliente = (clienteDados?.nome || texto(op?.cliente) || "—").trim() || "—";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COR_MARCA_TEXTO);
  doc.text(`Cliente: ${nomeCliente}`, x, y + 4);
  y += 14;

  // ─── Dados da OP ───
  const campos = [
    { rotulo: "OP / Encomenda", valor: numero },
    { rotulo: "Quantidade", valor: op?.quantidade != null && op?.quantidade !== "" ? formatNumero(op?.quantidade) : "—" },
    { rotulo: "Data de entrada", valor: formatarData(op?.data_entrada || op?.dataEntrada) },
    { rotulo: "Data de entrega", valor: formatarData(op?.data_entrega || op?.dataEntrega) },
  ];
  const hInfo = 15;
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(x, y, w, hInfo, 2.5, 2.5, "F");
  const colW = (w - 18 - 18) / 4;
  campos.forEach((c, i) => {
    const cx = x + 9 + i * (colW + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.setTextColor(...COR_MARCA_SECUNDARIO);
    doc.text(c.rotulo.toUpperCase(), cx, y + 6, { charSpace: 0.2 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.setTextColor(...COR_MARCA_TEXTO);
    doc.text(doc.splitTextToSize(String(c.valor), colW).slice(0, 1)[0] || "—", cx, y + 11.5);
  });
  y += hInfo + 8;

  // ─── Serviços / Produtos ───
  const itens = Array.isArray(op?.orcamentoDados?.orcamento_items) ? op.orcamentoDados.orcamento_items : [];
  const produtos = itens.length
    ? itens
    : op?.produto
      ? [{ descricao: op.produto, quantidade: op.quantidade }]
      : [];

  if (produtos.length) {
    y = tituloSecaoMarca(doc, "Serviços / Produtos", x, y) + 2;
    doc.autoTable({
      startY: y,
      head: [["Descrição", "Qtd"]],
      body: produtos.map((it) => [it.descricao || "—", formatNumero(it.quantidade)]),
      ...TEMA_TABELA_MARCA,
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center", cellWidth: 24 } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ─── Serviços (mão de obra do orçamento) ───
  const servicos = Array.isArray(op?.orcamentoDados?.servicos) ? op.orcamentoDados.servicos : [];
  if (servicos.length) {
    y = tituloSecaoMarca(doc, "Serviços", x, y) + 2;
    doc.autoTable({
      startY: y,
      head: [["Descrição", "Trabalhadores", "Prazo", "Duração"]],
      body: servicos.map((sv) => {
        const prazoExecucao = sv.prazoExecucao ?? sv.prazo_execucao ?? 1;
        const unidade = sv.prazoUnidade || sv.prazo_unidade || "dias";
        const duracaoHoras = sv.duracaoHoras ?? sv.duracao_horas ?? 0;
        const prazoLabel = unidade === "horas" ? "hora" : unidade === "minutos" ? "minuto" : "dia";
        const plural = Number(prazoExecucao) !== 1;
        return [
          sv.descricao || "—",
          sv.mob != null && sv.mob !== "" ? String(sv.mob) : "—",
          `${prazoExecucao} ${prazoLabel}${plural ? "s" : ""}`,
          duracaoHoras ? `${duracaoHoras}h` : "—",
        ];
      }),
      ...TEMA_TABELA_MARCA,
      headStyles: { ...TEMA_TABELA_MARCA.headStyles, fillColor: COR_MARCA_FUNDO, textColor: COR_MARCA_PRINCIPAL },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ─── Materiais (apenas material de stock, listado por serviço/produto) ───
  const materiais = materiaisDaOrdem(op, matPorId);
  if (materiais.length) {
    y = tituloSecaoMarca(doc, "Materiais", x, y) + 2;
    doc.autoTable({
      startY: y,
      head: [["Serviço / Produto", "Material", "Qtd"]],
      body: materiais,
      ...TEMA_TABELA_MARCA,
      headStyles: { ...TEMA_TABELA_MARCA.headStyles, fillColor: COR_MARCA_FUNDO, textColor: COR_MARCA_PRINCIPAL },
      columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "center", cellWidth: 42 } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ─── Rodapé ───
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFontSize(6.6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text(
      `${numero} · impresso em ${formatarData(impressoEm)} · documento de trabalho`,
      MARGEM_MARCA,
      ph - 8
    );
    doc.text(`Página ${p} de ${total}`, pw - MARGEM_MARCA, ph - 8, { align: "right" });
  }

  doc.save(`${String(numero).replace(/[^\w-]+/g, "_")}_ordem_producao.pdf`);
}
