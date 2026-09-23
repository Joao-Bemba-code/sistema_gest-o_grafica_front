import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import QRCode from "qrcode";
import {
  COR_MARCA_TEXTO,
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

function tituloTipo(tipo) {
  switch (tipo) {
    case "proforma": return "FATURA PROFORMA";
    case "factura_recibo": return "FACTURA RECIBO";
    case "recibo": return "RECIBO";
    case "nota_credito": return "NOTA DE CRÉDITO";
    default: return "FATURA";
  }
}

function rotuloMetodo(m) {
  const mapa = {
    dinheiro: "Dinheiro",
    transferencia: "Transferência",
    ordem_saida: "Ordem de Saque",
    deposito: "Depósito",
    multicaixa: "Multicaixa",
    referencia: "Referência",
    cheque: "Cheque",
  };
  return mapa[m] || m || "—";
}

const corEstado = {
  emitida: [115, 115, 115],
  paga: COR_MARCA_SECUNDARIO,
  parcial: [140, 140, 140],
  vencida: [60, 60, 60],
  cancelada: COR_MARCA_CINZA,
};

export default async function gerarPDF(fatura, empresa = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const cli = fatura.cliente || {};
  const tipo = fatura.tipo || "fatura";
  const ehRecibo = tipo === "factura_recibo" || tipo === "recibo";
  const orcamento = fatura.orcamento || null;
  const orcRef = orcamento ? (orcamento.numero || orcamento.id) : null;
  const orcTotal = Number(orcamento?.total_com_iva ?? orcamento?.total ?? 0) || 0;
  const totalFat = Number(fatura.total || fatura.valor) || 0;
  const pagoFat = Number(fatura.valor_pago) || 0;

  // ===== Cabeçalho de marca (logo real + dados reais da empresa) =====
  const { logo } = await desenharCabecalhoMarca(doc, {
    titulo: tituloTipo(tipo),
    empresa,
    direitos: [
      `Nº: ${fatura.numero || "—"}`,
      `Emissão: ${formatarData(fatura.data_emissao)}`,
      fatura.data_vencimento ? `Vencimento: ${formatarData(fatura.data_vencimento)}` : null,
    ].filter(Boolean),
  });
  desenharMarcaDeAgua(doc, logo);

  let y = 50;

  // ===== Cliente =====
  y += caixaClienteMarca(doc, 14, y, pw - 28, cli) + 8;

  // ===== Itens =====
  y = tituloSecaoMarca(doc, "Descrição dos serviços", 14, y) + 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: (fatura.itens || []).map((it) => [it.descricao || "", String(it.quantidade), formatKz(it.preco_unit), formatKz(it.total)]),
    ...TEMA_TABELA_MARCA,
    columnStyles: { 0: { halign: "left", fontStyle: "bold" }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ===== Totais =====
  const linhasTotais = [{ label: "Subtotal", value: formatKz(fatura.subtotal) }];
  if (Number(fatura.iva) > 0) linhasTotais.push({ label: `IVA (${Number(fatura.iva)}%)`, value: formatKz(fatura.valor_iva) });
  const hTotais = caixaTotaisMarca(doc, pw - 92, y, 78, {
    linhas: linhasTotais,
    totalLabel: ehRecibo ? "TOTAL PAGO:" : "TOTAL:",
    total: formatKz(totalFat),
  });
  y += hTotais + 8;

  // ===== Estado do pagamento =====
  if (ehRecibo) {
    const hPag = orcRef ? 33 : 25;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COR_MARCA_LINHA);
    doc.roundedRect(14, y, pw - 28, hPag, 2.5, 2.5, "FD");
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Pagamento recebido integralmente.", 20, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COR_MARCA_TEXTO);
    doc.text(`Método: ${rotuloMetodo(fatura.metodo_pagamento)}${fatura.data_pagamento ? `   ·   Data: ${formatarData(fatura.data_pagamento)}` : ""}`, 20, y + 15);
    if (orcRef) doc.text(`Documento de origem — Orçamento ${orcRef}: ${formatKz(orcTotal)}`, 20, y + 22);
    y += hPag + 8;
  } else {
    const estado = fatura.estado || "—";
    const corEst = corEstado[estado] || COR_MARCA_CINZA;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COR_MARCA_LINHA);
    doc.roundedRect(14, y, pw - 28, 24, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(...COR_MARCA_PRINCIPAL);
    doc.text("ESTADO DO PAGAMENTO", 20, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(...corEst);
    doc.text(`Estado: ${estado}`, 20, y + 14);
    doc.setTextColor(...COR_MARCA_TEXTO);
    doc.setFont("helvetica", "normal");
    doc.text(`Valor pago: ${pagoFat > 0 ? formatKz(pagoFat) : "Kz 0"}`, pw - 20, y + 13, { align: "right" });
    if (totalFat > pagoFat) {
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "bold");
      doc.text(`Em dívida a liquidar: ${formatKz(totalFat - pagoFat)}`, pw - 20, y + 19, { align: "right" });
    }
    y += 30;
  }

  // ===== Observações =====
  let obsY = y;
  if (fatura.observacoes) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COR_MARCA_TEXTO);
    const obs = doc.splitTextToSize(fatura.observacoes, pw - 28);
    doc.text(`Observações: ${obs[0]}`, 14, obsY);
    obsY += 5;
    for (let i = 1; i < obs.length; i++) {
      doc.text(obs[i], 24, obsY);
      obsY += 4.5;
    }
    obsY += 6;
  }
  y = obsY;

  // ===== Dados Bancários =====
  const hBanco = caixaBancariaMarca(doc, 14, y, pw - 28, empresa);
  y += hBanco + 10;

  // ===== QR Code AGT =====
  if (fatura.agt_document_no && empresa.nif) {
    try {
      const urlQR = `https://quiosqueagt.minfin.gov.ao/facturacao-eletronica/consultar-fe?emissor=${String(empresa.nif).trim()}&document=${String(fatura.agt_document_no).replace(/ /g, "%20")}`;
      const dataUrlQR = await QRCode.toDataURL(urlQR, { errorCorrectionLevel: "M", margin: 1, width: 350, color: { dark: "#1a1a1a", light: "#ffffff" } });
      const qrSize = 24;
      const qx = pw - 14 - qrSize;
      doc.setDrawColor(...COR_MARCA_LINHA);
      doc.roundedRect(qx - 1, y - 1, qrSize + 2, qrSize + 2, 1, 1, "S");
      doc.addImage(dataUrlQR, "PNG", qx, y, qrSize, qrSize, undefined, "FAST");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COR_MARCA_CINZA);
      doc.text("Valide esta fatura na AGT", qx + qrSize / 2, y + qrSize + 4, { align: "center" });
      y += 32;
    } catch (e) {
    }
  }

  // ===== Assinaturas =====
  const yAssin = Math.max(y + 2, ph - 66);
  assinaturaMarca(doc, yAssin);
  y = Math.max(yAssin + 12, ph - 50);

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

  doc.save(`${tituloTipo(tipo).replace(/\s+/g, "_")}_${fatura.numero || fatura.id}.pdf`);
}