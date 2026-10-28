import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_CINZA,
  COR_MARCA_LINHA,
  formatarData,
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
} from "@/lib/pdfEstilo";
applyPlugin(jsPDF);

const MARGEM = 14;
const LARG_COL = 88; // duas colunas de campos: (210 − 28 − 6) / 2
const X_COL1 = MARGEM;
const X_COL2 = MARGEM + LARG_COL + 6;
const LARG_ROTULO = 31;
const ALT_LINHA = 6.8;

function estadoDoCliente(cliente) {
  return cliente.ativo === false ? "Inactivo" : "Activo";
}

function moradaDoCliente(cliente) {
  const partes = [
    cliente.rua,
    cliente.numero_porta ? `N.º ${cliente.numero_porta}` : null,
  ].filter(Boolean);
  return partes.length ? partes.join(", ") : cliente.endereco || "—";
}

// Campos em duas colunas para a ficha caber numa única página A4 vertical.
function linhaCampo(doc, rotulo, valor, x, y, largCol) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text(String(rotulo || "").toUpperCase(), x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...COR_MARCA_TEXTO);
  const linhas = doc.splitTextToSize(String(valor || "—"), largCol - LARG_ROTULO);
  doc.text(linhas[0], x + LARG_ROTULO, y);
  let alturaExtra = 0;
  if (linhas.length > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    linhas.slice(1, 3).forEach((linha, i) => {
      doc.text(linha, x + LARG_ROTULO, y + 3.6 * (i + 1));
      alturaExtra += 3.6;
    });
  }

  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.setLineWidth(0.15);
  doc.line(x, y + 2.2, x + largCol, y + 2.2);
  return ALT_LINHA + alturaExtra;
}

function parCampos(doc, esquerdo, direito, y) {
  const h1 = linhaCampo(doc, esquerdo[0], esquerdo[1], X_COL1, y, LARG_COL);
  const h2 = linhaCampo(doc, direito[0], direito[1], X_COL2, y, LARG_COL);
  return y + Math.max(h1, h2);
}

function secaoCampos(doc, titulo, pares, y) {
  y = tituloSecaoMarca(doc, titulo, MARGEM, y) + 3.2;
  for (const par of pares) y = parCampos(doc, par[0], par[1], y);
  return y + 3;
}

export default async function gerarFichaClientePdf(cliente, empresa = {}, documentos = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const codigo = cliente.codigo || (cliente.id ? `KCLI-${cliente.id}` : "—");

  // ===== Cabeçalho de marca + marca de água (estilo da facturação) =====
  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Ficha do cliente",
    empresa,
    direitos: [
      `Código: ${codigo}`,
      `Emissão: ${formatarData(new Date())}`,
      `Estado: ${estadoDoCliente(cliente)}`,
    ],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = 50;
  const unidadesSec = Array.isArray(cliente.unidades_secundarias) && cliente.unidades_secundarias.length
    ? cliente.unidades_secundarias.join(" · ")
    : "—";

  // 01 a 03 — campos em duas colunas para caber numa única página
  y = secaoCampos(doc, "01 · Identidade do Cliente & Unidade de Negócio", [
    [["Código do Cliente", codigo], ["Estado do Cliente", estadoDoCliente(cliente)]],
    [["Tipo de Cliente", cliente.tipo_cliente || "—"], ["NIF", cliente.nif || "—"]],
    [["Nome / Razão Social", cliente.nome || "—"], ["Nome Comercial", cliente.nome_comercial || "—"]],
    [["Unidade Principal", cliente.unidade_negocio || "—"], ["Unidade Secundária", unidadesSec]],
  ], y);

  y = secaoCampos(doc, "02 · Contactos Principais & Endereço", [
    [["Telefone", cliente.telefone || "—"], ["WhatsApp", cliente.whatsapp || "—"]],
    [["E-mail", cliente.email || "—"], ["País", cliente.pais || "—"]],
    [["Província", cliente.provincia || "—"], ["Município", cliente.municipio || "—"]],
    [["Bairro", cliente.bairro || "—"], ["Morada", moradaDoCliente(cliente)]],
  ], y);

  y = secaoCampos(doc, "03 · Pessoas de Contacto & Classificação Comercial", [
    [["Pessoa de Contacto", cliente.pessoa_contacto || "—"], ["Função / Cargo", cliente.pessoa_funcao || "—"]],
    [["Telefone Directo", cliente.pessoa_telefone || "—"], ["E-mail da Pessoa", cliente.pessoa_email || "—"]],
    [["Categoria do Cliente", cliente.categoria || "—"], ["Sector de Actividade", cliente.setor_atividade || "—"]],
    [["Fonte de Origem", cliente.fonte_origem || "—"], ["Referência Interna", cliente.referencia_interna || "—"]],
  ], y);

  // 04 — Observações & documentos
  y += 2;
  y = tituloSecaoMarca(doc, "04 · Observações & Documentos", MARGEM, y) + 3.2;

  const obs = String(cliente.observacoes || "").trim();
  const linhasObs = obs ? doc.splitTextToSize(obs, pw - MARGEM * 2 - 6) : ["—"];
  const alturaObs = Math.min(linhasObs.length, 5) * 3.6 + 8.5;
  doc.setFillColor(...COR_MARCA_FUNDO);
  doc.roundedRect(MARGEM, y, pw - MARGEM * 2, alturaObs, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(...COR_MARCA_SECUNDARIO);
  doc.text("OBSERVAÇÕES", MARGEM + 5, y + 4.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...COR_MARCA_TEXTO);
  doc.text(linhasObs.slice(0, 5), MARGEM + 5, y + 8.8);
  y += alturaObs + 5;

  const docs = Array.isArray(documentos) ? documentos : [];
  const linhasDocs = docs.length
    ? docs.map((d) => [
        d.nome_original || "—",
        formatarData(d.createdAt || d.data),
        d.anulado ? "Anulado" : "Activo",
      ])
    : [["Nenhum documento associado.", "—", "—"]];

  doc.autoTable({
    startY: y,
    head: [["Designação", "Data", "Estado"]],
    body: linhasDocs,
    ...TEMA_TABELA_MARCA,
    styles: { ...TEMA_TABELA_MARCA.styles, fontSize: 6.8, cellPadding: 1.4 },
    headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 6.9, cellPadding: 1.6 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 26 },
      2: { halign: "center", cellWidth: 22 },
    },
  });

  // ===== Faixa de continuação (páginas > 1) e rodapé em todas as páginas =====
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFillColor(...COR_MARCA_FUNDO);
      doc.rect(0, 0, pw, 12, "F");
      doc.setTextColor(...COR_MARCA_PRINCIPAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(doc.splitTextToSize(String(doc.marcaNome || ""), 150)[0], MARGEM, 9);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...COR_MARCA_CINZA);
    doc.text(`Página ${p}`, pw - MARGEM, ph - 8, { align: "right" });
    doc.setFontSize(7);
    doc.text(`Documento gerado por KAMGEST em ${formatarData(new Date())}`, pw / 2, ph - 9, { align: "center" });
  }

  doc.save(`Ficha_Cliente_${codigo.replace(/[^\w-]+/g, "_")}.pdf`);
}
