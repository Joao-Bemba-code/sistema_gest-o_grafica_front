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

function capitalize(s) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function gerarRelatorioTesourariaPdf(movimentos = [], empresa = {}, resumo = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const saldoTotal = resumo.saldo_total ?? (resumo.total_entradas ?? 0) - (resumo.total_saidas ?? 0);
  const totalEntradas = resumo.total_entradas ?? 0;
  const totalSaidas = resumo.total_saidas ?? 0;

  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const contacto = [
    empresa.endereco || "",
    `NIF: ${empresa.nif || "—"}  |  Tel: ${empresa.telefone || "—"}  |  Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  contacto.forEach((linha, i) => doc.text(linha, 14, 23 + i * 5));

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE TESOURARIA", pw - 14, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (resumo.data_inicio) doc.text(`De: ${formatarData(resumo.data_inicio)}`, pw - 14, 24, { align: "right" });
  if (resumo.data_fim) doc.text(`Até: ${formatarData(resumo.data_fim)}`, pw - 14, 30, { align: "right" });
  doc.text("SIGRAF", pw - 14, 36, { align: "right" });

  let y = 50;

  const boxW = (pw - 28 - 12) / 3;
  const boxH = 22;

  doc.setFillColor(...COR_SUAVE);
  doc.roundedRect(14, y, boxW, boxH, 2, 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14 + boxW + 4, y, boxW, boxH, 2, 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14 + 2 * (boxW + 4), y, boxW, boxH, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_TEXTO);
  doc.text("SALDO TOTAL", 18, y + 7);
  doc.text("ENTRADAS DO MÊS", 18 + boxW + 4, y + 7);
  doc.text("SAÍDAS DO MÊS", 18 + 2 * (boxW + 4), y + 7);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text(formatKz(saldoTotal), 18, y + 16);
  doc.setTextColor(5, 150, 105);
  doc.text(formatKz(totalEntradas), 18 + boxW + 4, y + 16);
  doc.setTextColor(200, 60, 60);
  doc.text(formatKz(totalSaidas), 18 + 2 * (boxW + 4), y + 16);

  y += boxH + 8;

  doc.setTextColor(...COR_TEXTO);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("MOVIMENTOS", 14, y);
  y += 4;

  if (!movimentos || movimentos.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, pw - 28, 20, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 160, 170);
    doc.text("Sem movimentos registados.", pw / 2, y + 13, { align: "center" });
    y += 28;
  } else {
    const body = movimentos.map((m) => [
      formatarData(m.data),
      capitalize(m.tipo),
      m.categoria || "—",
      m.descricao || "—",
      { content: formatKz(m.valor), styles: { textColor: m.tipo === "entrada" ? [5, 150, 105] : [200, 60, 60] } },
      m.conta || "—",
      capitalize(m.metodo_pagamento || m.metodo),
      capitalize(m.estado),
    ]);

    doc.autoTable({
      startY: y,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor", "Conta", "Método", "Estado"]],
      body,
      theme: "grid",
      headStyles: { fillColor: COR_PRIMARIA, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: COR_TEXTO, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 18 },
        2: { cellWidth: 22 },
        3: { cellWidth: "auto" },
        4: { halign: "right", fontStyle: "bold", cellWidth: 24 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 18 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 170, 180);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, pw - 14, ph - 8, { align: "right" });
        doc.text("Documento gerado por SIGRAF", 14, ph - 8);
      },
    });
  }

  if (!movimentos || movimentos.length === 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 170, 180);
    doc.text(`Página ${doc.internal.getNumberOfPages()}`, pw - 14, ph - 8, { align: "right" });
    doc.text("Documento gerado por SIGRAF", 14, ph - 8);
  }

  doc.save(`Relatorio_Tesouraria_${resumo.data_inicio || ""}_${resumo.data_fim || ""}.pdf`);
}
