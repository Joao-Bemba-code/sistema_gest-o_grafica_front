import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_CINZA,
  COR_MARCA_LINHA,
  MARGEM_MARCA,
  LARGURA_UTIL_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
  caixaClienteMarca,
  assinaturaMarca,
  TEMA_TABELA_MARCA,
  formatNumero,
} from "@/lib/pdfEstilo";

const ROTULO_ENTREGA = {
  preparar: "Por preparar",
  transito: "Em trânsito",
  entregue: "Entregue",
};

const ROTULO_FATURA = {
  paga: "Paga",
  emitida: "Emitida",
  parcial: "Parcial",
  vencida: "Vencida",
  cancelada: "Anulada",
};

function formatarData(valor) {
  if (!valor) return "—";
  const texto = String(valor).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const d = new Date(valor);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function estadoEntrega(op) {
  if (op.estado === "entregue" || op.entrega_ok) return "entregue";
  if (op.estado === "finalizado") return "transito";
  return "preparar";
}

function destinoDe(op) {
  const cli = op.cliente || {};
  return cli.endereco || cli.empresa || cli.nome || "";
}

export default async function gerarGuiaEntregaPdf(op, org = {}, fatura = null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const largura = pw - MARGEM_MARCA * 2;

  const numero = op?.numero || (op?.id ? `KOP-${op.id}` : "KOP");
  const estado = ROTULO_ENTREGA[estadoEntrega(op || {})] || "—";
  const dataEntrega = formatarData(op?.data_entrega || op?.dataEntrega);
  const orc =
    (op?.orcamento && typeof op.orcamento === "object" ? op.orcamento : null) ||
    (op?.orcamentoDados && typeof op.orcamentoDados === "object" ? op.orcamentoDados : null);

  const { yInicio, logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Guia de Entrega",
    empresa: org,
    direitos: [
      numero,
      `Entrega: ${dataEntrega}`,
      `Estado: ${estado}`,
    ],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = yInicio;
  const cli = op?.cliente || {};
  y += caixaClienteMarca(doc, MARGEM_MARCA, y, largura, {
    nome: cli.nome || "—",
    empresa: cli.empresa || "",
    nif: cli.nif || "",
    telefone: cli.telefone || "",
    email: cli.email || "",
    endereco: cli.endereco || "",
  }) + 8;

  // Dados da entrega
  tituloSecaoMarca(doc, "Dados da entrega", MARGEM_MARCA, y);
  y += 6;
  const dados = [
    ["Encomenda", numero],
    ["Orçamento", orc?.numero || "—"],
  ];
  if (fatura && (fatura.numero || fatura.id)) {
    dados.push([
      "Guia / Factura",
      `${fatura.numero || `#${fatura.id}`}${fatura.estado ? ` · ${ROTULO_FATURA[fatura.estado] || fatura.estado}` : ""}`,
    ]);
  }
  dados.push(
    ["Data de entrada", formatarData(op?.data_entrada || op?.dataEntrada)],
    ["Data de entrega", dataEntrega],
    ["Estado", estado],
    ["Destino", destinoDe(op || {}) || "—"]
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const [rotulo, valor] of dados) {
    doc.setTextColor(...COR_MARCA_SECUNDARIO);
    doc.text(rotulo, MARGEM_MARCA + 9, y);
    doc.setTextColor(...COR_MARCA_TEXTO);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(String(valor), largura - 69)[0] || "—", MARGEM_MARCA + 61, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }
  y += 3;

  // Itens a entregar
  const itens = Array.isArray(orc?.orcamento_items) ? orc.orcamento_items : [];
  const produtos = itens.length
    ? itens
    : op?.produto
      ? [{ descricao: op.produto, quantidade: op.quantidade }]
      : [];

  tituloSecaoMarca(doc, "Itens a entregar", MARGEM_MARCA, y);
  y += 2;
  if (produtos.length) {
    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Qtd"]],
      body: produtos.map((it) => [it.descricao || "—", formatNumero(it.quantidade)]),
      ...TEMA_TABELA_MARCA,
      tableWidth: LARGURA_UTIL_MARCA,
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center", cellWidth: 24 } },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text("Sem itens registados na encomenda.", MARGEM_MARCA + 9, y + 2);
    y += 8;
  }

  // Condições de recepção
  const alturaCaixa = 18;
  if (y + alturaCaixa > ph - 45) {
    doc.addPage();
    y = 24;
  }
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(MARGEM_MARCA, y, largura, alturaCaixa, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text("RECEPÇÃO", MARGEM_MARCA + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(...COR_MARCA_TEXTO);
  doc.text(
    "Ao receber, confira a mercadoria e assine esta guia. Qualquer reclamação deverá ser apresentada no prazo de 24 horas.",
    MARGEM_MARCA + 5,
    y + 12
  );
  y += alturaCaixa + 10;

  // Assinaturas
  const yAssin = Math.max(y + 6, ph - 62);
  if (yAssin > ph - 40) {
    doc.addPage();
    assinaturaMarca(doc, 60, ["Assinatura do Responsável", "Assinatura de quem recebe"]);
  } else {
    assinaturaMarca(doc, yAssin, ["Assinatura do Responsável", "Assinatura de quem recebe"]);
  }

  // Rodapé
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.setFontSize(7);
  doc.setTextColor(...COR_MARCA_CINZA);
  doc.text(
    `${(org.nome || "KAMGEST")}   ·   ${org.email || "—"}   ·   ${org.telefone || "—"}`,
    pw / 2,
    ph - 9,
    { align: "center" }
  );

  doc.save(`Guia_Entrega_${String(numero).replace(/[^\w-]+/g, "_")}.pdf`);
}
