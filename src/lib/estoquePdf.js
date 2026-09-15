import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatKz, familias, normalizarFamilia, tiposItem, normalizarTipoItem, entradasEspecificacao } from "./estoque";
import { TEMA_TABELA, formatNumero } from "./pdfEstilo";

// ─────────────────────────────────────────────────────────────
// PALETA MONOCROMÁTICA (preto / branco / cinzas)
// ─────────────────────────────────────────────────────────────
const PRETO = [17, 17, 17];
const PRETO_SUAVE = [38, 38, 38];
const CINZA_ESCURO = [64, 64, 64];
const CINZA_MEDIO = [120, 120, 120];
const CINZA_CLARO = [230, 230, 230];
const CINZA_MUITO_CLARO = [245, 245, 245];
const BRANCO = [255, 255, 255];

const COR_TEXTO = [30, 41, 59];
const MARGEM = 12;
const LARGURA_A4 = 210;
const ALTURA_A4 = 297;

// Largura útil real disponível para tabelas (igual ao cabeçalho)
const LARGURA_UTIL = LARGURA_A4 - MARGEM * 2; // = 186mm

// ------------------------------------------------------------
// Helper: distribui larguras proporcionalmente, garantindo
// que a soma final é EXATAMENTE LARGURA_UTIL.
// ------------------------------------------------------------
function colunasProporcionais(pesos, opcoes = {}) {
  if (!Array.isArray(pesos) || pesos.length === 0) return {};
  const totalPeso = pesos.reduce((s, p) => s + Math.max(0, Number(p) || 0), 0) || 1;
  const estilos = {};
  let acumulado = 0;
  pesos.forEach((peso, i) => {
    let largura;
    if (i === pesos.length - 1) {
      largura = +(LARGURA_UTIL - acumulado).toFixed(2);
    } else {
      largura = +((LARGURA_UTIL * peso) / totalPeso).toFixed(2);
      acumulado += largura;
    }
    const extra = opcoes[i] || {};
    estilos[i] = { cellWidth: largura, ...extra };
  });
  return estilos;
}

const MARGEM_TABELA = { left: MARGEM, right: MARGEM, top: 22, bottom: 18 };

function origemApi() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");
}

function dataHoraAgora() {
  const agora = new Date();
  return {
    data: agora.toLocaleDateString("pt-PT"),
    hora: agora.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ============================================================
// LOGO
// ============================================================
export async function carregarLogo(org) {
  if (!org?.logo_url) return null;
  try {
    const resp = await fetch(`${origemApi()}${org.logo_url}`);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (!blob.type.startsWith("image")) return null;
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
    if (!dims?.w || !dims?.h) return null;
    return { data, formato, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

// ============================================================
// CABEÇALHO PADRÃO (Ficha de Material / Requisição)
// ============================================================
async function desenharCabecalho(doc, org = {}, titulo) {
  const pw = doc.internal.pageSize.getWidth();
  const box = 26;
  const logo = await carregarLogo(org);
  const { data, hora } = dataHoraAgora();

  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, MARGEM, 12 + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setFillColor(...PRETO);
    doc.roundedRect(MARGEM, 12, box, box, 4, 4, "F");
    doc.setTextColor(...BRANCO);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), MARGEM + box / 2, 12 + box / 2 + 1, { align: "center" });
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text(org.nome || "SIGRAF", MARGEM, 12 + box + 3);

  const tituloY = 12 + box + 13;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, MARGEM, tituloY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CINZA_ESCURO);
  doc.text(`Data: ${data}`, pw - MARGEM, tituloY - 4, { align: "right" });
  doc.text(`Hora: ${hora}`, pw - MARGEM, tituloY + 1.5, { align: "right" });

  const linhaY = tituloY + 5;
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.6);
  doc.line(MARGEM, linhaY, pw - MARGEM, linhaY);

  return { tituloY, linhaY, pw, box };
}

// ============================================================
// TEMA DE TABELA PADRÃO (preto e branco)
// ============================================================
const TEMA_RELATORIO = {
  theme: "grid",
  headStyles: {
    fillColor: PRETO,
    textColor: BRANCO,
    fontStyle: "bold",
    fontSize: 8,
    cellPadding: 2,
    halign: "left",
    lineColor: PRETO,
    lineWidth: 0.1,
  },
  bodyStyles: {
    fontSize: 8,
    textColor: PRETO,
    cellPadding: 2,
    overflow: "linebreak",
    lineColor: CINZA_CLARO,
    lineWidth: 0.1,
  },
  alternateRowStyles: { fillColor: CINZA_MUITO_CLARO },
  margin: MARGEM_TABELA,
  tableWidth: LARGURA_UTIL,
  styles: {
    overflow: "linebreak",
    lineColor: CINZA_CLARO,
    lineWidth: 0.1,
    cellPadding: 2,
  },
};

// ============================================================
// CABEÇALHO DE RELATÓRIO (faixa preta)
// ============================================================
async function desenharCabecalhoRelatorio(doc, org = {}, titulo) {
  const pw = doc.internal.pageSize.getWidth();
  const y = 10;
  const bandX = MARGEM;
  const bandW = LARGURA_UTIL;
  const bandH = 18;
  const box = 14;
  const boxY = y + (bandH - box) / 2;
  const logo = await carregarLogo(org);
  const { data, hora } = dataHoraAgora();

  doc.setFillColor(...PRETO);
  doc.roundedRect(bandX, y, bandW, bandH, 3, 3, "F");

  doc.setFillColor(...BRANCO);
  doc.roundedRect(bandX + 3, boxY, box, box, 2, 2, "F");
  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, bandX + 3 + (box - mmW) / 2, boxY + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setTextColor(...PRETO);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), bandX + 3 + box / 2, boxY + box / 2 + 1, { align: "center" });
  }

  doc.setTextColor(...BRANCO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(org.nome || "SIGRAF", bandX + box + 8, y + 7.5);

  doc.setTextColor(...CINZA_CLARO);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(titulo, bandX + box + 8, y + 13.5);

  doc.setFontSize(7.5);
  doc.setTextColor(...CINZA_CLARO);
  doc.text(`Data: ${data}`, pw - MARGEM - 3, y + 6, { align: "right" });
  doc.text(`Hora: ${hora}`, pw - MARGEM - 3, y + 11, { align: "right" });

  return { linhaY: y + bandH + 5, pw, box };
}

// ============================================================
// KPIs (cartões em cinza)
// ============================================================
function desenharKpis(doc, y, kpis) {
  const totalW = LARGURA_UTIL;
  const gap = 3;
  const lista = Array.isArray(kpis) && kpis.length > 0 ? kpis : [{ label: "—", value: "—" }];
  const n = lista.length;
  const cardW = (totalW - gap * (n - 1)) / n;
  const cardH = 14;

  doc.setLineWidth(0.3);
  lista.forEach((k, i) => {
    const x = MARGEM + i * (cardW + gap);
    doc.setFillColor(...CINZA_CLARO);
    doc.setDrawColor(...CINZA_MEDIO);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA_ESCURO);
    doc.text(String(k.label || "").toUpperCase(), x + 2.5, y + 4.5, { maxWidth: cardW - 5 });
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text(String(k.value), x + 2.5, y + 11, { maxWidth: cardW - 5 });
  });
  return y + cardH + 5;
}

// ============================================================
// SECÇÃO
// ============================================================
function secaoPdf(doc, y, titulo) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text(titulo, MARGEM, y);
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.6);
  doc.line(MARGEM, y + 1.2, MARGEM + 40, y + 1.2);
  return y + 5;
}

// ============================================================
// RODAPÉ (desenhado em todas as páginas)
// ============================================================
function desenharRodapePagina(doc, paginaAtual, totalPaginas) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const { data, hora } = dataHoraAgora();

  doc.setDrawColor(...CINZA_CLARO);
  doc.setLineWidth(0.3);
  doc.line(MARGEM, ph - 10, pw - MARGEM, ph - 10);

  doc.setTextColor(...CINZA_MEDIO);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado por SIGRAF em ${data} às ${hora}`, MARGEM, ph - 6);
  doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pw - MARGEM, ph - 6, { align: "right" });
}

function finalizarComRodape(doc) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    desenharRodapePagina(doc, i, total);
  }
}

// ============================================================
// REQUISIÇÃO DE MATERIAL
// ============================================================
export async function gerarRequisicaoPDF(mov, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const { linhaY } = await desenharCabecalho(doc, org, "Requisição de Material");

  const mat = mov.material || {};
  const cat = mat.categoria?.nome || "—";
  const ehEntrada = mov.tipo === "entrada";
  const custoUnit = mat.custo_unitario != null ? mat.custo_unitario : mat.custo_unit;
  const custoStr = custoUnit != null && Number(custoUnit) > 0 ? formatKz(custoUnit) : "—";

  const dt = new Date(mov.createdAt);
  const dataStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-PT");
  const horaStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleTimeString("pt-PT");
  const parteNome = ehEntrada ? (mov.fornecedor_nome || "—") : (mov.cliente_nome || "—");

  autoTable(doc, {
    startY: linhaY + 6,
    head: [["Código", "Artigo", "Categoria", "Responsável", "Autorizado por"]],
    body: [[mat.codigo || "—", mat.nome || "—", cat, mov.solicitado_por || "—", mov.permitido_por || "—"]],
    ...TEMA_RELATORIO,
    columnStyles: colunasProporcionais([1.4, 3, 2, 1.8, 1.8]),
  });

  let y = doc.lastAutoTable.finalY + 8;
  y = secaoPdf(doc, y, "Materiais e Insumos");

  autoTable(doc, {
    startY: y,
    head: [["ID", "Nome", "Quantidade", "Custo Unitário"]],
    body: [[mat.id ?? "—", mat.nome || "—", `${Number(mov.quantidade)} ${mat.unidade || "un"}`, custoStr]],
    ...TEMA_RELATORIO,
    columnStyles: colunasProporcionais(
      [1, 4, 1.6, 1.4],
      { 0: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } }
    ),
  });

  const yObs = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text("Observações:", MARGEM, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CINZA_ESCURO);
  const obsText = (mov.observacoes || "").trim() || "—";
  const obsLines = doc.splitTextToSize(obsText, LARGURA_UTIL);
  doc.text(obsLines, MARGEM, yObs + 5);

  doc.setFontSize(8);
  doc.setTextColor(...CINZA_ESCURO);
  doc.text(`${ehEntrada ? "Fornecedor" : "Cliente"}: ${parteNome}`, MARGEM, yObs + 12);

  finalizarComRodape(doc);
  doc.save(`Requisicao_Material_${mov.id || "doc"}.pdf`);
}

// ============================================================
// FICHA DE MATERIAL
// ============================================================
export async function gerarFichaMaterialPDF(mat, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const { linhaY } = await desenharCabecalho(doc, org, "Ficha do Material");

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
    ["Estoque mínimo", mat.estoque_min != null ? formatNumero(mat.estoque_min) : "—"],
    ["Estoque máximo", mat.estoque_max != null ? formatNumero(mat.estoque_max) : "—"],
    ["Ponto de pedido", mat.ponto_ressuprimento != null ? formatNumero(mat.ponto_ressuprimento) : "—"],
    ["Quantidade atual", mat.quantidade != null ? formatNumero(mat.quantidade) : "—"],
    ["Disponível", mat.estoque_disponivel != null ? formatNumero(mat.estoque_disponivel) : "—"],
    ["Custo unitário", mat.custo_unitario != null ? formatKz(mat.custo_unitario) : (mat.custo_unit != null ? formatKz(mat.custo_unit) : "—")],
  ];

  autoTable(doc, {
    startY: linhaY + 6,
    head: [["Campo", "Valor"]],
    body: linhas,
    ...TEMA_RELATORIO,
    columnStyles: colunasProporcionais([1, 3], { 0: { fontStyle: "bold" } }),
  });

  const yObs = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text("Observações / Armazenagem:", MARGEM, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CINZA_ESCURO);
  const texto = [mat.descricao, mat.especificidade, mat.condicao_armazenagem ? `Condições de armazenagem: ${mat.condicao_armazenagem}` : ""]
    .filter(Boolean)
    .join(" — ") || "—";
  const obsLines = doc.splitTextToSize(texto, LARGURA_UTIL);
  doc.text(obsLines, MARGEM, yObs + 5);

  finalizarComRodape(doc);
  doc.save(`Ficha_Material_${(mat.codigo || mat.id || "Material").replace(/[^\w-]+/g, "_")}.pdf`);
}

// ============================================================
// PEDIDO DE COMPRA
// ============================================================
export async function gerarPedidoPDF(pedido, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const { linhaY } = await desenharCabecalho(doc, org, "Pedido de Compra");

  const numero = pedido.numero || `PED-${pedido.id || ""}`;
  const data = pedido.data_pedido ? new Date(pedido.data_pedido) : null;
  const dataStr = data && !isNaN(data.getTime()) ? data.toLocaleDateString("pt-PT") : "—";
  const itens = (pedido.itens || []).map((i) => ({
    codigo: i.codigo || "—",
    nome: i.nome || "—",
    unidade: i.unidade || "un",
    quantidade: Number(i.quantidade) || 0,
    preco_unit: Number(i.preco_unit) || 0,
    total: Number(i.total) || 0,
  }));
  const total = itens.reduce((s, i) => s + i.total, 0);

  autoTable(doc, {
    startY: linhaY + 6,
    head: [["", ""]],
    body: [
      ["Pedido nº", numero],
      ["Fornecedor", pedido.fornecedor_nome || "—"],
      ["Data do pedido", dataStr],
      ["Solicitado por", pedido.solicitado_por || "—"],
    ],
    theme: "plain",
    tableWidth: LARGURA_UTIL,
    styles: { fontSize: 9, cellPadding: 1.5, overflow: "linebreak" },
    margin: MARGEM_TABELA,
    columnStyles: colunasProporcionais([1, 3], {
      0: { fontStyle: "bold", textColor: PRETO },
    }),
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Código", "Material", "Unid.", "Quantidade", "Preço Unit.", "Total"]],
    body: itens.map((i) => [
      i.codigo,
      i.nome,
      i.unidade,
      formatNumero(i.quantidade),
      formatKz(i.preco_unit),
      formatKz(i.total),
    ]),
    foot: [["", "", "", "", "Total", formatKz(total)]],
    ...TEMA_RELATORIO,
    footStyles: {
      fillColor: CINZA_CLARO,
      textColor: PRETO,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: colunasProporcionais(
      [1.2, 3.2, 0.8, 1.5, 1.5, 1.5],
      {
        0: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      }
    ),
  });

  if (pedido.observacoes) {
    const yObs = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text("Observações:", MARGEM, yObs);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA_ESCURO);
    const obsLines = doc.splitTextToSize(String(pedido.observacoes), LARGURA_UTIL);
    doc.text(obsLines, MARGEM, yObs + 5);
  }

  finalizarComRodape(doc);
  doc.save(`Pedido_${numero.replace(/[^\w-]+/g, "_")}.pdf`);
}

// ============================================================
// RELATÓRIO DE STOCK
// ============================================================
export async function gerarRelatorioStockPDF(materiais = [], categorias = [], org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
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

  autoTable(doc, {
    startY: y,
    head: [["Categoria", "Itens", "Qtd. Total", "Disponível", "Valor Estoque"]],
    body: catRows.map(([nome, d]) => [
      nome,
      String(d.itens),
      formatNumero(d.qtd),
      formatNumero(d.disponivel),
      formatKz(d.valorTotal),
    ]),
    foot: [[
      { content: "TOTAL", styles: { fontStyle: "bold" } },
      { content: String(totais.itens), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumero(totais.qtd), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatNumero(totais.disp), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatKz(totais.val), styles: { fontStyle: "bold", halign: "right" } },
    ]],
    ...TEMA_RELATORIO,
    footStyles: {
      fillColor: CINZA_CLARO,
      textColor: PRETO,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: colunasProporcionais(
      [3, 0.8, 1.3, 1.3, 1.6],
      { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } }
    ),
  });

  y = doc.lastAutoTable.finalY + 10;
  y = secaoPdf(doc, y, "Detalhe de Materiais");

  const materiaisSorted = [...materiais].sort((a, b) => {
    const sa = a.status === "esgotado" ? 0 : a.status === "repor" ? 1 : 2;
    const sb = b.status === "esgotado" ? 0 : b.status === "repor" ? 1 : 2;
    return sa - sb;
  });

  autoTable(doc, {
    startY: y,
    head: [["Material", "Categoria", "Qtd.", "Mín", "Máx", "Ponto", "Custo", "Estado"]],
    body: materiaisSorted.map((m) => [
      m.nome || "—",
      m.categoria?.nome || "—",
      `${formatNumero(m.quantidade)} ${m.unidade || ""}`.trim(),
      formatNumero(m.estoque_min),
      formatNumero(m.estoque_max),
      formatNumero(m.ponto_ressuprimento),
      m.custo_unit > 0 ? formatKz(m.custo_unit) : "—",
      m.status === "esgotado" ? "Esgotado" : m.status === "repor" ? "Repôr" : "Ok",
    ]),
    ...TEMA_RELATORIO,
    headStyles: { ...TEMA_RELATORIO.headStyles, fontSize: 7.5 },
    bodyStyles: { ...TEMA_RELATORIO.bodyStyles, fontSize: 7.5 },
    columnStyles: colunasProporcionais(
      [2.8, 2, 1.4, 0.8, 0.8, 0.8, 1.4, 1],
      {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "center" },
      }
    ),
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const v = String(data.cell.raw);
        if (v === "Esgotado") {
          data.cell.styles.textColor = PRETO;
          data.cell.styles.fontStyle = "bold";
        } else if (v === "Repôr") {
          data.cell.styles.textColor = CINZA_ESCURO;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  finalizarComRodape(doc);
  doc.save(`Relatorio_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// RELATÓRIO DE CADASTROS
// ============================================================
export async function gerarRelatorioCadastrosPDF(clientes = [], org = {}, filtro = "todos") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
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
    {
      label: "Filtro aplicado",
      value: filtro === "todos" ? "Completo" : filtro === "cliente" ? "Clientes" : "Fornecedores",
    },
  ]);
  y += 2;

  const colunas = ["Código", "Nome", "Empresa", "NIF", "Telefone", "Email"];
  const linhasCliente = (cs) => cs.map((c) => [
    c.codigo || "—",
    c.nome || "—",
    c.empresa || "—",
    c.nif || "—",
    c.telefone || "—",
    c.email || "—",
  ]);

  const colStyles = colunasProporcionais(
    [1, 2.6, 2, 1.2, 1.5, 2],
    {
      0: { fontStyle: "bold" },
      3: { halign: "center" },
    }
  );

  const clientesLista = filtro === "fornecedor" ? [] : lista.filter((c) => c.tipo === "cliente");
  if (clientesLista.length > 0) {
    y = secaoPdf(doc, y, `Clientes (${clientesLista.length})`);
    autoTable(doc, {
      startY: y,
      head: [colunas],
      body: linhasCliente(clientesLista),
      ...TEMA_RELATORIO,
      columnStyles: colStyles,
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const fornecedoresLista = filtro === "cliente" ? [] : lista.filter((c) => c.tipo === "fornecedor");
  if (fornecedoresLista.length > 0) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 22;
    }
    y = secaoPdf(doc, y, `Fornecedores (${fornecedoresLista.length})`);
    autoTable(doc, {
      startY: y,
      head: [colunas],
      body: linhasCliente(fornecedoresLista),
      ...TEMA_RELATORIO,
      columnStyles: colStyles,
    });
  }

  finalizarComRodape(doc);
  const nomeFicheiro =
    filtro === "todos"
      ? "Relatorio_Cadastros"
      : filtro === "cliente"
      ? "Relatorio_Clientes"
      : "Relatorio_Fornecedores";
  doc.save(`${nomeFicheiro}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// RELATÓRIO DE CATEGORIAS E FAMÍLIAS
// Agrupa por GRUPO › cada linha tem Família | Subfamília | Itens
// Faixa do grupo em CINZA (não preta)
// ============================================================
export async function gerarRelatorioCategoriasPDF(categorias = [], materiais = [], org = {}, filtros = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, "Relatório de Categorias e Famílias");

  // ── Filtros aplicados (Famílias / Grupos) ──
  const resolverGrupo = (c) => tiposItem[normalizarTipoItem(c.tipo)]?.label || String(c.tipo || "").trim() || "Sem grupo";
  const famLabelDe = (c) => familias[normalizarFamilia(c.familia)]?.label || c.familia || "Sem família";
  const famsSel = Array.isArray(filtros?.familias) ? filtros.familias : [];
  const grpsSel = Array.isArray(filtros?.grupos) ? filtros.grupos : [];
  const categoriasFiltradas = categorias.filter(
    (c) =>
      (famsSel.length === 0 || famsSel.includes(famLabelDe(c))) &&
      (grpsSel.length === 0 || grpsSel.includes(resolverGrupo(c)))
  );

  // ── Contar materiais por categoria (id + nome como fallback) ──
  const materiaisPorCatId = {};
  const materiaisPorCatNome = {};
  materiais.forEach((m) => {
    if (m.categoria_id != null) {
      const k = String(m.categoria_id);
      materiaisPorCatId[k] = (materiaisPorCatId[k] || 0) + 1;
    }
    const nome = m.categoria?.nome || m.categoria_nome || "Sem categoria";
    materiaisPorCatNome[nome] = (materiaisPorCatNome[nome] || 0) + 1;
  });

  const contarItens = (c) => {
    if (c.id != null && materiaisPorCatId[String(c.id)] != null) {
      return materiaisPorCatId[String(c.id)];
    }
    const chaveNome = c.descricao || c.subfamilia || c.nome;
    return chaveNome ? materiaisPorCatNome[chaveNome] || 0 : 0;
  };

  // ── Agrupar por GRUPO › FAMÍLIA › SUBFAMÍLIA ──
  const grupos = {};
  categoriasFiltradas.forEach((c) => {
    const grupoLabel = tiposItem[normalizarTipoItem(c.tipo)]?.label || String(c.tipo || "").trim() || "Sem grupo";
    const famCfg = familias[normalizarFamilia(c.familia)];
    const famLabel = famCfg?.label || c.familia || "Sem família";
    const subLabel = String(c.subfamilia || "").trim() || "Sem subfamília";
    const itens = contarItens(c);

    if (!grupos[grupoLabel]) grupos[grupoLabel] = { total: 0, familias: {} };
    const g = grupos[grupoLabel];
    g.total += 1;

    if (!g.familias[famLabel]) g.familias[famLabel] = {};
    const f = g.familias[famLabel];

    if (!f[subLabel]) f[subLabel] = 0;
    f[subLabel] += itens;
  });

  // ── KPIs de topo ──
  const totalCategorias = categoriasFiltradas.length;
  const totalGrupos = Object.keys(grupos).length;
  const totalFamilias = new Set(
    categoriasFiltradas.map((c) => familias[normalizarFamilia(c.familia)]?.label || c.familia || "Sem família")
  ).size;
  const catsFiltradasId = new Set(categoriasFiltradas.map((c) => String(c.id)));
  const nomesFiltrados = new Set(categoriasFiltradas.map((c) => String(c.nome).trim().toLowerCase()));
  const totalMateriais = materiais.filter((m) => {
    if (famsSel.length === 0 && grpsSel.length === 0) return true;
    if (m.categoria_id != null) return catsFiltradasId.has(String(m.categoria_id));
    return nomesFiltrados.has(String(m.categoria?.nome || m.categoria_nome || "").trim().toLowerCase());
  }).length;

  let y = desenharKpis(doc, ly + 3, [
    { label: "Grupos", value: String(totalGrupos) },
    { label: "Famílias", value: String(totalFamilias) },
    { label: "Categorias", value: String(totalCategorias) },
    { label: "Materiais em stock", value: String(totalMateriais) },
  ]);
  y += 3;

  if (totalCategorias === 0) {
    doc.setFontSize(10);
    doc.setTextColor(...CINZA_MEDIO);
    doc.text(famsSel.length > 0 || grpsSel.length > 0 ? "Nenhuma categoria corresponde aos filtros aplicados." : "Nenhuma categoria registada.", MARGEM, y + 6);
    finalizarComRodape(doc);
    doc.save(`Relatorio_Categorias_${new Date().toISOString().slice(0, 10)}.pdf`);
    return;
  }

  // ── Ordenar grupos alfabeticamente ──
  const gruposOrdenados = Object.entries(grupos).sort((a, b) =>
    a[0].localeCompare(b[0], "pt")
  );

  gruposOrdenados.forEach(([grupoLabel, g]) => {
    if (y + 30 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 22;
    }

    // ── Faixa de título do GRUPO em CINZA ──
    doc.setFillColor(...CINZA_CLARO);
    doc.setDrawColor(...CINZA_MEDIO);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGEM, y - 4, LARGURA_UTIL, 8, 1.5, 1.5, "FD");
    doc.setTextColor(...PRETO);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(grupoLabel.toUpperCase(), MARGEM + 3, y + 1);
    y += 8;

    // ── Linhas: Família (sempre) | Subfamília | Itens ──
    const linhas = [];
    const familiasOrdenadas = Object.entries(g.familias).sort((a, b) =>
      a[0].localeCompare(b[0], "pt")
    );

    familiasOrdenadas.forEach(([famLabel, subsMap]) => {
      const subsOrdenadas = Object.entries(subsMap).sort((a, b) =>
        a[0].localeCompare(b[0], "pt")
      );
      subsOrdenadas.forEach(([subLabel, qtdItens]) => {
        linhas.push([
          famLabel,
          subLabel,
          String(qtdItens),
        ]);
      });
    });

    const totalItensGrupo = linhas.reduce((s, l) => s + (Number(l[2]) || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [["Família", "Subfamília", "Itens"]],
      body: linhas,
      foot: [[
        {
          content: `TOTAL ${grupoLabel}`,
          colSpan: 2,
          styles: { fontStyle: "bold" },
        },
        {
          content: String(totalItensGrupo),
          styles: { fontStyle: "bold", halign: "right" },
        },
      ]],
      ...TEMA_RELATORIO,
      footStyles: {
        fillColor: CINZA_CLARO,
        textColor: PRETO,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: colunasProporcionais(
        [3, 3.6, 1.2],
        {
          2: { halign: "right" },
        }
      ),
    });

    y = doc.lastAutoTable.finalY + 8;
  });

  finalizarComRodape(doc);
  doc.save(`Relatorio_Categorias_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// RELATÓRIO DE FATURAÇÃO (ÁREA COMERCIAL)
// Respeita os filtros de estado e tipo seleccionados
// ============================================================
export async function gerarRelatorioFaturacoesPDF(faturas = [], org = {}, filtros = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, "Relatório de Faturação");

  const estados = Array.isArray(filtros?.estados) ? filtros.estados : [];
  const tipos = Array.isArray(filtros?.tipos) ? filtros.tipos : [];
  const lista = faturas.filter(
    (f) =>
      (estados.length === 0 || estados.includes(f.estado)) &&
      (tipos.length === 0 || tipos.includes(f.tipo))
  );

  const tipoLabel = (t) =>
    t === "factura_recibo" ? "Factura-recibo" : t === "recibo" ? "Recibo" : t === "factura" ? "Fatura" : t || "—";
  const estadoLabel = (e) =>
    e === "paga" ? "Paga" : e === "parcial" ? "Pagamento parcial" : e === "emitida" ? "Emitida" : e === "cancelada" ? "Cancelada" : e || "—";

  const totalGeral = lista.reduce((s, f) => s + (Number(f.total) || Number(f.valor) || 0), 0);
  const recebido = lista.reduce((s, f) => s + (Number(f.valor_pago) || (f.estado === "paga" ? Number(f.total) || Number(f.valor) || 0 : 0)), 0);
  const aReceber = lista.filter((f) => !["paga", "cancelada"].includes(f.estado))
    .reduce((s, f) => s + Math.max(0, (Number(f.total) || Number(f.valor) || 0) - (Number(f.valor_pago) || 0)), 0);

  const filtroTxt = [];
  if (estados.length > 0) filtroTxt.push(`Estados: ${estados.map(estadoLabel).join(", ")}`);
  if (tipos.length > 0) filtroTxt.push(`Tipos: ${tipos.map(tipoLabel).join(", ")}`);

  let y = desenharKpis(doc, ly + 3, [
    { label: "Documentos", value: String(lista.length) },
    { label: "Total faturado", value: formatKz(totalGeral) },
    { label: "Recebido", value: formatKz(recebido) },
    { label: "A receber", value: formatKz(aReceber) },
  ]);
  y += 2;
  if (filtroTxt.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...CINZA_ESCURO);
    doc.text(`Filtros aplicados: ${filtroTxt.join("  ·  ")}`, MARGEM, y);
    y += 5;
  }

  y = secaoPdf(doc, y, "Faturação");

  autoTable(doc, {
    startY: y,
    head: [["Nº", "Data", "Tipo", "Cliente", "Estado", "Total", "Pago", "A receber"]],
    body: lista.map((f) => {
      const total = Number(f.total) || Number(f.valor) || 0;
      const pago = Number(f.valor_pago) || (f.estado === "paga" ? total : 0);
      const pend = ["paga", "cancelada"].includes(f.estado) ? 0 : Math.max(0, total - pago);
      return [
        f.numero || String(f.id || "—"),
        String(f.data_emissao || "—").slice(0, 10),
        tipoLabel(f.tipo),
        f.cliente?.nome || f.cliente || "—",
        estadoLabel(f.estado),
        formatKz(total),
        f.estado === "cancelada" ? "—" : formatKz(pago),
        f.estado === "cancelada" ? "—" : formatKz(pend),
      ];
    }),
    foot: [[
      { content: "TOTAL", colSpan: 5, styles: { fontStyle: "bold" } },
      { content: formatKz(totalGeral), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatKz(recebido), styles: { fontStyle: "bold", halign: "right" } },
      { content: formatKz(aReceber), styles: { fontStyle: "bold", halign: "right" } },
    ]],
    ...TEMA_RELATORIO,
    headStyles: { ...TEMA_RELATORIO.headStyles, fontSize: 7.5 },
    bodyStyles: { ...TEMA_RELATORIO.bodyStyles, fontSize: 7.5 },
    footStyles: {
      fillColor: CINZA_CLARO,
      textColor: PRETO,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: colunasProporcionais(
      [1, 1.4, 1.6, 2.4, 1.4, 1.3, 1.3, 1.3],
      { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } }
    ),
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 4) {
        const v = String(data.cell.raw);
        if (v === "Paga") data.cell.styles.textColor = CINZA_ESCURO;
        else if (v === "Cancelada") data.cell.styles.textColor = CINZA_MEDIO;
      }
    },
  });

  finalizarComRodape(doc);
  doc.save(`Relatorio_Faturacao_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================
// RELATÓRIO DE PRODUÇÃO
// Respeita os filtros de estado da ordem
// ============================================================
export async function gerarRelatorioProducaoPDF(ordens = [], org = {}, filtros = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { linhaY: ly } = await desenharCabecalhoRelatorio(doc, org, "Relatório de Produção");

  const estados = Array.isArray(filtros?.estados) ? filtros.estados : [];
  const lista = ordens.filter((o) => estados.length === 0 || estados.includes(o.estado || o.status));

  const estadoLabel = (e) =>
    e === "aguardando" ? "Aguardando"
    : e === "em_producao" ? "Em produção"
    : e === "finalizado" ? "Finalizado"
    : e === "entregue" ? "Entregue"
    : e || "—";

  const contagem = (e) => lista.filter((o) => (o.estado || o.status) === e).length;
  const entregues = contagem("entregue");
  const finalizadas = contagem("finalizado");
  const emProducao = contagem("em_producao");

  const filtroTxt = estados.length > 0 ? `Estados: ${estados.map(estadoLabel).join(", ")}` : "";

  let y = desenharKpis(doc, ly + 3, [
    { label: "Total de ordens", value: String(lista.length) },
    { label: "Entregues", value: String(entregues) },
    { label: "Em produção", value: String(emProducao) },
    { label: "Finalizadas", value: String(finalizadas) },
  ]);
  y += 2;
  if (filtroTxt) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...CINZA_ESCURO);
    doc.text(`Filtros aplicados: ${filtroTxt}`, MARGEM, y);
    y += 5;
  }

  y = secaoPdf(doc, y, "Ordens de Produção");

  autoTable(doc, {
    startY: y,
    head: [["Nº", "Produto", "Qtd.", "Entrada", "Entrega", "Estado", "Progresso"]],
    body: lista.map((o) => [
      o.numero || String(o.id || "—"),
      o.produto || "—",
      String(o.quantidade ?? "—"),
      String(o.data_entrada || "—").slice(0, 10),
      String(o.data_entrega || "—").slice(0, 10),
      estadoLabel(o.estado || o.status),
      `${Number(o.progresso) || 0}%`,
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 6, styles: { fontStyle: "bold" } },
      { content: `${lista.length}`, styles: { fontStyle: "bold", halign: "right" } },
    ]],
    ...TEMA_RELATORIO,
    headStyles: { ...TEMA_RELATORIO.headStyles, fontSize: 7.5 },
    bodyStyles: { ...TEMA_RELATORIO.bodyStyles, fontSize: 7.5 },
    footStyles: {
      fillColor: CINZA_CLARO,
      textColor: PRETO,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: colunasProporcionais(
      [1, 2.6, 0.8, 1.4, 1.4, 1.6, 1.2],
      { 5: { halign: "center" }, 6: { halign: "right" } }
    ),
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 5) {
        const v = String(data.cell.raw);
        if (v === "Entregue") data.cell.styles.textColor = CINZA_ESCURO;
        else if (v === "Finalizado") data.cell.styles.textColor = CINZA_ESCURO;
        else if (v === "Em produção") data.cell.styles.textColor = CINZA_MEDIO;
      }
    },
  });

  finalizarComRodape(doc);
  doc.save(`Relatorio_Producao_${new Date().toISOString().slice(0, 10)}.pdf`);
}