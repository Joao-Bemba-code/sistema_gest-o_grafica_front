export const COR_PRIMARIA = [5, 150, 105];
export const COR_SECUNDARIA = [20, 40, 70];
export const COR_TEXTO = [51, 65, 85];
export const COR_SUAVE = [235, 245, 240];
export const COR_SERVICO = [124, 58, 237];
export const COR_LINHA = [204, 212, 220];
export const COR_FUNDO_ALTERNADO = [247, 250, 249];

export function formatKz(v) {
  const numero = Number(v || 0).toLocaleString("pt-AO").replace(/\s/g, "\u00A0");
  return `Kz ${numero}`;
}

export function formatNumero(v) {
  return Number(v || 0).toLocaleString("pt-AO").replace(/\s/g, "\u00A0");
}

export function formatarData(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-AO");
  } catch {
    return String(d);
  }
}

export const TEMA_TABELA = {
  theme: "grid",
  styles: {
    fontSize: 8,
    textColor: COR_TEXTO,
    cellPadding: 2.5,
    valign: "middle",
    lineColor: COR_LINHA,
    lineWidth: 0.15,
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: COR_PRIMARIA,
    textColor: [255, 255, 255],
    fontStyle: "bold",
    fontSize: 8,
    halign: "center",
    valign: "middle",
    cellPadding: 3,
  },
  alternateRowStyles: { fillColor: COR_FUNDO_ALTERNADO },
  margin: { left: 14, right: 14 },
};

export function cabecalhoPagina(doc, titulo, empresa = {}, direitos = []) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const contacto = [
    empresa.endereco || "",
    `NIF: ${empresa.nif || "—"}  |  Tel: ${empresa.telefone || "—"}  |  Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  contacto.forEach((linha, i) => doc.text(linha, 14, 23 + i * 5));

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, pw - 14, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  direitos.forEach((linha, i) => doc.text(linha, pw - 14, 24 + i * 6, { align: "right" }));
}

export function rodape(doc, texto = "Documento gerado por SIGRAF") {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 170, 180);
  doc.text(`Página ${doc.internal.getNumberOfPages()}`, pw - 14, ph - 8, { align: "right" });
  doc.text(texto, 14, ph - 8);
}