import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import {
  COR_MARCA_TEXTO,
  COR_MARCA_CINZA,
  formatarData,
  TEMA_TABELA_MARCA,
  desenharCabecalhoMarca,
  tituloSecaoMarca,
  rodapeMarca,
} from "@/lib/pdfEstilo";
applyPlugin(jsPDF);

const ESTADO_LABEL = {
  operacional: "Operacional",
  manutencao: "Manutenção",
  avariada: "Avaria",
  desativada: "Desativada",
};

function formatarDataHora(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-AO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(d);
  }
}

export default async function gerarRelatorioMaquinas(maquinas, ordens = [], empresa = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const lista = Array.isArray(maquinas) ? maquinas : [];

  const { yInicio } = await desenharCabecalhoMarca(doc, {
    titulo: "RELATÓRIO DE MÁQUINAS",
    empresa,
    direitos: [`${lista.length} máquinas · Produção`, `Gerado em: ${formatarDataHora(new Date().toISOString())}`],
  });

  const operacionais = lista.filter((m) => m.estado === "operacional").length;
  const manutencao = lista.filter((m) => m.estado === "manutencao" || m.estado === "avariada").length;

  // ===== Resumo =====
  let y = tituloSecaoMarca(doc, "Resumo", 14, yInicio) + 2;
  doc.autoTable({
    startY: y,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total de máquinas", String(lista.length)],
      ["Operacionais", String(operacionais)],
      ["Em manutenção / avaria", String(manutencao)],
    ],
    ...TEMA_TABELA_MARCA,
  });

  // ===== Tabela de máquinas =====
  y = tituloSecaoMarca(doc, "Máquinas e estados", 14, doc.lastAutoTable.finalY + 6) + 2;
  doc.autoTable({
    startY: y,
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
    ...TEMA_TABELA_MARCA,
    headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 7.5 },
    bodyStyles: { ...TEMA_TABELA_MARCA.styles, fontSize: 7.5 },
    columnStyles: { 0: { halign: "center" }, 4: { halign: "center" } },
  });

  // ===== Detalhe por máquina =====
  for (const m of lista) {
    y = doc.lastAutoTable.finalY + 6;
    if (y > ph - 30) { doc.addPage(); y = 20; }

    y = tituloSecaoMarca(doc, `${m.codigo ? m.codigo + " — " : ""}${m.nome_comum || "Máquina"}`, 14, y) + 2;

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
      formatarDataHora(e.data),
      ESTADO_LABEL[e.estado] || e.estado || "—",
      e.motivo || "—",
      e.tempo_estimado ? (String(e.tempo_estimado) + (e.tecnico ? ` · Téc.: ${e.tecnico}` : "")) : (e.tecnico || "—"),
    ]);

    const linhasManut = manutencoes.map((x) => [
      formatarDataHora(x.data || x.data_manutencao),
      x.intervencao || x.descricao || "—",
      x.tecnico || "—",
      x.tipo || "—",
      x.tempo_paragem != null && x.tempo_paragem !== "" ? `${x.tempo_paragem} h` : "—",
    ]);

    const linhasUso = uso.map((u) => [
      `OP ${u.op.numero || u.op.id}`,
      formatarDataHora(u.reg.data_inicio || u.reg.inicio || u.reg.horaInicio || ""),
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
        ...TEMA_TABELA_MARCA,
        headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 7 },
        bodyStyles: { ...TEMA_TABELA_MARCA.styles, fontSize: 7 },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (linhasManut.length) {
      doc.autoTable({
        startY: y,
        head: [["Data", "Intervenção", "Técnico", "Tipo", "Paragem"]],
        body: linhasManut,
        ...TEMA_TABELA_MARCA,
        headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 7 },
        bodyStyles: { ...TEMA_TABELA_MARCA.styles, fontSize: 7 },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (linhasUso.length) {
      if (y > ph - 40) { doc.addPage(); y = 20; }
      doc.autoTable({
        startY: y,
        head: [["OP", "Data", "Operador", "Produzido", "Rejeitado"]],
        body: linhasUso,
        ...TEMA_TABELA_MARCA,
        headStyles: { ...TEMA_TABELA_MARCA.headStyles, fontSize: 7 },
        bodyStyles: { ...TEMA_TABELA_MARCA.styles, fontSize: 7 },
        columnStyles: { 0: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" } },
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      y += 3;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...COR_MARCA_CINZA);
      doc.text("Sem registos de utilização em produção.", 14, y);
      doc.setTextColor(...COR_MARCA_TEXTO);
      y += 6;
    }
  }

  rodapeMarca(doc);
  doc.save(`relatorio-maquinas-${new Date().toISOString().slice(0, 10)}.pdf`);
}