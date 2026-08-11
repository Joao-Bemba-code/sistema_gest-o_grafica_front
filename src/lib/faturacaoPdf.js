import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

const COR_PRIMARIA = [5, 150, 105];
const COR_TEXTO = [51, 65, 85];
const COR_SUAVE = [235, 245, 240];

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatarData(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-AO");
  } catch {
    return String(d);
  }
}

function tituloTipo(tipo) {
  switch (tipo) {
    case "proforma": return "FATURA PROFORMA";
    case "factura_recibo": return "FACTURA RECIBO";
    case "recibo": return "RECIBO";
    case "nota_credito": return "NOTA DE CRÉDITO";
    default: return "FATURA";
  }
}

function rotuloMetodo(m) {
  const mapa = {
    dinheiro: "Dinheiro",
    transferencia: "Transferência",
    multicaixa: "Multicaixa",
    referencia: "Referência",
  };
  return mapa[m] || m || "—";
}

export default function gerarPDF(fatura, empresa = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const cli = fatura.cliente || {};
  const tipo = fatura.tipo || "fatura";
  const ehRecibo = tipo === "factura_recibo" || tipo === "recibo";
  const orcamento = fatura.orcamento || null;
  const orcRef = orcamento ? (orcamento.numero || orcamento.id) : null;
  const orcTotal = Number(orcamento?.total_com_iva ?? orcamento?.total ?? 0) || 0;
  const totalFat = Number(fatura.total || fatura.valor) || 0;
  const pagoFat = Number(fatura.valor_pago) || 0;

  // ===== Cabeçalho =====
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 16);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const contacto = [
    empresa.endereco || "",
    `NIF: ${empresa.nif || "—"}  |  Tel: ${empresa.telefone || "—"}  |  Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  contacto.forEach((linha, i) => doc.text(linha, 14, 23 + i * 5));

  doc.setFontSize(15); doc.setFont("helvetica", "bold");
  doc.text(tituloTipo(tipo), pw - 14, 16, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${fatura.numero || "—"}`, pw - 14, 23, { align: "right" });
  doc.text(`Emissão: ${formatarData(fatura.data_emissao)}`, pw - 14, 28, { align: "right" });
  if (fatura.data_vencimento) doc.text(`Vencimento: ${formatarData(fatura.data_vencimento)}`, pw - 14, 33, { align: "right" });

  // ===== Cliente =====
  doc.setTextColor(...COR_TEXTO);
  let y = 50;
  doc.setFillColor(...COR_SUAVE);
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", 18, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${cli.nome || "—"}${cli.empresa ? `  •  ${cli.empresa}` : ""}`, 18, y + 13);
  const linhaNif = [];
  if (cli.nif) linhaNif.push(`NIF: ${cli.nif}`);
  if (cli.telefone) linhaNif.push(`Tel: ${cli.telefone}`);
  if (cli.email) linhaNif.push(`Email: ${cli.email}`);
  doc.text(linhaNif.join("   |   "), 18, y + 19);
  doc.text(`${cli.endereco || ""}`, 18, y + 25);
  y += 36;

  // ===== Itens =====
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("DESCRIÇÃO DOS SERVIÇOS", 14, y); y += 4;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: (fatura.itens || []).map((it) => [it.descricao || "", String(it.quantidade), formatKz(it.preco_unit), formatKz(it.total)]),
    theme: "grid",
    headStyles: { fillColor: COR_PRIMARIA, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COR_TEXTO, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // ===== Totais =====
  y = doc.lastAutoTable.finalY + 8;
  const boxX = pw - 92;
  const boxW = 78;
  const boxH = 30;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COR_PRIMARIA);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...COR_TEXTO);
  doc.text("Subtotal:", boxX + 5, y + 8); doc.text(formatKz(fatura.subtotal), boxX + boxW - 5, y + 8, { align: "right" });
  if (Number(fatura.iva) > 0) {
    doc.text(`IVA (${Number(fatura.iva)}%):`, boxX + 5, y + 15); doc.text(formatKz(fatura.valor_iva), boxX + boxW - 5, y + 15, { align: "right" });
  }
  doc.setDrawColor(...COR_PRIMARIA);
  doc.line(boxX, y + 20, boxX + boxW, y + 20);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text(ehRecibo ? "TOTAL PAGO:" : "TOTAL:", boxX + 5, y + 26); doc.text(formatKz(totalFat), boxX + boxW - 5, y + 26, { align: "right" });

  // ===== Estado do pagamento =====
  y += boxH + 8;
  doc.setFont("helvetica", "normal"); doc.setTextColor(...COR_TEXTO);
  if (ehRecibo) {
    const tamBox = orcRef ? 34 : 24;
    doc.setFillColor(...COR_SUAVE);
    doc.setDrawColor(150, 210, 185);
    doc.roundedRect(14, y, pw - 28, tamBox, 2, 2, "FD");
    doc.setTextColor(...COR_PRIMARIA); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Pagamento recebido integralmente.", 18, y + 8);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Método: ${rotuloMetodo(fatura.metodo_pagamento)}${fatura.data_pagamento ? `   |   Data: ${formatarData(fatura.data_pagamento)}` : ""}`, 18, y + 15);
    if (orcRef) doc.text(`Documento de origem — Orçamento ${orcRef}: ${formatKz(orcTotal)}`, 18, y + 22);
    y += tamBox + 6;
  } else {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(14, y, pw - 28, 26, 2, 2, "FD");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("ESTADO DO PAGAMENTO", 18, y + 6);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Estado: ${fatura.estado || "—"}`, 18, y + 13);
    doc.text(pagoFat > 0 ? `Valor pago: ${formatKz(pagoFat)}` : "Valor pago: Kz 0", pw - 100, y + 13, { align: "right" });
    if (totalFat > pagoFat) {
      doc.setTextColor(200, 100, 40); doc.setFont("helvetica", "bold");
      doc.text(`Em dívida a liquidar: ${formatKz(totalFat - pagoFat)}`, pw - 100, y + 20, { align: "right" });
    }
    y += 32;
  }

  // ===== Observações =====
  if (fatura.observacoes) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(...COR_TEXTO);
    doc.text(`Observações: ${fatura.observacoes}`, 14, y);
    y += 6;
  }

  // ===== Assinaturas =====
  y = Math.max(y + 12, ph - 40);
  doc.setDrawColor(180, 190, 200);
  doc.line(14, y, pw / 2 - 10, y);
  doc.line(pw / 2 + 10, y, pw - 14, y);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 130, 140);
  doc.text("Assinatura do Responsável", pw / 2, y + 5, { align: "center" });

  doc.setTextColor(160, 170, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF em ${formatarData(new Date())}`, pw / 2, ph - 10, { align: "center" });

  doc.save(`${tituloTipo(tipo).replace(/\s+/g, "_")}_${fatura.numero || fatura.id}.pdf`);
}
