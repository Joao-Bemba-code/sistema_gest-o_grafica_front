import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_LINHA,
  COR_MARCA_CINZA,
  MARGEM_MARCA,
  desenharCabecalhoMarca,
  tituloSecaoMarca,
  formatNumero,
} from "@/lib/pdfEstilo";

applyPlugin(jsPDF);

const LARGURA_A4 = 210;
const ALTURA_A4 = 297;
const LARGURA_UTIL = LARGURA_A4 - MARGEM_MARCA * 2;
const ALTURA_CAMPOS = 8;
const ALTURA_CABECALHO = 6.4;
const ALTURA_LINHA = 9;

function dataCurta(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10) || "—";
  return d.toLocaleDateString("pt-AO");
}

function texto(v) {
  if (v && typeof v === "object") {
    return String(v.nome || v.razao_social || v.descricao || "").trim() || "—";
  }
  const t = String(v ?? "").trim();
  return t || "—";
}

// Caixa com rótulo em cima e linha em baixo (ou valor)
function campo(doc, x, y, w, rotulo, valor = "", opcoes = {}) {
  const { altura = ALTURA_CAMPOS, preenchivel = true } = opcoes;
  doc.setFontSize(6.4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text(String(rotulo).toUpperCase(), x, y, { charSpace: 0.2, maxWidth: w });
  const yValor = y + 4.6;
  if (preenchivel && !valor) {
    doc.setDrawColor(...COR_MARCA_LINHA);
    doc.setLineWidth(0.2);
    doc.line(x, yValor, x + w, yValor);
  } else {
    doc.setFontSize(8.4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COR_MARCA_TEXTO);
    const linhas = doc.splitTextToSize(texto(valor), w);
    doc.text(linhas.slice(0, 2), x, yValor);
  }
  return y + altura;
}

// Nome do serviço/produto em destaque (até 3 linhas) para caber na página
function blocoProduto(doc, x, y, w, produto) {
  doc.setFontSize(6.4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text("SERVIÇO / PRODUTO", x, y, { charSpace: 0.2 });
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_TEXTO);
  const linhas = doc.splitTextToSize(texto(produto), w).slice(0, 3);
  doc.text(linhas, x, y + 6.4);
  return y + 6.4 + linhas.length * 4.8 + 3;
}

// Grelha "Descrição / Quantidade / Observação" pautada para preenchimento manual.
// `maxLinhas` limita as linhas desenhadas para a grelha caber na página;
// devolve a altura desenhada e a quantidade de itens que ficaram de fora.
function grelhaItens(doc, x, y, w, linhas, opcoes = {}) {
  const { alturaLinha = ALTURA_LINHA, minLinhas = 6, maxLinhas = Infinity } = opcoes;
  const colDesc = w * 0.46;
  const colQtd = w * 0.14;
  const colObs = w - colDesc - colQtd;
  const cols = [
    { x, w: colDesc, rotulo: "Descrição" },
    { x: x + colDesc, w: colQtd, rotulo: "Qtd." },
    { x: x + colDesc + colQtd, w: colObs, rotulo: "Observação" },
  ];

  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.rect(x, y, w, ALTURA_CABECALHO, "F");
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  cols.forEach((c) => doc.text(String(c.rotulo).toUpperCase(), c.x + 1.5, y + 4.4, { charSpace: 0.2 }));
  let cy = y + ALTURA_CABECALHO;

  const total = Math.max(minLinhas, Math.min(linhas.length, maxLinhas));
  for (let i = 0; i < total; i += 1) {
    const item = linhas[i];
    if (item) {
      doc.setFontSize(7.6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COR_MARCA_TEXTO);
      const partes = doc.splitTextToSize(texto(item.descricao), colDesc - 3);
      doc.text(partes.slice(0, 2), cols[0].x + 1.5, cy + 4.2);
      if (item.quantidade != null && item.quantidade !== "") {
        doc.text(String(item.quantidade), cols[1].x + colQtd / 2, cy + 4.2, { align: "center" });
      }
      if (item.observacao) {
        doc.text(doc.splitTextToSize(String(item.observacao), colObs - 3).slice(0, 2), cols[2].x + 1.5, cy + 4.2);
      }
    }
    doc.setDrawColor(...COR_MARCA_LINHA);
    doc.setLineWidth(0.15);
    cols.forEach((c) => doc.line(c.x, cy, c.x + c.w, cy));
    doc.line(x + colDesc + colQtd, cy, x + colDesc + colQtd, cy + alturaLinha);
    cy += alturaLinha;
  }
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.line(x, cy, x + w, cy);
  const altura = cy - y;
  const omitidos = Math.max(0, linhas.length - total);
  if (omitidos > 0) {
    doc.setFontSize(6.4);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COR_MARCA_SECUNDARIO);
    doc.text(`+ ${omitidos} item(ns) — ver detalhe no sistema`, x, cy + 3.4);
    return altura + 5;
  }
  return altura;
}

function materiaisDaOrdem(op, matPorId) {
  const reservas = Array.isArray(op?.reserva_estoques) ? op.reserva_estoques : [];
  if (reservas.length) {
    return reservas.map((r) => {
      const m = matPorId?.[r.material_id] || {};
      return {
        descricao: [m.codigo, m.nome].filter(Boolean).join(" — ") || `Material #${r.material_id}`,
        quantidade: `${formatNumero(r.quantidade_reservada)} ${m.unidade || "un"}`,
        observacao: r.lote ? `Lote ${r.lote}` : "",
      };
    });
  }
  const itens = Array.isArray(op?.orcamentoDados?.orcamento_items) ? op.orcamentoDados.orcamento_items : [];
  return itens.map((i) => ({
    descricao: i.descricao,
    quantidade: formatNumero(i.quantidade),
    observacao: "",
  }));
}

/**
 * Gera a folha da Ordem de Produção em PDF, simplificada e sempre numa página:
 * apenas o nome do serviço/produto (com quantidade) e a lista de materiais.
 */
export default async function gerarOrdemProducaoPdf(op, org = {}, matPorId = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pw = LARGURA_A4;
  const ph = ALTURA_A4;
  const x = MARGEM_MARCA;
  const w = LARGURA_UTIL;

  const numero = op?.numero || (op?.id ? `OP-${op.id}` : "OP");
  const impressoEm = new Date();

  const { yInicio } = await desenharCabecalhoMarca(doc, {
    titulo: "Ordem de Produção",
    empresa: org,
    direitos: [
      numero,
      `${texto(op?.produto)}`.slice(0, 46),
      `Impresso em ${dataCurta(impressoEm)}`,
    ],
  });

  let y = yInicio;

  // ─── Serviço / Produto ───
  y = tituloSecaoMarca(doc, "Serviço / Produto", x, y) + 2;
  y = blocoProduto(doc, x, y, w, op?.produto);
  const meia = (w - 6) / 2;
  campo(doc, x, y, meia, "OP / Encomenda", numero, { preenchivel: false });
  campo(doc, x + meia + 6, y, meia, "Quantidade", op?.quantidade, { preenchivel: false });
  y += ALTURA_CAMPOS + 6;

  // ─── Materiais ───
  // A grelha usa todo o espaço restante para caber sempre numa página;
  // se houver mais materiais do que linhas disponíveis, indica-se no rodapé
  // da grelha quantos ficaram de fora.
  y = tituloSecaoMarca(doc, "Materiais e consumo", x, y) + 2;
  const materiais = materiaisDaOrdem(op, matPorId);
  const maxLinhasMat = Math.max(4, Math.floor((ph - 14 - y - ALTURA_CABECALHO) / ALTURA_LINHA));
  const hMat = grelhaItens(doc, x, y, w, materiais, {
    minLinhas: Math.min(6, maxLinhasMat),
    maxLinhas: maxLinhasMat,
  });
  y += hMat + 4;

  // ─── Rodapé ───
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFontSize(6.6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text(
      `${numero} · impresso em ${dataCurta(impressoEm)} · documento de trabalho`,
      MARGEM_MARCA,
      ph - 8
    );
    doc.text(`Página ${p} de ${total}`, pw - MARGEM_MARCA, ph - 8, { align: "right" });
  }

  doc.save(`${numero.replace(/[^\w-]+/g, "_")}_ordem_producao.pdf`);
}
