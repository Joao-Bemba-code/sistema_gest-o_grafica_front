import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_CINZA,
  COR_MARCA_FUNDO,
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  formatKz,
  formatarData,
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  tituloSecaoMarca,
  rodapeMarca,
} from "@/lib/pdfEstilo";
applyPlugin(jsPDF);

function capitalize(s) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function gerarRelatorioTesourariaPdf(movimentos = [], empresa = {}, resumo = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const saldoTotal = resumo.saldo_total ?? (resumo.total_entradas ?? 0) - (resumo.total_saidas ?? 0);
  const totalEntradas = resumo.total_entradas ?? 0;
  const totalSaidas = resumo.total_saidas ?? 0;

  const direitos = [];
  if (resumo.data_inicio) direitos.push(`De: ${formatarData(resumo.data_inicio)}`);
  if (resumo.data_fim) direitos.push(`Até: ${formatarData(resumo.data_fim)}`);
  const { yInicio } = await desenharCabecalhoMarca(doc, {
    titulo: "RELATÓRIO DE TESOURARIA",
    empresa,
    direitos,
  });

  let y = yInicio;

  const boxW = (pw - 28 - 12) / 3;
  const boxH = 22;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, boxW, boxH, 2, 2, "F");
  doc.roundedRect(14 + boxW + 4, y, boxW, boxH, 2, 2, "F");
  doc.roundedRect(14 + 2 * (boxW + 4), y, boxW, boxH, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text("SALDO TOTAL", 18, y + 7);
  doc.text("ENTRADAS DO MÊS", 18 + boxW + 4, y + 7);
  doc.text("SAÍDAS DO MÊS", 18 + 2 * (boxW + 4), y + 7);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text(formatKz(saldoTotal), 18, y + 16);
  doc.text(formatKz(totalEntradas), 18 + boxW + 4, y + 16);
  doc.setTextColor(...COR_MARCA_CINZA);
  doc.text(formatKz(totalSaidas), 18 + 2 * (boxW + 4), y + 16);

  y += boxH + 8;

  y = tituloSecaoMarca(doc, "Movimentos", 14, y) + 2;

  if (!movimentos || movimentos.length === 0) {
    doc.setFillColor(...COR_MARCA_FUNDO);
    doc.roundedRect(14, y, pw - 28, 20, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text("Sem movimentos registados.", pw / 2, y + 13, { align: "center" });
  } else {
    const body = movimentos.map((m) => [
      formatarData(m.data),
      capitalize(m.tipo),
      m.categoria || "—",
      m.descricao || "—",
      { content: formatKz(m.valor), styles: { textColor: m.tipo === "entrada" ? COR_MARCA_PRINCIPAL : COR_MARCA_SECUNDARIO } },
      m.conta || "—",
      capitalize(m.metodo_pagamento || m.metodo),
      capitalize(m.estado),
    ]);

    doc.autoTable({
      startY: y,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor", "Conta", "Método", "Estado"]],
      body,
      ...TEMA_TABELA_MARCA,
      headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 7 },
      bodyStyles: { ...TEMA_TABELA_MARCA.styles, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 18 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: "auto" },
        4: { halign: "right", fontStyle: "bold", cellWidth: 26 },
        5: { cellWidth: 20 },
        6: { cellWidth: 22 },
        7: { cellWidth: 18, halign: "center" },
      },
    });
  }

  rodapeMarca(doc);
  doc.save(`Relatorio_Tesouraria_${resumo.data_inicio || ""}_${resumo.data_fim || ""}.pdf`);
}