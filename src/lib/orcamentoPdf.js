import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

const COR_PRIMARIA = [5, 150, 105];
const COR_TEXTO = [51, 65, 85];
const COR_SUAVE = [235, 245, 240];
const COR_SERVICO = [124, 58, 237];

function formatKz(v) { return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`; }

function formatarData(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-AO");
  } catch {
    return String(d);
  }
}

export default function gerarOrcamentoPdf(orcamento, empresa = {}) {
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
    doc.autoTable({
      startY: y,
      head: [["Artigo/Produto", "Qtd", "Preço Unit.", "Total"]],
      body: itens.map((it) => [it.descricao || "", String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
      theme: "grid",
      headStyles: { fillColor: COR_PRIMARIA, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COR_TEXTO, cellPadding: 2.5 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    const itensComMaterial = itens.filter((it) => (it.materiais || []).length > 0);
    if (itensComMaterial.length > 0) {
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
        theme: "grid",
        headStyles: { fillColor: COR_SUAVE, textColor: COR_TEXTO, fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7, textColor: COR_TEXTO, cellPadding: 2 },
        columnStyles: { 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  }

  if (servicos.length > 0) {
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("SERVIÇOS", 14, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [["Descrição", "Trabalhadores", "Prazo", "Horas", "Valor/Hora", "Total"]],
      body: servicos.map((sv) => [
        sv.descricao || "",
        String(sv.mob || 1),
        `${sv.prazoExecucao || 1} dia${Number(sv.prazoExecucao) !== 1 ? "s" : ""}`,
        `${sv.duracaoHoras || 8}h`,
        formatKz(sv.valorHora),
        formatKz(sv.total),
      ]),
      theme: "grid",
      headStyles: { fillColor: COR_SERVICO, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COR_TEXTO, cellPadding: 2.5 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
      alternateRowStyles: { fillColor: [245, 243, 255] },
      margin: { left: 14, right: 14 },
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
