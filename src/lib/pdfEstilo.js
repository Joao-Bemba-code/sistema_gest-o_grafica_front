export const COR_PRIMARIA = [5, 150, 105];
export const COR_SECUNDARIA = [20, 40, 70];
export const COR_TEXTO = [51, 65, 85];
export const COR_SUAVE = [235, 245, 240];
export const COR_SERVICO = [124, 58, 237];
export const COR_LINHA = [204, 212, 220];
export const COR_FUNDO_ALTERNADO = [247, 250, 249];

// ─────────────────────────────────────────────────────────────
// PALETA DE MARCA — CENFLOR
// Verde escuro #1B5E3A | Verde claro #4CAF7D | Cinza #2E2E2E
// Fundo #F4F6F5 | Branco #FFFFFF | Cartão #EAF6EE
// ─────────────────────────────────────────────────────────────
export const COR_MARCA_PRINCIPAL = [27, 94, 58];
export const COR_MARCA_SECUNDARIO = [76, 175, 125];
export const COR_MARCA_TEXTO = [46, 46, 46];
export const COR_MARCA_FUNDO = [244, 246, 245];
export const COR_MARCA_CARTAO = [234, 246, 238];
export const COR_MARCA_LINHA = [222, 231, 226];
export const COR_MARCA_CINZA = [122, 132, 126];
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

// Tema de tabela da marca (cabeçalho verde escuro, linhas alternadas)
export const TEMA_TABELA_MARCA = {
  theme: "striped",
  styles: {
    fontSize: 8.5,
    textColor: COR_MARCA_TEXTO,
    cellPadding: 2.8,
    valign: "middle",
    lineColor: COR_MARCA_LINHA,
    lineWidth: 0.15,
    overflow: "linebreak",
  },
  headStyles: {
    fillColor: COR_MARCA_PRINCIPAL,
    textColor: [255, 255, 255],
    fontStyle: "bold",
    fontSize: 8.3,
    halign: "center",
    valign: "middle",
    cellPadding: 3,
  },
  alternateRowStyles: { fillColor: [247, 250, 248] },
  margin: { left: 14, right: 14, top: 22, bottom: 18 },
  didDrawPage: (data) => {
    const d = data.doc;
    const pw = d.internal.pageSize.getWidth();
    if (data.pageNumber > 1) {
      d.setFillColor(...COR_MARCA_PRINCIPAL);
      d.rect(0, 0, pw, 12, "F");
      d.setFillColor(...COR_MARCA_SECUNDARIO);
      d.rect(0, 12, pw, 2, "F");
      if (d.marcaNome) {
        d.setTextColor(255, 255, 255);
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
// CABEÇALHO DE MARCA (faixa verde + logotipo + título)
// ─────────────────────────────────────────────────────────────
export async function desenharCabecalhoMarca(doc, { titulo = "", empresa = {}, direitos = [] }) {
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COR_MARCA_PRINCIPAL);
  doc.rect(0, 0, pw, 46, "F");
  doc.setFillColor(...COR_MARCA_SECUNDARIO);
  doc.rect(0, 46, pw, 3.2, "F");

  let logo = null;
  try {
    logo = await carregarLogo(empresa);
  } catch {
    logo = null;
  }

  // Logo à esquerda (com fallback: inicial em círculo quadrado)
  const box = 22;
  const boxX = MARGEM_MARCA;
  const boxY = 12;
  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const lw = logo.w * escala;
    const lh = logo.h * escala;
    doc.addImage(logo.data, logo.formato, boxX + (box - lw) / 2, boxY + (box - lh) / 2, lw, lh);
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, boxY, box, box, 3, 3, "F");
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text((empresa.nome || "C").trim().charAt(0).toUpperCase(), boxX + box / 2, boxY + box / 2 + 5.5, { align: "center" });
  }

  // Nome e contactos da empresa
  const textoX = boxX + box + 7;
  doc.marcaNome = empresa.nome || "SIGRAF";
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.text(empresa.nome || "SIGRAF", textoX, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  let ty = 29;
  const info = [
    empresa.endereco,
    `NIF: ${empresa.nif || "—"}   ·   Tel: ${empresa.telefone || "—"}   ·   Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  for (const l in info) {
    const partes = doc.splitTextToSize(info[l], 80);
    for (const p of partes.slice(0, 2)) {
      if (ty > 40) break;
      doc.text(p, textoX, ty);
      ty += 4.4;
    }
  }

  // Título do documento + metadados à direita
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16.5);
  doc.text(titulo.toUpperCase(), pw - MARGEM_MARCA, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  let ry = 26;
  (direitos || []).slice(0, 3).forEach((l) => {
    doc.text(l, pw - MARGEM_MARCA, ry, { align: "right" });
    ry += 5.4;
  });

  return { yInicio: 52, logo };
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

// Título de secção (barra verde + texto)
export function tituloSecaoMarca(doc, texto, x, y) {
  doc.setFillColor(...COR_MARCA_PRINCIPAL);
  doc.roundedRect(x, y - 3, 4.4, 4.4, 0.8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text(texto.toUpperCase(), x + 7.5, y, { charSpace: 0.25 });
  return y + 3.5;
}

// Caixa de totais (cartão com destaque no total)
export function caixaTotaisMarca(doc, x, y, w, { linhas = [], rotulo = "RESUMO", totalLabel = "TOTAL:", total = "" }) {
  const h = 10 + linhas.length * 7 + 16;
  doc.setFillColor(...COR_MARCA_CARTAO);
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text(rotulo.toUpperCase(), x + 6, y + 6.5);
  let ty = y + 13.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COR_MARCA_TEXTO);
  for (const r of linhas) {
    doc.setFont(r.bold ? "helvetica" : "helvetica", r.bold ? "bold" : "normal");
    doc.text(r.label, x + 6, ty);
    doc.setFont("helvetica", "bold");
    doc.text(r.value, x + w - 6, ty, { align: "right" });
    ty += 7;
  }
  const linhaTotal = y + h - 13;
  doc.setDrawColor(...COR_MARCA_SECUNDARIO);
  doc.line(x + 5, linhaTotal - 2.5, x + w - 5, linhaTotal - 2.5);
  doc.setFillColor(...COR_MARCA_PRINCIPAL);
  doc.roundedRect(x + 3, linhaTotal, w - 6, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(totalLabel, x + 6, linhaTotal + 7.5);
  doc.text(total, x + w - 6, linhaTotal + 7.5, { align: "right" });
  return h;
}

// Caixa de dados do cliente
export function caixaClienteMarca(doc, x, y, w, cli) {
  const h = 32;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setFillColor(...COR_MARCA_PRINCIPAL);
  doc.roundedRect(x, y, 2.4, h, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text("DADOS DO CLIENTE", x + 9, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COR_MARCA_TEXTO);
  const nome = `${cli.nome || "—"}${cli.empresa ? `   ·   ${cli.empresa}` : ""}`;
  const nomeLinha = doc.splitTextToSize(nome, w - 20);
  doc.text(nomeLinha[0], x + 9, y + 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  let cy = y + 21;
  const info = [cli.nif && `NIF: ${cli.nif}`, cli.telefone && `Tel: ${cli.telefone}`, cli.email && `Email: ${cli.email}`].filter(Boolean);
  if (info.length) {
    doc.text(info.join("   ·   "), x + 9, cy);
    cy += 4.8;
  }
  if (cli.endereco) {
    doc.splitTextToSize(cli.endereco, w - 20).slice(0, 1).forEach((p) => {
      doc.text(p, x + 9, cy);
      cy += 4.8;
    });
  }
  return h;
}

// Caixa de dados bancários
export function caixaBancariaMarca(doc, x, y, w, empresa) {
  const tem = empresa.banco_nome || empresa.banco_iban || empresa.banco_conta;
  if (!tem) return 0;
  const h = 24;
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text("DADOS PARA PAGAMENTO", x + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COR_MARCA_TEXTO);
  const linhas = [];
  if (empresa.banco_nome) linhas.push(`Banco: ${empresa.banco_nome}`);
  if (empresa.banco_conta) linhas.push(`Conta: ${empresa.banco_conta}`);
  if (empresa.banco_iban) linhas.push(`IBAN: ${empresa.banco_iban}`);
  doc.text(linhas.join("   ·   "), x + 6, y + 13);
  doc.text("Transferência BIM, Multicaixa ou outro meio de pagamento.", x + 6, y + 19);
  return h;
}