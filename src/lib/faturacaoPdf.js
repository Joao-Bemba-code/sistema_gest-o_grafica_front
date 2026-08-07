import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function tituloTipo(tipo) {
  switch (tipo) {
    case "proforma": return "FATURA PROFORMA";
    case "factura_recibo": return "FACTURA RECIBO";
    case "recibo": return "RECIBO";
    case "nota_credito": return "NOTA DE CRÉDITO";
    default: return "FATURA";
  }
}

export default function gerarPDF(fatura, empresa = {}) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const cli = fatura.cliente || {};
  const tipo = fatura.tipo || "fatura";
  const ehRecibo = tipo === "factura_recibo" || tipo === "recibo";

  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 17);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(empresa.endereco || "", 14, 23);
  doc.text(`NIF: ${empresa.nif || ""} | Tel: ${empresa.telefone || ""} | Email: ${empresa.email || ""}`, 14, 29);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(tituloTipo(tipo), pw - 14, 17, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${fatura.numero}`, pw - 14, 24, { align: "right" });
  doc.text(`Data: ${fatura.data_emissao ? new Date(fatura.data_emissao).toLocaleDateString("pt-BR") : ""}`, pw - 14, 30, { align: "right" });
  if (fatura.data_vencimento) doc.text(`Vencimento: ${new Date(fatura.data_vencimento).toLocaleDateString("pt-BR")}`, pw - 14, 36, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${cli.nome || ""}`, 14, y); y += 5;
  doc.text(`Empresa: ${cli.empresa || ""}`, 14, y); y += 5;
  doc.text(`NIF: ${cli.nif || ""}`, 14, y); y += 5;
  doc.text(`Telefone: ${cli.telefone || ""}  |  Email: ${cli.email || ""}`, 14, y); y += 8;

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: (fatura.itens || []).map((it) => [it.descricao, String(it.quantidade), formatKz(it.preco_unit), formatKz(it.total)]),
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;
  const boxX = pw - 88;
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(boxX, y, 74, 28, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text("Subtotal:", boxX + 4, y + 8); doc.text(formatKz(fatura.subtotal), pw - 18, y + 8, { align: "right" });
  if (Number(fatura.iva) > 0) { doc.text(`IVA (${Number(fatura.iva)}%):`, boxX + 4, y + 15); doc.text(formatKz(fatura.valor_iva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(ehRecibo ? "TOTAL PAGO:" : "TOTAL:", boxX + 4, y + 24); doc.text(formatKz(fatura.total || fatura.valor), pw - 18, y + 24, { align: "right" });

  y += 34;
  if (ehRecibo) {
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(14, y, pw - 28, 18, 2, 2, "F");
    doc.setTextColor(5, 150, 105); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Pagamento recebido integralmente.", 18, y + 7);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Método: ${fatura.metodo_pagamento || "—"}${fatura.data_pagamento ? ` | Data: ${new Date(fatura.data_pagamento).toLocaleDateString("pt-BR")}` : ""}`, 18, y + 13);
    y += 24;
  } else {
    doc.setTextColor(50, 50, 50); doc.setFontSize(9);
    doc.text(`Estado: ${fatura.estado}`, 14, y); y += 5;
    if (Number(fatura.valor_pago) > 0) doc.text(`Valor pago: ${formatKz(fatura.valor_pago)}`, 14, y + 5);
    y += 10;
  }
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  if (fatura.observacoes) { doc.setFont("helvetica", "italic"); doc.text(`Obs: ${fatura.observacoes}`, 14, y); y += 6; }
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pw / 2 - 10, y);
  doc.line(pw / 2 + 10, y, pw - 14, y);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
  doc.text("Assinatura do Responsável", pw / 2, y + 5, { align: "center" });
  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 285, { align: "center" });
  doc.save(`${tituloTipo(tipo).replace(/\s+/g, "_")}_${fatura.numero || fatura.id}.pdf`);
}
