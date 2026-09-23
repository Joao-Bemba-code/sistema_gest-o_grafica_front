import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_TEXTO,
  COR_MARCA_FUNDO,
  COR_MARCA_LINHA,
  COR_MARCA_CINZA,
  COR_MARCA_PRINCIPAL,
  COR_MARCA_SECUNDARIO,
  formatKz,
  formatarData,
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  desenharMarcaDeAgua,
  tituloSecaoMarca,
  caixaClienteMarca,
  caixaTotaisMarca,
  caixaBancariaMarca,
  assinaturaMarca,
} from "@/lib/pdfEstilo";
applyPlugin(jsPDF);

const MARGEM = 14;

const OPCOES_PADRAO = {
  mostrarQtd: true,
  mostrarPrecoUnit: true,
  mostrarTotalItem: true,
  mostrarMateriais: true,
  mostrarMob: true,
  mostrarPrazo: true,
  mostrarDuracao: true,
  mostrarValorHora: true,
  mostrarTotalServico: true,
};

function juntarOpcoes(opcoes) {
  return { ...OPCOES_PADRAO, ...(opcoes || {}) };
}

function desenharObservacoes(doc, texto, x, y, w) {
  if (!texto) return y;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COR_MARCA_TEXTO);
  const obs = doc.splitTextToSize(texto, w);
  doc.text(`Observações: ${obs[0]}`, x, y);
  y += 5;
  for (let i = 1; i < obs.length; i++) {
    doc.text(obs[i], x + 10, y);
    y += 4.5;
  }
  return y;
}

export default async function gerarOrcamentoPdf(orcamento, empresa = {}, opcoesEntrada) {
  const opcoes = juntarOpcoes(opcoesEntrada);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const cli = orcamento.cliente || {};
  const itens = orcamento.itens || [];
  const servicos = orcamento.servicos || [];
  const specs = orcamento.especificacao || {};

  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: "ORÇAMENTO",
    empresa,
    direitos: [
      `Nº: ${orcamento.numero || "—"}`,
      `Emissão: ${formatarData(orcamento.data)}`,
      orcamento.validade ? `Validade: ${orcamento.validade} dias` : null,
    ].filter(Boolean),
  });
  desenharMarcaDeAgua(doc, logo);

  let y = 50;

  // ===== Cliente =====
  y += caixaClienteMarca(doc, MARGEM, y, pw - 28, cli) + 8;

  // ===== Especificação Técnica =====
  const specEntradas = Object.entries(specs).filter(([k, v]) => k && v && k !== "produto");
  if (specEntradas.length > 0) {
    const hSpec = 8 + specEntradas.length * 5.5 + 4;
    doc.setFillColor(...COR_MARCA_FUNDO);
    doc.roundedRect(MARGEM, y, pw - 28, hSpec, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.text("ESPECIFICAÇÃO TÉCNICA", 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COR_MARCA_TEXTO);
    specEntradas.forEach(([k, v], i) => {
      const texto = doc.splitTextToSize(`${k}: ${v}`, pw - 40);
      doc.text(texto[0], 20, y + 12.5 + i * 5.5);
    });
    y += hSpec + 6;
  }

  // ===== Itens / Produtos =====
  if (itens.length > 0) {
    y = tituloSecaoMarca(doc, "Artigos / Produtos", MARGEM, y) + 2;
    const headItens = ["Artigo/Produto"];
    const colunasItens = [];
    if (opcoes.mostrarQtd) { headItens.push("Qtd"); colunasItens.push("qtd"); }
    if (opcoes.mostrarPrecoUnit) { headItens.push("Preço Unit."); colunasItens.push("preco"); }
    if (opcoes.mostrarTotalItem) { headItens.push("Total"); colunasItens.push("total"); }
    const bodyItens = itens.map((it) => headItens.map((_, ci) => {
      const chave = colunasItens[ci - 1] || "";
      if (chave === "qtd") return String(it.quantidade);
      if (chave === "preco") return formatKz(it.valorUnitario);
      if (chave === "total") return formatKz(it.total);
      return it.descricao || "";
    }));
    doc.autoTable({
      startY: y,
      head: [headItens],
      body: bodyItens,
      ...TEMA_TABELA_MARCA,
      columnStyles: colunasItens.reduce((acc, c, i) => {
        if (c === "qtd") acc[i + 1] = { halign: "center" };
        else if (c === "preco") acc[i + 1] = { halign: "right" };
        else if (c === "total") acc[i + 1] = { halign: "right", fontStyle: "bold", textColor: COR_MARCA_SECUNDARIO };
        return acc;
      }, {}),
    });
    y = doc.lastAutoTable.finalY + 6;

    const itensComMaterial = itens.filter((it) => (it.materiais || []).length > 0);
    if (itensComMaterial.length > 0 && opcoes.mostrarMateriais) {
      y = tituloSecaoMarca(doc, "Materiais", MARGEM, y) + 2;
      const materialRows = [];
      itensComMaterial.forEach((it) => {
        (it.materiais || []).forEach((m) => {
          materialRows.push([it.descricao, m.descricao || "", `${m.quantidade} ${m.unidade || "un"}`, formatKz(m.custo_unit), formatKz(m.custo_total)]);
        });
      });
      doc.autoTable({
        startY: y,
        head: [["Produto", "Material", "Qtd", "Valor Unit.", "Total"]],
        body: materialRows,
        ...TEMA_TABELA_MARCA,
        headStyles: { ...TEMA_TABELA_MARCA.headStyles, fillColor: COR_MARCA_FUNDO, textColor: COR_MARCA_PRINCIPAL, fontSize: 7 },
        bodyStyles: { fontSize: 7.2 },
        columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  }

  // ===== Serviços =====
  if (servicos.length > 0) {
    y = tituloSecaoMarca(doc, "Serviços", MARGEM, y) + 2;
    const headServicos = ["Descrição"];
    const colunasServicos = [];
    if (opcoes.mostrarMob) { headServicos.push("Trabalhadores"); colunasServicos.push("mob"); }
    if (opcoes.mostrarPrazo) { headServicos.push("Prazo"); colunasServicos.push("prazo"); }
    if (opcoes.mostrarDuracao) { headServicos.push("Duração"); colunasServicos.push("duracao"); }
    if (opcoes.mostrarValorHora) { headServicos.push("Val./Hora"); colunasServicos.push("valorHora"); }
    if (opcoes.mostrarTotalServico) { headServicos.push("Total"); colunasServicos.push("total"); }
    const bodyServicos = servicos.map((sv) => {
      const unidade = sv.prazoUnidade || sv.prazo_unidade || "dias";
      const prazoLabel = unidade === "horas" ? "hora" : unidade === "minutos" ? "minuto" : "dia";
      const plural = Number(sv.prazoExecucao) !== 1;
      return headServicos.map((_, ci) => {
        const chave = colunasServicos[ci - 1] || "";
        if (chave === "mob") return String(sv.mob || 1);
        if (chave === "prazo") return `${sv.prazoExecucao || 1} ${prazoLabel}${plural ? "s" : ""}`;
        if (chave === "duracao") return `${sv.duracaoHoras || 8}h`;
        if (chave === "valorHora") return formatKz(sv.valorHora);
        if (chave === "total") return formatKz(sv.total);
        return sv.descricao || "";
      });
    });
    doc.autoTable({
      startY: y,
      head: [headServicos],
      body: bodyServicos,
      ...TEMA_TABELA_MARCA,
      headStyles: { ...TEMA_TABELA_MARCA.headStyles, fillColor: COR_MARCA_FUNDO, textColor: COR_MARCA_PRINCIPAL },
      columnStyles: colunasServicos.reduce((acc, c, i) => {
        if (c === "mob" || c === "prazo" || c === "duracao") acc[i + 1] = { halign: "center" };
        else if (c === "valorHora") acc[i + 1] = { halign: "right" };
        else if (c === "total") acc[i + 1] = { halign: "right", fontStyle: "bold", textColor: COR_MARCA_SECUNDARIO };
        return acc;
      }, {}),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ===== Totais =====
  const subtotalItens = itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const subtotalServicos = servicos.reduce((s, sv) => s + (Number(sv.total) || 0), 0);
  const subtotal = orcamento.subtotal || (subtotalItens + subtotalServicos);
  const desconto = Number(orcamento.desconto) || 0;
  const totalPosDesconto = subtotal - desconto;
  const ivaPct = Number(orcamento.iva) || 0;
  const valorIva = Number(orcamento.valorIva) || (totalPosDesconto * ivaPct / 100);
  const total = orcamento.total || (totalPosDesconto + valorIva);

  const linhasTotais = [];
  if (itens.length > 0) linhasTotais.push({ label: "Subtotal Itens", value: formatKz(subtotalItens) });
  if (servicos.length > 0) linhasTotais.push({ label: "Subtotal Serviços", value: formatKz(subtotalServicos) });
  linhasTotais.push({ label: "Subtotal", value: formatKz(subtotal), bold: true });
  if (desconto > 0) linhasTotais.push({ label: "Desconto", value: `-${formatKz(desconto)}` });
  if (ivaPct > 0) linhasTotais.push({ label: `IVA (${ivaPct}%)`, value: formatKz(valorIva), bold: true });
  const hTotais = caixaTotaisMarca(doc, pw - 92, y, 78, {
    linhas: linhasTotais,
    totalLabel: "TOTAL:",
    total: formatKz(total),
  });
  y += hTotais + 6;

  // ===== Condições Gerais =====
  const infoExtra = [];
  if (orcamento.prazoExecucao) infoExtra.push({ label: "Prazo de Execução", value: orcamento.prazoExecucao });
  if (orcamento.condicoesPagamento) infoExtra.push({ label: "Condições de Pagamento", value: orcamento.condicoesPagamento });
  if (infoExtra.length > 0) {
    const hCond = 8 + infoExtra.length * 6 + 4;
    doc.setFillColor(...COR_MARCA_FUNDO);
    doc.roundedRect(MARGEM, y, pw - 28, hCond, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.text("CONDIÇÕES GERAIS", 20, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COR_MARCA_TEXTO);
    infoExtra.forEach((item, i) => {
      doc.text(`${item.label}: ${item.value}`, 20, y + 12.5 + i * 6);
    });
    y += hCond + 6;
  }

  // ===== Observações =====
  y = desenharObservacoes(doc, orcamento.observacoes, MARGEM, y, pw - 28) + (orcamento.observacoes ? 5 : 0);

  // ===== Dados Bancários =====
  const hBanco = caixaBancariaMarca(doc, MARGEM, y, pw - 28, empresa);
  y += hBanco + 8;

  // ===== Assinaturas =====
  const yAssin = Math.max(y + 2, ph - 62);
  assinaturaMarca(doc, yAssin);
  y = Math.max(yAssin + 11, ph - 46);

  // ===== Agradecimento =====
  doc.setDrawColor(...COR_MARCA_LINHA);
  doc.line(MARGEM, y, pw - MARGEM, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COR_MARCA_PRINCIPAL);
  doc.text("Obrigado pela sua preferência!", pw / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COR_MARCA_CINZA);
  doc.text(`${(empresa.nome || "SIGRAF").toUpperCase()}   ·   ${empresa.email || "—"}   ·   ${empresa.telefone || "—"}`, pw / 2, y + 14, { align: "center" });

  // ===== Rodapé =====
  doc.setFontSize(7);
  doc.setTextColor(...COR_MARCA_CINZA);
  doc.text(`Documento gerado por SIGRAF em ${formatarData(new Date())}`, pw / 2, ph - 9, { align: "center" });

  doc.save(`Orcamento_${orcamento.numero || orcamento.id || "documento"}.pdf`);
}