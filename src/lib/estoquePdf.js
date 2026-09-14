import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { formatKz, familias, normalizarFamilia, tiposItem, normalizarTipoItem, entradasEspecificacao } from "./estoque";
import { TEMA_TABELA, formatNumero } from "./pdfEstilo";

const COR_ESTOQUE = [15, 118, 110];
const COR_ESTOQUE_CLARO = [236, 248, 245];
const COR_TEXTO = [30, 41, 59];

applyPlugin(jsPDF);

function origemApi() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");
}

export async function carregarLogo(org) {
  if (!org?.logo_url) return null;
  try {
    const resp = await fetch(`${origemApi()}${org.logo_url}`);
    const blob = await resp.blob();
    if (!resp.ok || !blob.type.startsWith("image")) return null;
    const data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!data) return null;
    const formato = data.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
    const dims = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve(null);
      img.src = data;
    });
    return { data, formato, w: dims?.w, h: dims?.h };
  } catch {
    return null;
  }
}

async function desenharCabecalho(doc, org = {}, titulo) {
  const pw = doc.internal.pageSize.getWidth();
  const box = 30;
  const logo = await carregarLogo(org);

  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, 14, 12 + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(14, 12, box, box, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), 14 + box / 2, 12 + box / 2 + 1, { align: "center" });
  }

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text(org.nome || "SIGRAF", 14, 12 + box + 3);

  const tituloY = 12 + box + 13;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, tituloY);

  const infos = [`Data: ${new Date().toLocaleDateString("pt-BR")}`, `Hora: ${new Date().toLocaleTimeString("pt-BR")}`];
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  infos.forEach((linha, i) => doc.text(linha, pw - 14, tituloY + i * 4.5, { align: "right" }));

  const linhaY = tituloY + 4.5 * infos.length + 2;
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.6);
  doc.line(14, linhaY, pw - 14, linhaY);

  return { tituloY, linhaY, pw, box };
}

const TEMA_RELATORIO = {
  theme: "grid",
  headStyles: { fillColor: COR_ESTOQUE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, cellPadding: 2 },
  bodyStyles: { fontSize: 8, textColor: COR_TEXTO, cellPadding: 2 },
  alternateRowStyles: { fillColor: COR_ESTOQUE_CLARO },
  margin: { left: 14, right: 14 },
};

// Cabeçalho dos relatórios: faixa colorida com logótipo, título e data/hora.
async function desenharCabecalhoRelatorio(doc, org = {}, titulo) {
  const pw = doc.internal.pageSize.getWidth();
  const y = 10;
  const bandX = 10;
  const bandW = pw - 20;
  const bandH = 20;
  const box = 16;
  const boxY = y + (bandH - box) / 2;
  const logo = await carregarLogo(org);

  doc.setFillColor(...COR_ESTOQUE);
  doc.roundedRect(bandX, y, bandW, bandH, 3, 3, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(bandX + 3, boxY, box, box, 2, 2, "F");
  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, bandX + 3 + (box - mmW) / 2, boxY + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setTextColor(...COR_ESTOQUE);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), bandX + 3 + box / 2, boxY + box / 2 + 1, { align: "center" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(org.nome || "SIGRAF", bandX + box + 8, y + 8.5);
  doc.setTextColor(231, 245, 243);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(titulo, bandX + box + 8, y + 14.5);

  doc.setFontSize(7.5);
  doc.setTextColor(230, 240, 240);
  const infos = [`Data: ${new Date().toLocaleDateString("pt-BR")}`, `Hora: ${new Date().toLocaleTimeString("pt-BR")}`];
  infos.forEach((linha, i) => doc.text(linha, pw - 12, y + 5 + i * 4.2, { align: "right" }));

  const linhaY = y + bandH + 5;
  return { tituloY: linhaY, linhaY, pw, box };
}

// Cartões de resumo (KPIs) sob o cabeçalho.
function desenharKpis(doc, y, kpis) {
  const pw = doc.internal.pageSize.getWidth();
  const margem = 10;
  const totalW = pw - margem * 2;
  const gap = 4;
  const n = Math.max(kpis.length, 1);
  const cardW = Math.floor((totalW - gap * (n - 1)) / n);
  const cardH = 15;
  doc.setLineWidth(0.3);
  kpis.forEach((k, i) => {
    const x = margem + i * (cardW + gap);
    doc.setFillColor(...COR_ESTOQUE_CLARO);
    doc.setDrawColor(173, 208, 203);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_TEXTO);
    doc.text(String(k.label || "").toUpperCase(), x + 3, y + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_ESTOQUE);
    doc.text(String(k.value), x + 3, y + 12, { maxWidth: cardW - 6 });
  });
  return y + cardH + 6;
}

function secaoPdf(doc, y, titulo) {
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_TEXTO);
  doc.text(titulo, 14, y);
  doc.setDrawColor(...COR_ESTOQUE);
  doc.setLineWidth(0.7);
  doc.line(14, y + 1.2, 60, y + 1.2);
  return y + 5;
}

function rodapePdf(doc, pw) {
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(10, h - 12, pw - 10, h - 12);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.text(`Gerado por SIGRAF em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pw / 2, h - 8, { align: "center" });
}

export async function gerarRequisicaoPDF(mov, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;

  const mat = mov.material || {};
  const cat = mat.categoria?.nome || "—";
  const ehEntrada = mov.tipo === "entrada";
  const custoUnit = mat.custo_unitario != null ? mat.custo_unitario : mat.custo_unit;
  const custoStr = custoUnit != null && Number(custoUnit) > 0 ? formatKz(custoUnit) : "—";
  const dt = new Date(mov.createdAt);
  const dataStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
  const horaStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleTimeString("pt-BR");
  const parteNome = ehEntrada ? (mov.fornecedor_nome || "—") : (mov.cliente_nome || "—");

  const box = 30;
  const logo = await carregarLogo(org);

  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, 14, 12 + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(14, 12, box, box, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), 14 + box / 2, 12 + box / 2 + 1, { align: "center" });
  }

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text(org.nome || "SIGRAF", 14, 12 + box + 3);

  const tituloY = 12 + box + 13;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Requisição de Material", 14, tituloY);

  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const infos = [`Hora: ${horaStr}`, `Data: ${dataStr}`, `${ehEntrada ? "Fornecedor" : "Cliente"}: ${parteNome}`];
  infos.forEach((linha, i) => doc.text(linha, pw - 14, tituloY + i * 4.5, { align: "right" }));

  const linhaY = tituloY + 4.5 * infos.length + 2;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.6);
  doc.line(14, linhaY, pw - 14, linhaY);

  doc.autoTable({
    startY: linhaY + 6,
    head: [["Código", "Artigo", "Categoria", "Responsável", "Autorizado por"]],
    body: [[mat.codigo || "—", mat.nome || "—", cat, mov.solicitado_por || "—", mov.permitido_por || "—"]],
    ...TEMA_TABELA,
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 56 }, 2: { cellWidth: 34 }, 3: { cellWidth: 34 }, 4: { cellWidth: 34 } },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Materiais e Insumos", 14, y);
  doc.autoTable({
    startY: y + 2,
    head: [["ID", "Nome", "Quantidade", "Custo Unitário"]],
    body: [[mat.id ?? "—", mat.nome || "—", `${Number(mov.quantidade)} ${mat.unidade || "un"}`, custoStr]],
    ...TEMA_TABELA,
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 78 }, 2: { cellWidth: 42, halign: "right" }, 3: { cellWidth: 40, halign: "right" } },
  });

  const yObs = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Observações:", 14, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  const obsText = (mov.observacoes || "").trim() || "—";
  const obsLines = doc.splitTextToSize(obsText, pw - 28);
  doc.text(obsLines, 14, yObs + 5);

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Requisicao_Material_${mov.id}.pdf`);
}

export async function gerarFichaMaterialPDF(mat, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const { tituloY, linhaY } = await desenharCabecalho(doc, org, "Ficha do Material");

  const categoria = mat.categoria?.nome || mat.categoria_nome || "—";
  const linhas = [
    ["Código", mat.codigo || "—"],
    ["Nome", mat.nome || "—"],
    ["Nome Técnico", mat.nome_tecnico || "—"],
    ["Categoria", categoria],
    ["Família", familias[normalizarFamilia(mat.categoria?.familia)]?.label || mat.categoria?.familia || "—"],
    ["Subfamília", mat.categoria?.subfamilia || "—"],
    ["Tipo", tiposItem[normalizarTipoItem(mat.categoria?.tipo)]?.label || "—"],
    ["Fornecedor", mat.fornecedor || "—"],
    ["Unidade", mat.unidade || "—"],
    ...entradasEspecificacao(mat.especificacoes).map((e) => [e.rotulo, e.valor]),
    ["Formato", mat.formato || "—"],
    ["Gramagem", mat.gramagem ? `${mat.gramagem} g/m²` : "—"],
    ["Dimensões", mat.largura || mat.altura ? `${mat.largura || "—"} x ${mat.altura || "—"} mm` : "—"],
    ["Quebra técnica", mat.percentual_quebra ? `${mat.percentual_quebra}%` : "—"],
    ["Rastreabilidade por lote", mat.controla_lote ? "Sim" : "Não"],
    ["Localização na prateleira", mat.localizacao || "—"],
    ["Estoque mínimo", mat.estoque_min != null ? String(mat.estoque_min) : "—"],
    ["Estoque máximo", mat.estoque_max != null ? String(mat.estoque_max) : "—"],
    ["Ponto de pedido", mat.ponto_ressuprimento != null ? String(mat.ponto_ressuprimento) : "—"],
    ["Quantidade atual", mat.quantidade != null ? String(mat.quantidade) : "—"],
    ["Disponível", mat.estoque_disponivel != null ? String(mat.estoque_disponivel) : "—"],
    ["Custo unitário", mat.custo_unitario != null ? formatKz(mat.custo_unitario) : (mat.custo_unit != null ? formatKz(mat.custo_unit) : "—")],
  ];

  doc.autoTable({
    startY: linhaY + 6,
    head: [["Campo", "Valor"]],
    body: linhas,
    ...TEMA_TABELA,
    headStyles: { ...TEMA_TABELA.headStyles, fillColor: COR_ESTOQUE },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 113 } },
  });

  const yObs = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Observações / Armazenagem:", 14, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  const texto = [mat.descricao, mat.especificidade, mat.condicao_armazenagem ? `Condições de armazenagem: ${mat.condicao_armazenagem}` : ""]
    .filter(Boolean)
    .join(" — ") || "—";
  const obsLines = doc.splitTextToSize(texto, pw - 28);
  doc.text(obsLines, 14, yObs + 5);

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Ficha_Material_${(mat.codigo || mat.id || "Material").replace(/[^\w-]+/g, "_")}.pdf`);
}

export async function gerarPedidoPDF(pedido, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const { linhaY } = await desenharCabecalho(doc, org, "Pedido de Compra");

  const numero = pedido.numero || `PED-${pedido.id || ""}`;
  const data = pedido.data_pedido ? new Date(pedido.data_pedido) : null;
  const dataStr = data && !isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "—";
  const itens = (pedido.itens || []).map((i) => ({
    codigo: i.codigo || "—",
    nome: i.nome || "—",
    unidade: i.unidade || "un",
    quantidade: Number(i.quantidade) || 0,
    preco_unit: Number(i.preco_unit) || 0,
    total: Number(i.total) || 0,
  }));
  const total = itens.reduce((s, i) => s + i.total, 0);

  doc.autoTable({
    startY: linhaY + 6,
    head: [["", ""]],
    body: [
      ["Pedido nº", numero],
      ["Fornecedor", pedido.fornecedor_nome || "—"],
      ["Data do pedido", dataStr],
      ["Solicitado por", pedido.solicitado_por || "—"],
    ],
    theme: "plain", styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", textColor: [15, 118, 110] }, 1: { cellWidth: 128 } },
    margin: { left: 14, right: 14 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Código", "Material", "Unid.", "Quantidade", "Preço Unit.", "Total"]],
    body: itens.map((i) => [
      i.codigo,
      i.nome,
      i.unidade,
      String(i.quantidade),
      formatKz(i.preco_unit),
      formatKz(i.total),
    ]),
    foot: [["", "", "", "", "Total", formatKz(total)]],
    ...TEMA_TABELA,
    headStyles: { ...TEMA_TABELA.headStyles, fillColor: COR_ESTOQUE },
    footStyles: { fillColor: [236, 248, 245], textColor: COR_ESTOQUE, fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 62 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
  });

  if (pedido.observacoes) {
    const yObs = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 33, 48);
    doc.text("Observações:", 14, yObs);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    const obsLines = doc.splitTextToSize(String(pedido.observacoes), pw - 28);
    doc.text(obsLines, 14, yObs + 5);
  }

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Pedido_${numero.replace(/[^\w-]+/g, "_")}.pdf`);
}

export async function gerarRelatorioStockPDF(materiais = [], categorias = [], org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, "Relatório de Stock e Categorias");

  const catMap = {};
  materiais.forEach((m) => {
    const cat = m.categoria?.nome || "Sem categoria";
    if (!catMap[cat]) catMap[cat] = { qtd: 0, valorTotal: 0, disponivel: 0, itens: 0 };
    catMap[cat].itens += 1;
    catMap[cat].qtd += Number(m.quantidade) || 0;
    catMap[cat].disponivel += Number(m.estoque_disponivel) || 0;
    catMap[cat].valorTotal += (Number(m.quantidade) || 0) * (Number(m.custo_unit) || 0);
  });

  const catRows = Object.entries(catMap).sort((a, b) => b[1].valorTotal - a[1].valorTotal);
  const totais = catRows.reduce((s, [, d]) => ({
    itens: s.itens + d.itens,
    qtd: s.qtd + d.qtd,
    disp: s.disp + d.disponivel,
    val: s.val + d.valorTotal,
  }), { itens: 0, qtd: 0, disp: 0, val: 0 });

  let y = desenharKpis(doc, ly + 3, [
    { label: "Total de materiais", value: String(totais.itens) },
    { label: "Qtd. em stock", value: formatNumero(totais.qtd) },
    { label: "Disponível", value: formatNumero(totais.disp) },
    { label: "Valor de stock", value: formatKz(totais.val) },
  ]);

  y = secaoPdf(doc, y + 2, "Resumo por Categoria");

  doc.autoTable({
    startY: y,
    head: [["Categoria", "Itens", "Qtd. Total", "Disponível", "Valor Estoque"]],
    body: catRows.map(([nome, d]) => [
      nome,
      String(d.itens),
      formatNumero(d.qtd),
      formatNumero(d.disponivel),
      formatKz(d.valorTotal),
    ]),
    foot: [[{ content: "TOTAL", colSpan: 1, styles: { fontStyle: "bold" } }, { content: String(totais.itens), styles: { fontStyle: "bold", halign: "right" } }, { content: formatNumero(totais.qtd), styles: { fontStyle: "bold", halign: "right" } }, { content: formatNumero(totais.disp), styles: { fontStyle: "bold", halign: "right" } }, { content: formatKz(totais.val), styles: { fontStyle: "bold", halign: "right" } }]],
    ...TEMA_RELATORIO,
    footStyles: { fillColor: COR_ESTOQUE_CLARO, textColor: COR_ESTOQUE, fontStyle: "bold", fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 40 },
    },
  });

  y = doc.lastAutoTable.finalY + 10;
  y = secaoPdf(doc, y, "Detalhe de Materiais");

  const materiaisSorted = [...materiais].sort((a, b) => {
    const sa = a.status === "esgotado" ? 0 : a.status === "repor" ? 1 : 2;
    const sb = b.status === "esgotado" ? 0 : b.status === "repor" ? 1 : 2;
    return sa - sb;
  });

  doc.autoTable({
    startY: y,
    head: [["Material", "Categoria", "Qtd.", "Mín", "Máx", "Ponto", "Custo", "Estado"]],
    body: materiaisSorted.map((m) => [
      m.nome || "—",
      m.categoria?.nome || "—",
      `${formatNumero(m.quantidade)} ${m.unidade || ""}`,
      formatNumero(m.estoque_min),
      formatNumero(m.estoque_max),
      formatNumero(m.ponto_ressuprimento),
      m.custo_unit > 0 ? formatKz(m.custo_unit) : "—",
      m.status === "esgotado" ? "Esgotado" : m.status === "repor" ? "Repôr" : "Ok",
    ]),
    ...TEMA_RELATORIO,
    headStyles: { ...TEMA_RELATORIO.headStyles, fontSize: 7 },
    bodyStyles: { ...TEMA_RELATORIO.bodyStyles, fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 38 },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 14, halign: "right" },
      4: { cellWidth: 14, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: 18, halign: "center" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const v = String(data.cell.raw);
        if (v === "Esgotado") { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = "bold"; }
        else if (v === "Repôr") { data.cell.styles.textColor = [234, 179, 8]; data.cell.styles.fontStyle = "bold"; }
      }
    },
  });

  rodapePdf(doc, pw);
  doc.save(`Relatorio_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function gerarRelatorioCadastrosPDF(clientes = [], org = {}, filtro = "todos") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let titulo = "Relatório de Cadastros";
  if (filtro === "cliente") titulo = "Relatório de Clientes";
  else if (filtro === "fornecedor") titulo = "Relatório de Fornecedores";
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, titulo);

  const lista = filtro === "todos" ? clientes : clientes.filter((c) => c.tipo === filtro);
  const totalClientes = lista.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = lista.filter((c) => c.tipo === "fornecedor").length;

  let y = desenharKpis(doc, ly + 3, [
    { label: "Total de cadastros", value: String(lista.length) },
    { label: "Clientes", value: String(totalClientes) },
    { label: "Fornecedores", value: String(totalFornecedores) },
    { label: filtro === "todos" || filtro === "cliente" ? "Relatório" : "Filtro", value: filtro === "todos" ? "Completo" : filtro === "cliente" ? "Clientes" : "Fornecedores" },
  ]);
  y += 2;

  const colunas = ["Código", "Nome", "Empresa", "NIF", "Telefone", "Email"];
  const linhasCliente = (cs) => cs.map((c) => [c.codigo || "—", c.nome || "—", c.empresa || "—", c.nif || "—", c.telefone || "—", c.email || "—"]);

  const clientesLista = filtro === "fornecedor" ? [] : lista.filter((c) => c.tipo === "cliente");
  if (clientesLista.length > 0) {
    y = secaoPdf(doc, y, `Clientes (${clientesLista.length})`);
    doc.autoTable({
      startY: y,
      head: [colunas],
      body: linhasCliente(clientesLista),
      ...TEMA_RELATORIO,
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 44 },
        2: { cellWidth: 34 },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 24 },
        5: { cellWidth: 42 },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const fornecedoresLista = filtro === "cliente" ? [] : lista.filter((c) => c.tipo === "fornecedor");
  if (fornecedoresLista.length > 0) {
    y = secaoPdf(doc, y, `Fornecedores (${fornecedoresLista.length})`);
    doc.autoTable({
      startY: y,
      head: [colunas],
      body: linhasCliente(fornecedoresLista),
      ...TEMA_RELATORIO,
      columnStyles: {
        0: { cellWidth: 20, fontStyle: "bold" },
        1: { cellWidth: 44 },
        2: { cellWidth: 34 },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 24 },
        5: { cellWidth: 42 },
      },
    });
  }

  rodapePdf(doc, pw);
  const nomeFicheiro = filtro === "todos" ? "Relatorio_Cadastros" : filtro === "cliente" ? "Relatorio_Clientes" : "Relatorio_Fornecedores";
  doc.save(`${nomeFicheiro}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function gerarRelatorioCategoriasPDF(categorias = [], materiais = [], org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, "Relatório de Categorias e Famílias");

  const catMap = {};
  categorias.forEach((c) => {
    const fam = normalizarFamilia(c.familia);
    if (!catMap[fam]) catMap[fam] = [];
    catMap[fam].push(c);
  });

  const materiaisPorCat = {};
  materiais.forEach((m) => {
    const catNome = m.categoria?.nome || m.categoria_nome || "Sem categoria";
    materiaisPorCat[catNome] = (materiaisPorCat[catNome] || 0) + 1;
  });

  const totalMateriais = Object.values(materiaisPorCat).reduce((s, n) => s + n, 0);

  let y = desenharKpis(doc, ly + 3, [
    { label: "Famílias", value: String(Object.keys(catMap).length) },
    { label: "Categorias", value: String(categorias.length) },
    { label: "Materiais em stock", value: String(totalMateriais) },
    { label: "Grupos", value: String(new Set(categorias.map((c) => normalizarTipoItem(c.tipo))).size) },
  ]);
  y += 2;

  Object.entries(catMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([fam, cats]) => {
      if (y + 20 > doc.internal.pageSize.getHeight() - 20) doc.addPage();
      const famCfg = familias[fam];
      doc.setFillColor(...COR_ESTOQUE);
      doc.circle(15.5, y - 1.1, 1.1, "F");
      doc.setFontSize(10.5); doc.setFont("helvetica", "bold");
      doc.setTextColor(...COR_ESTOQUE);
      doc.text(`${famCfg?.label || fam} · ${cats.length} ${cats.length === 1 ? "categoria" : "categorias"}`, 18.5, y);
      y += 2;

      doc.autoTable({
        startY: y,
        head: [["Categoria", "Grupo", "Itens em Stock"]],
        body: cats
          .slice()
          .sort((a, b) => (a.subfamilia || "").localeCompare(b.subfamilia || ""))
          .map((c) => {
            const grupoLabel = tiposItem[normalizarTipoItem(c.tipo)]?.label || "—";
            return [c.descricao || c.subfamilia || c.nome || "—", grupoLabel, String(materiaisPorCat[c.nome] || 0)];
          }),
        foot: [[{ content: `TOTAL ${cats.length}`, colSpan: 2, styles: { fontStyle: "bold" } }, { content: String(cats.reduce((s, c) => s + (materiaisPorCat[c.nome] || 0), 0)), styles: { fontStyle: "bold", halign: "right" } }]],
        ...TEMA_RELATORIO,
        footStyles: { fillColor: COR_ESTOQUE_CLARO, textColor: COR_ESTOQUE, fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 40 },
          2: { cellWidth: 26, halign: "right" },
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    });

  rodapePdf(doc, pw);
  doc.save(`Relatorio_Categorias_${new Date().toISOString().slice(0, 10)}.pdf`);
}
