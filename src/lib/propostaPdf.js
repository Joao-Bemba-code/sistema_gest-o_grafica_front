import jsPDF from "jspdf";
import {
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_CINZA,
  COR_MARCA_LINHA,
  MARGEM_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
  caixaClienteMarca,
  assinaturaMarca,
} from "@/lib/pdfEstilo";

const ROTULO_UNIDADE = {
  "UN-01": "UN-01 · Artes Gráficas",
  "UN-02": "UN-02 · Formação Profissional",
  "UN-03": "UN-03 · Solução Digital",
};

function formatarData(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-PT");
}

function escreverParagrafo(doc, texto, x, y, largura, ph, opcoes = {}) {
  const {
    tamanho = 9.5,
    estilo = "normal",
    cor = COR_MARCA_TEXTO,
    alturaLinha = 4.8,
  } = opcoes;
  doc.setFont("helvetica", estilo);
  doc.setFontSize(tamanho);
  doc.setTextColor(...cor);
  const linhas = doc.splitTextToSize(String(texto || ""), largura);
  for (const linha of linhas) {
    if (y > ph - 40) {
      doc.addPage();
      y = 24;
    }
    doc.text(linha, x, y);
    y += alturaLinha;
  }
  return y;
}

export default async function gerarPropostaPdf(proposta, empresa = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const largura = pw - MARGEM_MARCA * 2;

  const validade = proposta.validade
    ? `${proposta.validade} dias${proposta.validade_data ? ` (até ${formatarData(proposta.validade_data)})` : ""}`
    : "—";
  const criadaEm = formatarData(proposta.criada_em || proposta.data_envio);

  const { yInicio, logo } = await desenharCabecalhoMarca(doc, {
    titulo: "Proposta",
    empresa,
    direitos: [
      proposta.numero || "",
      `Data: ${criadaEm}`,
      `Validade: ${validade}`,
    ],
  });
  desenharMarcaDeAgua(doc, logo);

  let y = yInicio;
  const cli = proposta.cliente || {};
  y += caixaClienteMarca(doc, MARGEM_MARCA, y, largura, {
    nome: cli.nome || "—",
    empresa: cli.empresa || "",
    nif: cli.nif || "",
    telefone: cli.telefone || "",
    email: cli.email || "",
    endereco: cli.endereco || "",
  }) + 8;

  // Dados da proposta
  tituloSecaoMarca(doc, "Dados da proposta", MARGEM_MARCA, y);
  y += 6;
  const dados = [
    ["Unidade de negócio", ROTULO_UNIDADE[proposta.unidade] || proposta.unidade || "—"],
    ["Prazo de execução", proposta.prazo_execucao || "—"],
    ["Validade", validade],
    ["Responsável", proposta.responsavel || "—"],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const [rotulo, valor] of dados) {
    doc.setTextColor(...COR_MARCA_SECUNDARIO);
    doc.text(rotulo, MARGEM_MARCA + 9, y);
    doc.setTextColor(...COR_MARCA_TEXTO);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(String(valor), largura - 69)[0] || "—", MARGEM_MARCA + 61, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  }
  y += 3;

  // Objecto
  tituloSecaoMarca(doc, "Objecto", MARGEM_MARCA, y);
  y += 5;
  y = escreverParagrafo(doc, proposta.objecto || "—", MARGEM_MARCA, y, largura, ph, {
    tamanho: 11.5,
    estilo: "bold",
    cor: COR_MARCA_PRINCIPAL,
    alturaLinha: 5.6,
  });
  y += 4;

  // Descrição
  tituloSecaoMarca(doc, "Descrição", MARGEM_MARCA, y);
  y += 5;
  if (proposta.descricao) {
    y = escreverParagrafo(doc, proposta.descricao, MARGEM_MARCA, y, largura, ph);
  } else {
    y = escreverParagrafo(doc, "Sem descrição detalhada.", MARGEM_MARCA, y, largura, ph, {
      estilo: "italic",
      cor: COR_MARCA_CINZA,
    });
  }
  y += 6;

  // Condições
  doc.setFillColor(...COR_MARCA_FUNDO);
  const alturaCaixa = 18;
  if (y + alturaCaixa > ph - 45) {
    doc.addPage();
    y = 24;
  }
  doc.roundedRect(MARGEM_MARCA, y, largura, alturaCaixa, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text("CONDIÇÕES", MARGEM_MARCA + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(...COR_MARCA_TEXTO);
  doc.text(
    `A presente proposta é válida por ${proposta.validade || 0} dias a contar da data de emissão.`,
    MARGEM_MARCA + 5,
    y + 12
  );
  y += alturaCaixa + 10;

  // Assinaturas
  const yAssin = Math.max(y + 6, ph - 62);
  if (yAssin > ph - 40) {
    doc.addPage();
    assinaturaMarca(doc, 60);
  } else {
    assinaturaMarca(doc, yAssin);
  }

  // Rodapé
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.setFontSize(7);
  doc.setTextColor(...COR_MARCA_CINZA);
  doc.text(
    `${(empresa.nome || "KAMGEST")}   ·   ${empresa.email || "—"}   ·   ${empresa.telefone || "—"}`,
    pw / 2,
    ph - 9,
    { align: "center" }
  );

  doc.save(`Proposta_${proposta.numero || proposta.id || "documento"}.pdf`);
}
