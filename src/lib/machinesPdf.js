import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

const COR_PRIMARIA = [5, 150, 105];
const COR_TEXTO = [51, 65, 85];
const COR_SUAVE = [235, 245, 240];

const ESTADO_LABEL = {
  operacional: "Operacional",
  manutencao: "Manutenção",
  avariada: "Avaria",
  desativada: "Desativada",
};

function formatarData(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-AO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(d);
  }
}

function cabecalho(doc, pw, empresa, titulo, subtitulo) {
  doc.setFillColor(...COR_PRIMARIA);
  doc.rect(0, 0, pw, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 14);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const contacto = [empresa.endereco || "", `NIF: ${empresa.nif || "—"}  |  Tel: ${empresa.telefone || "—"}  |  Email: ${empresa.email || "—"}`].filter(Boolean);
  contacto.forEach((linha, i) => doc.text(linha, 14, 20 + i * 4));

  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(titulo, pw - 14, 13, { align: "right" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(subtitulo, pw - 14, 19, { align: "right" });
  doc.text(`Gerado em: ${formatarData(new Date().toISOString())}`, pw - 14, 24, { align: "right" });

  doc.setTextColor(...COR_TEXTO);
  doc.setDrawColor(...COR_PRIMARIA);
  doc.setLineWidth(0.6);
  doc.line(0, 35, pw, 35);
}

function rodape(doc, pw, ph, texto) {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 140, 150);
    doc.text(texto || "SIGRAF — Sistema de Gestão para Indústria Gráfica", 14, ph - 7);
    doc.text(`Página ${i} de ${n}`, pw - 14, ph - 7, { align: "right" });
  }
}

export default function gerarRelatorioMaquinas(maquinas, ordens = [], empresa = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const lista = Array.isArray(maquinas) ? maquinas : [];

  cabecalho(doc, pw, empresa, "RELATÓRIO DE MÁQUINAS", `${lista.length} máquinas · Produção`);

  const operacionais = lista.filter((m) => m.estado === "operacional").length;
  const manutencao = lista.filter((m) => m.estado === "manutencao" || m.estado === "avariada").length;

  // ===== Resumo =====
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Resumo", 14, 42);
  doc.autoTable({
    startY: 45,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total de máquinas", String(lista.length)],
      ["Operacionais", String(operacionais)],
      ["Em manutenção / avaria", String(manutencao)],
    ],
    theme: "grid",
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, textColor: COR_TEXTO },
    margin: { left: 14, right: 14 },
  });

  // ===== Tabela de máquinas =====
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Máquinas e estados", 14, y);
  doc.autoTable({
    startY: y + 3,
    head: [["Código", "Máquina", "Marca / Modelo", "Localização", "Estado", "Última manutenção", "Próxima manutenção"]],
    body: lista.map((m) => [
      m.codigo || "—",
      m.nome_comum || "—",
      [m.marca, m.modelo].filter(Boolean).join(" ") || "—",
      m.localizacao || "—",
      ESTADO_LABEL[m.estado] || m.estado || "—",
      m.ultima_manutencao || "—",
      m.proxima_manutencao || "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: COR_PRIMARIA, textColor: 255, fontSize: 7.5 },
    styles: { fontSize: 7.5, textColor: COR_TEXTO },
    alternateRowStyles: { fillColor: COR_SUAVE },
    margin: { left: 14, right: 14 },
  });

  // ===== Detalhe por máquina =====
  for (const m of lista) {
    y = doc.lastAutoTable.finalY + 8;
    if (y > ph - 30) { doc.addPage(); y = 20; }

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.setTextColor(...COR_PRIMARIA);
    doc.text(`${m.codigo ? m.codigo + " — " : ""}${m.nome_comum || "Máquina"}`, 14, y);
    doc.setTextColor(...COR_TEXTO);

    const estados = Array.isArray(m.historico_estados) ? m.historico_estados : [];
    const manutencoes = Array.isArray(m.manutencoes) ? m.manutencoes : [];
    const alvos = [m.nome_comum, m.codigo].map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);

    let uso = [];
    (Array.isArray(ordens) ? ordens : []).forEach((o) => {
      const regs = Array.isArray(o.impressaos) ? o.impressaos : o.impressaos ? [o.impressaos] : [];
      regs.forEach((r) => {
        if (r && alvos.includes(String(r.maquina || "").trim().toLowerCase())) uso.push({ op: o, reg: r });
      });
    });

    const linhasEstados = estados.map((e) => [
      formatarData(e.data),
      ESTADO_LABEL[e.estado] || e.estado || "—",
      e.motivo || "—",
      e.tempo_estimado ? (String(e.tempo_estimado) + (e.tecnico ? ` · Téc.: ${e.tecnico}` : "")) : (e.tecnico || "—"),
    ]);

    const linhasManut = manutencoes.map((x) => [
      formatarData(x.data || x.data_manutencao),
      x.intervencao || x.descricao || "—",
      x.tecnico || "—",
      x.tipo || "—",
      x.tempo_paragem != null && x.tempo_paragem !== "" ? `${x.tempo_paragem} h` : "—",
    ]);

    const linhasUso = uso.map((u) => [
      `OP ${u.op.numero || u.op.id}`,
      formatarData(u.reg.data_inicio || u.reg.inicio || u.reg.horaInicio || ""),
      u.reg.operador || "—",
      u.reg.quantidade_produzida != null ? String(u.reg.quantidade_produzida) : "—",
      u.reg.quantidade_rejeitada != null ? String(u.reg.quantidade_rejeitada) : "—",
    ]);

    if (linhasEstados.length) {
      y += 2;
      doc.autoTable({
        startY: y,
        head: [["Data", "Estado", "Motivo", "Tempo / Técnico"]],
        body: linhasEstados,
        theme: "striped",
        headStyles: { fillColor: [90, 110, 130], textColor: 255, fontSize: 7 },
        styles: { fontSize: 7, textColor: COR_TEXTO },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (linhasManut.length) {
      doc.autoTable({
        startY: y,
        head: [["Data", "Intervenção", "Técnico", "Tipo", "Paragem"]],
        body: linhasManut,
        theme: "striped",
        headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 7 },
        styles: { fontSize: 7, textColor: COR_TEXTO },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (linhasUso.length) {
      if (y > ph - 40) { doc.addPage(); y = 20; }
      doc.autoTable({
        startY: y,
        head: [["OP", "Data", "Operador", "Produzido", "Rejeitado"]],
        body: linhasUso,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 7 },
        styles: { fontSize: 7, textColor: COR_TEXTO },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      y += 3;
      doc.setFontSize(7.5);
      doc.setTextColor(130, 140, 150);
      doc.text("Sem registos de utilização em produção.", 14, y);
      doc.setTextColor(...COR_TEXTO);
      y += 6;
    }
  }

  rodape(doc, pw, ph);
  doc.save(`relatorio-maquinas-${new Date().toISOString().slice(0, 10)}.pdf`);
}
