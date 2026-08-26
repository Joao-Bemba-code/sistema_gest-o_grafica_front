import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { formatKz, familias, normalizarFamilia, tiposItem, entradasEspecificacao } from "./estoque";

applyPlugin(jsPDF);

function origemApi() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");
}

export async function carregarLogo(org) {
  if (!org?.logo_url) return null;
  try {
    const resp = await fetch(`${origemApi()}${org.logo_url}`);
    const blob = await resp.blob();
    if (!resp.ok || !blob.type.startsWith("image")) return null;
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
    return { data, formato, w: dims?.w, h: dims?.h };
  } catch {
    return null;
  }
}

async function desenharCabecalho(doc, org = {}, titulo) {
  const pw = doc.internal.pageSize.getWidth();
  const box = 30;
  const logo = await carregarLogo(org);

  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, 14, 12 + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(14, 12, box, box, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), 14 + box / 2, 12 + box / 2 + 1, { align: "center" });
  }

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text(org.nome || "SIGRAF", 14, 12 + box + 3);

  const tituloY = 12 + box + 13;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, tituloY);

  const infos = [`Data: ${new Date().toLocaleDateString("pt-BR")}`, `Hora: ${new Date().toLocaleTimeString("pt-BR")}`];
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  infos.forEach((linha, i) => doc.text(linha, pw - 14, tituloY + i * 4.5, { align: "right" }));

  const linhaY = tituloY + 4.5 * infos.length + 2;
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.6);
  doc.line(14, linhaY, pw - 14, linhaY);

  return { tituloY, linhaY, pw, box };
}

export async function gerarRequisicaoPDF(mov, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const mat = mov.material || {};
  const cat = mat.categoria?.nome || "—";
  const ehEntrada = mov.tipo === "entrada";
  const custoUnit = mat.custo_unitario != null ? mat.custo_unitario : mat.custo_unit;
  const custoStr = custoUnit != null && Number(custoUnit) > 0 ? formatKz(custoUnit) : "—";
  const dt = new Date(mov.createdAt);
  const dataStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
  const horaStr = isNaN(dt.getTime()) ? "—" : dt.toLocaleTimeString("pt-BR");
  const parteNome = ehEntrada ? (mov.fornecedor_nome || "—") : (mov.cliente_nome || "—");

  const box = 30;
  const logo = await carregarLogo(org);

  if (logo && logo.data) {
    const escala = Math.min(box / logo.w, box / logo.h);
    const mmW = logo.w * escala;
    const mmH = logo.h * escala;
    doc.addImage(logo.data, logo.formato, 14, 12 + (box - mmH) / 2, mmW, mmH);
  } else {
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(14, 12, box, box, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text((org.nome || "S").charAt(0).toUpperCase(), 14 + box / 2, 12 + box / 2 + 1, { align: "center" });
  }

  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text(org.nome || "SIGRAF", 14, 12 + box + 3);

  const tituloY = 12 + box + 13;
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Requisição de Material", 14, tituloY);

  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const infos = [`Hora: ${horaStr}`, `Data: ${dataStr}`, `${ehEntrada ? "Fornecedor" : "Cliente"}: ${parteNome}`];
  infos.forEach((linha, i) => doc.text(linha, pw - 14, tituloY + i * 4.5, { align: "right" }));

  const linhaY = tituloY + 4.5 * infos.length + 2;
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.6);
  doc.line(14, linhaY, pw - 14, linhaY);

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.autoTable({
    startY: linhaY + 6,
    head: [["Código", "Artigo", "Categoria", "Responsável", "Autorizado por"]],
    body: [[mat.codigo || "—", mat.nome || "—", cat, mov.solicitado_por || "—", mov.permitido_por || "—"]],
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 56 }, 2: { cellWidth: 34 }, 3: { cellWidth: 34 }, 4: { cellWidth: 34 } },
    margin: { left: 14, right: 14 },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Materiais e Insumos", 14, y);
  doc.autoTable({
    startY: y + 2,
    head: [["ID", "Nome", "Quantidade", "Custo Unitário"]],
    body: [[mat.id ?? "—", mat.nome || "—", `${Number(mov.quantidade)} ${mat.unidade || "un"}`, custoStr]],
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 78 }, 2: { cellWidth: 42, halign: "right" }, 3: { cellWidth: 40, halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  const yObs = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Observações:", 14, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  const obsText = (mov.observacoes || "").trim() || "—";
  const obsLines = doc.splitTextToSize(obsText, pw - 28);
  doc.text(obsLines, 14, yObs + 5);

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Requisicao_Material_${mov.id}.pdf`);
}

export async function gerarFichaMaterialPDF(mat, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const { tituloY, linhaY } = await desenharCabecalho(doc, org, "Ficha do Material");

  const headStyles = { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  const categoria = mat.categoria?.nome || mat.categoria_nome || "—";
  const linhas = [
    ["Código", mat.codigo || "—"],
    ["Nome", mat.nome || "—"],
    ["Nome Técnico", mat.nome_tecnico || "—"],
    ["Categoria", categoria],
    ["Família", familias[normalizarFamilia(mat.categoria?.familia)]?.label || "—"],
    ["Subfamília", mat.categoria?.subfamilia || "—"],
    ["Tipo", tiposItem[mat.categoria?.tipo]?.label || "—"],
    ["Fornecedor", mat.fornecedor || "—"],
    ["Unidade", mat.unidade || "—"],
    ...entradasEspecificacao(mat.especificacoes).map((e) => [e.rotulo, e.valor]),
    ["Formato", mat.formato || "—"],
    ["Gramagem", mat.gramagem ? `${mat.gramagem} g/m²` : "—"],
    ["Dimensões", mat.largura || mat.altura ? `${mat.largura || "—"} x ${mat.altura || "—"} mm` : "—"],
    ["Quebra técnica", mat.percentual_quebra ? `${mat.percentual_quebra}%` : "—"],
    ["Rastreabilidade por lote", mat.controla_lote ? "Sim" : "Não"],
    ["Localização na prateleira", mat.localizacao || "—"],
    ["Estoque mínimo", mat.estoque_min != null ? String(mat.estoque_min) : "—"],
    ["Estoque máximo", mat.estoque_max != null ? String(mat.estoque_max) : "—"],
    ["Ponto de pedido", mat.ponto_ressuprimento != null ? String(mat.ponto_ressuprimento) : "—"],
    ["Quantidade atual", mat.quantidade != null ? String(mat.quantidade) : "—"],
    ["Disponível", mat.estoque_disponivel != null ? String(mat.estoque_disponivel) : "—"],
    ["Custo unitário", mat.custo_unitario != null ? formatKz(mat.custo_unitario) : (mat.custo_unit != null ? formatKz(mat.custo_unit) : "—")],
  ];

  doc.autoTable({
    startY: linhaY + 6,
    head: [["Campo", "Valor"]],
    body: linhas,
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 113 } },
    margin: { left: 14, right: 14 },
  });

  const yObs = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Observações / Armazenagem:", 14, yObs);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  const texto = [mat.descricao, mat.especificidade, mat.condicao_armazenagem ? `Condições de armazenagem: ${mat.condicao_armazenagem}` : ""]
    .filter(Boolean)
    .join(" — ") || "—";
  const obsLines = doc.splitTextToSize(texto, pw - 28);
  doc.text(obsLines, 14, yObs + 5);

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Ficha_Material_${(mat.codigo || mat.id || "Material").replace(/[^\w-]+/g, "_")}.pdf`);
}

export async function gerarPedidoPDF(pedido, org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cx = pw / 2;
  const { linhaY } = await desenharCabecalho(doc, org, "Pedido de Compra");

  const headStyles = { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  const numero = pedido.numero || `PED-${pedido.id || ""}`;
  const data = pedido.data_pedido ? new Date(pedido.data_pedido) : null;
  const dataStr = data && !isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "—";
  const itens = (pedido.itens || []).map((i) => ({
    codigo: i.codigo || "—",
    nome: i.nome || "—",
    unidade: i.unidade || "un",
    quantidade: Number(i.quantidade) || 0,
    preco_unit: Number(i.preco_unit) || 0,
    total: Number(i.total) || 0,
  }));
  const total = itens.reduce((s, i) => s + i.total, 0);

  doc.autoTable({
    startY: linhaY + 6,
    head: [["", ""]],
    body: [
      ["Pedido nº", numero],
      ["Fornecedor", pedido.fornecedor_nome || "—"],
      ["Data do pedido", dataStr],
      ["Solicitado por", pedido.solicitado_por || "—"],
    ],
    theme: "plain", styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", textColor: [15, 118, 110] }, 1: { cellWidth: 128 } },
    margin: { left: 14, right: 14 },
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Código", "Material", "Unid.", "Quantidade", "Preço Unit.", "Total"]],
    body: itens.map((i) => [
      i.codigo,
      i.nome,
      i.unidade,
      String(i.quantidade),
      formatKz(i.preco_unit),
      formatKz(i.total),
    ]),
    foot: [["", "", "", "", "Total", formatKz(total)]],
    theme: "grid", headStyles, bodyStyles,
    footStyles: { fillColor: [236, 248, 245], textColor: [15, 118, 110], fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 62 },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  if (pedido.observacoes) {
    const yObs = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 33, 48);
    doc.text("Observações:", 14, yObs);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    const obsLines = doc.splitTextToSize(String(pedido.observacoes), pw - 28);
    doc.text(obsLines, 14, yObs + 5);
  }

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Pedido_${numero.replace(/[^\w-]+/g, "_")}.pdf`);
}

export async function gerarRelatorioStockPDF(materiais = [], categorias = [], org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { linhaY: ly, pw } = await desenharCabecalho(doc, org, "Relatório de Stock e Categorias");

  let y = ly + 8;

  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Resumo por Categoria", 14, y);
  y += 6;

  const catMap = {};
  materiais.forEach((m) => {
    const cat = m.categoria?.nome || "Sem categoria";
    if (!catMap[cat]) catMap[cat] = { qtd: 0, valorTotal: 0, disponivel: 0, itens: 0 };
    catMap[cat].itens += 1;
    catMap[cat].qtd += Number(m.quantidade) || 0;
    catMap[cat].disponivel += Number(m.estoque_disponivel) || 0;
    catMap[cat].valorTotal += (Number(m.quantidade) || 0) * (Number(m.custo_unit) || 0);
  });

  const catRows = Object.entries(catMap).sort((a, b) => b[1].valorTotal - a[1].valorTotal);

  doc.autoTable({
    startY: y,
    head: [["Categoria", "Itens", "Qtd. Total", "Disponível", "Valor Estoque"]],
    body: catRows.map(([nome, d]) => [
      nome,
      String(d.itens),
      d.qtd.toLocaleString("pt-AO"),
      d.disponivel.toLocaleString("pt-AO"),
      formatKz(d.valorTotal),
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [240, 249, 248] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  const totais = catRows.reduce((s, [, d]) => ({
    itens: s.itens + d.itens,
    qtd: s.qtd + d.qtd,
    disp: s.disp + d.disponivel,
    val: s.val + d.valorTotal,
  }), { itens: 0, qtd: 0, disp: 0, val: 0 });

  const ty = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 14, ty);
  doc.text(`${totais.itens} itens | Qtd: ${totais.qtd.toLocaleString("pt-AO")} | Disp: ${totais.disp.toLocaleString("pt-AO")} | Valor: ${formatKz(totais.val)}`, 30, ty);

  y = ty + 12;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  doc.text("Detalhe de Materiais", 14, y);
  y += 2;

  const materiaisSorted = [...materiais].sort((a, b) => {
    const sa = a.status === "esgotado" ? 0 : a.status === "repor" ? 1 : 2;
    const sb = b.status === "esgotado" ? 0 : b.status === "repor" ? 1 : 2;
    return sa - sb;
  });

  doc.autoTable({
    startY: y,
    head: [["Material", "Categoria", "Qtd.", "Mín", "Máx", "Ponto", "Custo", "Estado"]],
    body: materiaisSorted.map((m) => [
      m.nome || "—",
      m.categoria?.nome || "—",
      `${Number(m.quantidade || 0).toLocaleString("pt-AO")} ${m.unidade || ""}`,
      Number(m.estoque_min || 0).toLocaleString("pt-AO"),
      Number(m.estoque_max || 0).toLocaleString("pt-AO"),
      Number(m.ponto_ressuprimento || 0).toLocaleString("pt-AO"),
      m.custo_unit > 0 ? formatKz(m.custo_unit) : "—",
      m.status === "esgotado" ? "Esgotado" : m.status === "repor" ? "Repôr" : "Ok",
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [240, 249, 248] },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 7) {
        const v = String(data.cell.raw);
        if (v === "Esgotado") { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = "bold"; }
        else if (v === "Repôr") { data.cell.styles.textColor = [234, 179, 8]; data.cell.styles.fontStyle = "bold"; }
      }
    },
    margin: { left: 14, right: 14 },
  });

  const cx = pw / 2;
  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Relatorio_Stock_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function gerarRelatorioCadastrosPDF(clientes = [], org = {}, filtro = "todos") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let titulo = "Relatório de Cadastros";
  if (filtro === "cliente") titulo = "Relatório de Clientes";
  else if (filtro === "fornecedor") titulo = "Relatório de Fornecedores";
  const { linhaY: ly, pw } = await desenharCabecalho(doc, org, titulo);

  const lista = filtro === "todos" ? clientes : clientes.filter((c) => c.tipo === filtro);
  const totalClientes = lista.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = lista.filter((c) => c.tipo === "fornecedor").length;

  let y = ly + 8;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.setTextColor(24, 33, 48);
  if (filtro === "todos") doc.text(`Total: ${lista.length} cadastros (${totalClientes} clientes, ${totalFornecedores} fornecedores)`, 14, y);
  else doc.text(`Total: ${lista.length} ${filtro === "cliente" ? "clientes" : "fornecedores"}`, 14, y);
  y += 8;

  const clientesLista = filtro === "fornecedor" ? [] : lista.filter((c) => c.tipo === "cliente");
  if (clientesLista.length > 0) {
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Clientes", 14, y);
    y += 2;

    doc.autoTable({
      startY: y,
      head: [["Código", "Nome", "Empresa", "NIF", "Telefone", "Email"]],
      body: clientesLista.map((c) => [
        c.codigo || "—", c.nome || "—", c.empresa || "—", c.nif || "—", c.telefone || "—", c.email || "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [240, 249, 248] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  const fornecedoresLista = filtro === "cliente" ? [] : lista.filter((c) => c.tipo === "fornecedor");
  if (fornecedoresLista.length > 0) {
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Fornecedores", 14, y);
    y += 2;

    doc.autoTable({
      startY: y,
      head: [["Código", "Nome", "Empresa", "NIF", "Telefone", "Email"]],
      body: fornecedoresLista.map((c) => [
        c.codigo || "—", c.nome || "—", c.empresa || "—", c.nif || "—", c.telefone || "—", c.email || "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [236, 248, 245] },
      margin: { left: 14, right: 14 },
    });
  }

  const cx = pw / 2;
  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  const nomeFicheiro = filtro === "todos" ? "Relatorio_Cadastros" : filtro === "cliente" ? "Relatorio_Clientes" : "Relatorio_Fornecedores";
  doc.save(`${nomeFicheiro}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function gerarRelatorioCategoriasPDF(categorias = [], materiais = [], org = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { linhaY: ly, pw } = await desenharCabecalho(doc, org, "Relatório de Categorias e Famílias");

  let y = ly + 8;

  const catMap = {};
  categorias.forEach((c) => {
    const fam = normalizarFamilia(c.familia);
    if (!catMap[fam]) catMap[fam] = [];
    catMap[fam].push(c);
  });

  const materiaisPorCat = {};
  materiais.forEach((m) => {
    const catNome = m.categoria?.nome || m.categoria_nome || "Sem categoria";
    materiaisPorCat[catNome] = (materiaisPorCat[catNome] || 0) + 1;
  });

  Object.entries(catMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([fam, cats]) => {
    const famCfg = familias[fam];
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 118, 110);
    doc.text(`${famCfg?.label || fam}`, 14, y);
    y += 2;

    doc.autoTable({
      startY: y,
      head: [["Categoria", "Tipo", "Descrição", "Itens em Stock"]],
      body: cats.map((c) => [
        c.nome || "—", c.tipo || "—", c.descricao || "—", String(materiaisPorCat[c.nome] || 0),
      ]),
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      alternateRowStyles: { fillColor: [240, 249, 248] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  const cx = pw / 2;
  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, cx, 285, { align: "center" });
  doc.save(`Relatorio_Categorias_${new Date().toISOString().slice(0, 10)}.pdf`);
}
