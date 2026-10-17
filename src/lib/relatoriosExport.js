import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function descarregar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function nomeFicheiro(titulo) {
  return String(titulo || "relatorio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "relatorio";
}

// Exporta uma tabela para um ficheiro que o Excel abre nativamente (.xls via HTML).
export function exportarRelatorioExcel(titulo, cabecalhos = [], linhas = []) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const th = cabecalhos.map((c) => `<th>${esc(c)}</th>`).join("");
  const trs = linhas
    .map((l) => `<tr>${(Array.isArray(l) ? l : [l]).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8"></head><body>` +
    `<table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>` +
    `</body></html>`;
  descarregar(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }), `${nomeFicheiro(titulo)}.xls`);
}

// Gera um PDF genérico a partir de uma tabela (título + resumo + tabela).
export function exportarRelatorioPDF({ titulo, org = {}, cabecalhos = [], linhas = [], resumo = [] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(org?.nome || "KAMGEST", 14, 16);
  doc.setFontSize(11);
  doc.text(String(titulo || "Relatório"), 14, 24);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-PT")}`, 14, 29);

  let y = 35;
  if (resumo.length) {
    doc.setTextColor(40);
    doc.setFontSize(9);
    resumo.forEach((r) => {
      doc.text(String(r), 14, y);
      y += 5;
    });
    y += 2;
  }

  autoTable(doc, {
    startY: y,
    head: [cabecalhos],
    body: linhas.length ? linhas : [["Sem dados para apresentar"]],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${nomeFicheiro(titulo)}.pdf`);
}
