import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
  desenharKpisMarca,
  finalizarComRodapeMarca,
  LARGURA_UTIL_MARCA,
  formatarData,
  MARGEM_MARCA,
} from "./pdfEstilo";

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

// Gera um PDF no modelo de marca (cabeçalho com logo, indicadores, tabela e rodapé),
// igual ao dos restantes relatórios do sistema.
export async function exportarRelatorioPDF({ titulo, org = {}, cabecalhos = [], linhas = [], resumo = [] }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { yInicio, logo } = await desenharCabecalhoMarca(doc, {
    titulo: titulo || "Relatório",
    empresa: org,
    direitos: [`Emissão: ${formatarData(new Date())}`],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = yInicio + 3;
  if (resumo.length) {
    const kpis = resumo.map((r) => {
      const texto = String(r ?? "");
      const i = texto.indexOf(":");
      if (i > 0) return { label: texto.slice(0, i).trim(), value: texto.slice(i + 1).trim() };
      return { label: "", value: texto };
    });
    y = desenharKpisMarca(doc, y, kpis);
  }

  y = tituloSecaoMarca(doc, "Dados do relatório", MARGEM_MARCA, y) + 4;

  autoTable(doc, {
    startY: y,
    head: [cabecalhos],
    body: linhas.length ? linhas : [["Sem dados para apresentar"]],
    ...TEMA_TABELA_MARCA,
    tableWidth: LARGURA_UTIL_MARCA,
  });

  finalizarComRodapeMarca(doc);
  doc.save(`${nomeFicheiro(titulo)}.pdf`);
}
