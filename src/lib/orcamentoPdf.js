import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { COR_PRIMARIA, COR_TEXTO, COR_SUAVE, COR_SERVICO, formatKz, formatarData, TEMA_TABELA } from "@/lib/pdfEstilo";
applyPlugin(jsPDF);

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

export default function gerarOrcamentoPdf(orcamento, empresa = {}, opcoesEntrada) {
  const opcoes = juntarOpcoes(opcoesEntrada);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const cli = orcamento.cliente || {};
  const itens = orcamento.itens || [];
  const servicos = orcamento.servicos || [];
  const specs = orcamento.especificacao || {};

  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 16);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const contacto = [
    empresa.endereco || "",
    `NIF: ${empresa.nif || "—"}  |  Tel: ${empresa.telefone || "—"}  |  Email: ${empresa.email || "—"}`,
  ].filter(Boolean);
  contacto.forEach((linha, i) => doc.text(linha, 14, 23 + i * 5));

  doc.setFontSize(15); doc.setFont("helvetica", "bold");
  doc.text("ORÇAMENTO", pw - 14, 16, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${orcamento.numero || "—"}`, pw - 14, 23, { align: "right" });
  doc.text(`Emissão: ${formatarData(orcamento.data)}`, pw - 14, 28, { align: "right" });
  if (orcamento.validade) doc.text(`Validade: ${orcamento.validade} dias`, pw - 14, 33, { align: "right" });

  doc.setTextColor(...COR_TEXTO);
  let y = 50;
  doc.setFillColor(...COR_SUAVE);
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, "F");
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("DADOS DO CLIENTE", 18, y + 6);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`${cli.nome || "—"}${cli.empresa ? `  •  ${cli.empresa}` : ""}`, 18, y + 13);
  const linhaNif = [];
  if (cli.nif) linhaNif.push(`NIF: ${cli.nif}`);
  if (cli.telefone) linhaNif.push(`Tel: ${cli.telefone}`);
  if (cli.email) linhaNif.push(`Email: ${cli.email}`);
  doc.text(linhaNif.join("   |   "), 18, y + 19);
  doc.text(`${cli.endereco || ""}`, 18, y + 25);
  y += 36;

  const specEntradas = Object.entries(specs).filter(([k, v]) => k && v && k !== "produto");
  if (specEntradas.length > 0) {
    doc.setFillColor(...COR_SUAVE);
    doc.roundedRect(14, y, pw - 28, 8 + specEntradas.length * 5, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICAÇÃO TÉCNICA", 18, y + 6);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    specEntradas.forEach(([k, v], i) => {
      doc.text(`${k}: ${v}`, 18, y + 12 + i * 5);
    });
    y += 8 + specEntradas.length * 5 + 4;
  }

  if (itens.length > 0) {
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("ARTIGOS / PRODUTOS", 14, y); y += 4;
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
      ...TEMA_TABELA,
      columnStyles: colunasItens.reduce((acc, c, i) => {
        if (c === "qtd") acc[i + 1] = { halign: "center" };
        else if (c === "preco") acc[i + 1] = { halign: "right" };
        else if (c === "total") acc[i + 1] = { halign: "right", fontStyle: "bold" };
        return acc;
      }, {}),
    });
    y = doc.lastAutoTable.finalY + 6;

    const itensComMaterial = itens.filter((it) => (it.materiais || []).length > 0);
    if (itensComMaterial.length > 0 && opcoes.mostrarMateriais) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("Materiais", 14, y); y += 3;
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
        ...TEMA_TABELA,
        headStyles: { ...TEMA_TABELA.headStyles, fillColor: COR_SUAVE, textColor: COR_TEXTO, fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  }

  if (servicos.length > 0) {
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("SERVIÇOS", 14, y); y += 4;
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
      ...TEMA_TABELA,
      headStyles: { ...TEMA_TABELA.headStyles, fillColor: COR_SERVICO },
      columnStyles: colunasServicos.reduce((acc, c, i) => {
        if (c === "mob" || c === "prazo" || c === "duracao") acc[i + 1] = { halign: "center" };
        else if (c === "valorHora") acc[i + 1] = { halign: "right" };
        else if (c === "total") acc[i + 1] = { halign: "right", fontStyle: "bold" };
        return acc;
      }, {}),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const subtotalItens = itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const subtotalServicos = servicos.reduce((s, sv) => s + (Number(sv.total) || 0), 0);
  const subtotal = orcamento.subtotal || (subtotalItens + subtotalServicos);
  const desconto = Number(orcamento.desconto) || 0;
  const totalPosDesconto = subtotal - desconto;
  const ivaPct = Number(orcamento.iva) || 0;
  const valorIva = Number(orcamento.valorIva) || (totalPosDesconto * ivaPct / 100);
  const total = orcamento.total || (totalPosDesconto + valorIva);

  const boxX = pw - 92;
  const boxW = 78;
  let boxH = 24;
  if (ivaPct > 0) boxH += 7;
  if (desconto > 0) boxH += 7;
  if (servicos.length > 0) boxH += 7;
  if (itens.length > 0) boxH += 7;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COR_PRIMARIA);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, "FD");
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...COR_TEXTO);
  let ty = y + 8;

  if (itens.length > 0) {
    doc.text("Subtotal Itens:", boxX + 5, ty);
    doc.text(formatKz(subtotalItens), boxX + boxW - 5, ty, { align: "right" });
    ty += 7;
  }
  if (servicos.length > 0) {
    doc.text("Subtotal Serviços:", boxX + 5, ty);
    doc.text(formatKz(subtotalServicos), boxX + boxW - 5, ty, { align: "right" });
    ty += 7;
  }
  doc.text("Subtotal:", boxX + 5, ty);
  doc.text(formatKz(subtotal), boxX + boxW - 5, ty, { align: "right" });
  ty += 7;

  if (desconto > 0) {
    doc.text("Desconto:", boxX + 5, ty);
    doc.text(`-${formatKz(desconto)}`, boxX + boxW - 5, ty, { align: "right" });
    ty += 7;
  }

  if (ivaPct > 0) {
    doc.text(`IVA (${ivaPct}%):`, boxX + 5, ty);
    doc.text(formatKz(valorIva), boxX + boxW - 5, ty, { align: "right" });
    ty += 7;
  }

  doc.setDrawColor(...COR_PRIMARIA);
  doc.line(boxX, ty, boxX + boxW, ty);
  ty += 6;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(...COR_PRIMARIA);
  doc.text("TOTAL:", boxX + 5, ty);
  doc.text(formatKz(total), boxX + boxW - 5, ty, { align: "right" });
  y = y + boxH + 8;

  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...COR_TEXTO);
  const infoExtra = [];
  if (orcamento.prazoExecucao) infoExtra.push({ label: "Prazo de Execução", value: orcamento.prazoExecucao });
  if (orcamento.condicoesPagamento) infoExtra.push({ label: "Condições de Pagamento", value: orcamento.condicoesPagamento });
  if (infoExtra.length > 0) {
    doc.setFillColor(...COR_SUAVE);
    doc.roundedRect(14, y, pw - 28, 8 + infoExtra.length * 6, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES GERAIS", 18, y + 6);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    infoExtra.forEach((item, i) => {
      doc.text(`${item.label}: ${item.value}`, 18, y + 12 + i * 6);
    });
    y += 8 + infoExtra.length * 6 + 4;
  }

  if (orcamento.observacoes) {
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.setTextColor(...COR_TEXTO);
    doc.text(`Observações: ${orcamento.observacoes}`, 14, y);
    y += 6;
  }

  const temBanco = empresa.banco_nome || empresa.banco_iban || empresa.banco_conta;
  if (temBanco) {
    doc.setFillColor(...COR_SUAVE);
    doc.roundedRect(14, y, pw - 28, 24, 2, 2, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("DADOS PARA PAGAMENTO", 18, y + 6);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const linhasBanco = [];
    if (empresa.banco_nome) linhasBanco.push(`Banco: ${empresa.banco_nome}`);
    if (empresa.banco_conta) linhasBanco.push(`Conta: ${empresa.banco_conta}`);
    if (empresa.banco_iban) linhasBanco.push(`IBAN: ${empresa.banco_iban}`);
    doc.text(linhasBanco.join("   |   "), 18, y + 13);
    doc.text("Transferência BIM, Multicaixa ou outro meio de pagamento.", 18, y + 19);
    y += 24;
  }

  y = Math.max(y + 12, ph - 40);
  doc.setDrawColor(180, 190, 200);
  doc.line(14, y, pw / 2 - 10, y);
  doc.line(pw / 2 + 10, y, pw - 14, y);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 130, 140);
  doc.text("Assinatura do Responsável", pw / 4 + 5, y + 5, { align: "center" });
  doc.text("Assinatura do Cliente", pw * 3 / 4 - 5, y + 5, { align: "center" });

  doc.setTextColor(160, 170, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF em ${formatarData(new Date())}`, pw / 2, ph - 10, { align: "center" });

  doc.save(`Orcamento_${orcamento.numero || orcamento.id || "documento"}.pdf`);
}
