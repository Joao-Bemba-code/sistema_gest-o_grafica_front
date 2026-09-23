export const COR_PRIMARIA = [5, 150, 105];
export const COR_SECUNDARIA = [20, 40, 70];
export const COR_TEXTO = [51, 65, 85];
export const COR_SUAVE = [235, 245, 240];
export const COR_SERVICO = [124, 58, 237];
export const COR_LINHA = [204, 212, 220];
export const COR_FUNDO_ALTERNADO = [247, 250, 249];

// ─────────────────────────────────────────────────────────────
// PALETA DE MARCA — MONOCROMÁTICA (preto e branco)
// Usada nos documentos de faturação e orçamentos.
// ─────────────────────────────────────────────────────────────
export const COR_MARCA_PRINCIPAL = [26, 26, 26];
export const COR_MARCA_SECUNDARIO = [110, 110, 110];
export const COR_MARCA_TEXTO = [46, 46, 46];
export const COR_MARCA_FUNDO = [244, 244, 244];
export const COR_MARCA_CARTAO = [247, 247, 247];
export const COR_MARCA_LINHA = [205, 205, 205];
export const COR_MARCA_CINZA = [125, 125, 125];
export const MARGEM_MARCA = 14;
export const COR_BRANCO = [255, 255, 255];

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

// Tema de tabela da marca (preenchimento claro, linhas alternadas suaves)
export const TEMA_TABELA_MARCA = {
  theme: "striped",
  styles: {
    fontSize: 7.8,
    textColor: COR_MARCA_TEXTO,
    cellPadding: 2.2,
    valign: "middle",
    lineColor: COR_MARCA_LINHA,
    lineWidth: 0.15,
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: COR_MARCA_FUNDO,
    textColor: COR_MARCA_PRINCIPAL,
    fontStyle: "bold",
    fontSize: 7.8,
    halign: "center",
    valign: "middle",
    cellPadding: 2.5,
  },
  alternateRowStyles: { fillColor: [250, 250, 250] },
  margin: { left: 14, right: 14, top: 8, bottom: 8 },
  didDrawPage: (data) => {
    const d = data.doc;
    const pw = d.internal.pageSize.getWidth();
    if (data.pageNumber > 1) {
      d.setFillColor(...COR_MARCA_FUNDO);
      d.rect(0, 0, pw, 12, "F");
      d.setDrawColor(...COR_MARCA_LINHA);
      d.line(0, 12, pw, 12);
      if (d.marcaNome) {
        d.setTextColor(...COR_MARCA_PRINCIPAL);
        d.setFont("helvetica", "bold");
        d.setFontSize(8.5);
        d.text(d.marcaNome, 14, 9);
      }
    }
    d.setFont("helvetica", "normal");
    d.setFontSize(6.8);
    d.setTextColor(...COR_MARCA_CINZA);
    d.text(`Página ${data.pageNumber}`, pw - 14, d.internal.pageSize.getHeight() - 8, { align: "right" });
  },
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

// ─────────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────────
function origemApi() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");
}

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

// ─────────────────────────────────────────────────────────────
// CABEÇALHO DE MARCA (claro/preto: logotipo + título)
// ─────────────────────────────────────────────────────────────
export async function desenharCabecalhoMarca(doc, { titulo = "", empresa = {}, direitos = [] }) {
  const pw = doc.internal.pageSize.getWidth();

  let logo = null;
  try {
    logo = await carregarLogo(empresa);
  } catch {
    logo = null;
  }

  // Logo à esquerda (com fallback: inicial em caixa com contorno)
  const box = 20;
  const boxX = MARGEM_MARCA;
  const boxY = 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.roundedRect(boxX, boxY, box, box, 2.5, 2.5, "FD");
  doc.setLineWidth(0.2);
  if (logo && logo.data) {
    const escala = Math.min((box - 4) / logo.w, (box - 4) / logo.h);
    const lw = logo.w * escala;
    const lh = logo.h * escala;
    doc.addImage(logo.data, logo.formato, boxX + (box - lw) / 2, boxY + (box - lh) / 2, lw, lh);
  } else {
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text((empresa.nome || "C").trim().charAt(0).toUpperCase(), boxX + box / 2, boxY + box / 2 + 5, { align: "center" });
  }

  // Nome e contactos da empresa
  const textoX = boxX + box + 8;
  doc.marcaNome = empresa.nome || "SIGRAF";
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(empresa.nome || "SIGRAF", textoX, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...COR_MARCA_TEXTO);
  let ty = 25;
  const info = [
    empresa.endereco,
    `NIF: ${empresa.nif || "—"}   ·   Tel: ${empresa.telefone || "—"}   ·   Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  for (const l in info) {
    const partes = doc.splitTextToSize(info[l], 82);
    for (const p of partes.slice(0, 2)) {
      if (ty > 38) break;
      doc.text(p, textoX, ty);
      ty += 4.3;
    }
  }

  // Título do documento + metadados à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16.5);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text(titulo.toUpperCase(), pw - MARGEM_MARCA, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...COR_MARCA_TEXTO);
  let ry = 26;
  (direitos || []).slice(0, 3).forEach((l) => {
    doc.text(l, pw - MARGEM_MARCA, ry, { align: "right" });
    ry += 5.4;
  });

  // Linha de separação
  doc.setDrawColor(...COR_MARCA_PRINCIPAL);
  doc.setLineWidth(0.7);
  doc.line(0, 44, pw, 44);

  return { yInicio: 50, logo };
}

// Marca de água suave com o logotipo
export function desenharMarcaDeAgua(doc, logo) {
  if (!logo || !logo.data) return;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const alvo = 80;
  const escala = alvo / Math.max(logo.w, logo.h);
  const lw = logo.w * escala;
  const lh = logo.h * escala;
  const x = (pw - lw) / 2;
  const y = ph / 2 - lh / 2 - 8;
  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.addImage(logo.data, logo.formato, x, y, lw, lh, undefined, "FAST");
  doc.setGState(new doc.GState({ opacity: 1 }));
}

// Título de secção (marcador de contorno + texto)
export function tituloSecaoMarca(doc, texto, x, y) {
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y - 3, 4.4, 4.4, 0.8, 0.8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text(texto.toUpperCase(), x + 7.5, y, { charSpace: 0.25 });
  return y + 3.5;
}

// Caixa de totais (cartão com destaque no total)
export function caixaTotaisMarca(doc, x, y, w, { linhas = [], rotulo = "RESUMO", totalLabel = "TOTAL:", total = "" }) {
  const h = 8 + linhas.length * 6 + 14;
  doc.setFillColor(...COR_MARCA_CARTAO);
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text(rotulo.toUpperCase(), x + 6, y + 5.5);
  let ty = y + 11.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.3);
  doc.setTextColor(...COR_MARCA_TEXTO);
  for (const r of linhas) {
    doc.setFont(r.bold ? "helvetica" : "helvetica", r.bold ? "bold" : "normal");
    doc.text(r.label, x + 6, ty);
    doc.setFont("helvetica", "bold");
    doc.text(r.value, x + w - 6, ty, { align: "right" });
    ty += 6;
  }
  const linhaTotal = y + h - 11;
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.line(x + 5, linhaTotal - 2, x + w - 5, linhaTotal - 2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 3, linhaTotal, w - 6, 10, 2, 2, "FD");
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(totalLabel, x + 6, linhaTotal + 7);
  doc.text(total, x + w - 6, linhaTotal + 7, { align: "right" });
  return h;
}

// Caixa de dados do cliente
export function caixaClienteMarca(doc, x, y, w, cli) {
  const h = 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(x, y, 2.4, h, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text("DADOS DO CLIENTE", x + 9, y + 6.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COR_MARCA_TEXTO);
  const nome = `${cli.nome || "—"}${cli.empresa ? `   ·   ${cli.empresa}` : ""}`;
  const nomeLinha = doc.splitTextToSize(nome, w - 20);
  doc.text(nomeLinha[0], x + 9, y + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  let cy = y + 18.5;
  const info = [cli.nif && `NIF: ${cli.nif}`, cli.telefone && `Tel: ${cli.telefone}`, cli.email && `Email: ${cli.email}`].filter(Boolean);
  if (info.length) {
    doc.text(info.join("   ·   "), x + 9, cy);
    cy += 4.5;
  }
  if (cli.endereco) {
    doc.splitTextToSize(cli.endereco, w - 20).slice(0, 1).forEach((p) => {
      doc.text(p, x + 9, cy);
      cy += 4.5;
    });
  }
  return h;
}

// Caixa de dados bancários
export function caixaBancariaMarca(doc, x, y, w, empresa) {
  const h = 26;
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text("DADOS PARA PAGAMENTO", x + 6, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(...COR_MARCA_TEXTO);
  const linhas = [];
  if (empresa.banco_nome) linhas.push(`Banco: ${empresa.banco_nome}`);
  if (empresa.banco_conta) linhas.push(`Conta: ${empresa.banco_conta}`);
  if (empresa.banco_iban) linhas.push(`IBAN: ${empresa.banco_iban}`);
  doc.text(linhas.length ? linhas.join("   ·   ") : "Dados bancários disponíveis mediante solicitação.", x + 6, y + 13.5);
  doc.text("Transferência BIM, Multicaixa ou outro meio de pagamento.", x + 6, y + 20);
  return h;
}

// Linhas de assinatura (responsável + cliente)
export function assinaturaMarca(doc, y, rotulos = ["Assinatura do Responsável", "Assinatura do Cliente"]) {
  const pw = doc.internal.pageSize.getWidth();
  const meio = pw / 2;
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.line(MARGEM_MARCA, y, meio - 15, y);
  doc.line(meio + 15, y, pw - MARGEM_MARCA, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...COR_MARCA_CINZA);
  const esquerda = MARGEM_MARCA + (meio - 15 - MARGEM_MARCA) / 2;
  const direita = meio + 15 + (pw - MARGEM_MARCA - (meio + 15)) / 2;
  doc.text(rotulos[0] || "", esquerda, y + 4.5, { align: "center" });
  doc.text(rotulos[1] || "", direita, y + 4.5, { align: "center" });
}