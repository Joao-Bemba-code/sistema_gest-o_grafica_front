"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import jsPDF from "jspdf";
import "jspdf-autotable";

const sampleOrcamentos = [
  {
    id: "ORC-2024-001", data: "2024-05-20", estado: "aprovado",
    cliente: { nome: "João Matos", empresa: "Gráfica Expresso", nif: "541236987", telefone: "+244 923 456 789", email: "joao@graficaexpresso.co.ao" },
    itens: [
      { descricao: "Catálogos Institucionais — Capa", quantidade: 500, valorUnitario: 12, total: 6000 },
      { descricao: "Catálogos Institucionais — Miolo 32p", quantidade: 500, valorUnitario: 18, total: 9000 },
    ],
    especificacao: { produto: "Catálogos Institucionais", formato: "A4", papel: "Papel Couché 150g", impressao: "Offset", acabamento: "Verniz Localizado" },
    subtotal: 15000, iva: 0, prazoExecucao: "5 dias", condicoesPagamento: "100% antecipado", observacoes: "Arquivo entregue pelo cliente em PDF.",
  },
  {
    id: "ORC-2024-002", data: "2024-05-21", estado: "pendente",
    cliente: { nome: "Maria Santos", empresa: "PubliAngola Lda", nif: "547891234", telefone: "+244 912 345 678", email: "maria@publiangola.co.ao" },
    itens: [
      { descricao: "Banners Publicitários 1x2m", quantidade: 10, valorUnitario: 500, total: 5000 },
      { descricao: "Bordas e Ilhoses", quantidade: 10, valorUnitario: 50, total: 500 },
    ],
    especificacao: { produto: "Banners Publicitários", formato: "1x2m", papel: "Lona Front Light 440g", impressao: "Digital", acabamento: "Bordas e Ilhoses" },
    subtotal: 5500, iva: 770, prazoExecucao: "3 dias", condicoesPagamento: "50% de sinal + 50% na entrega", observacoes: "Instalação inclusa.",
  },
  {
    id: "ORC-2024-003", data: "2024-05-22", estado: "pendente",
    cliente: { nome: "Carlos Fernandes", empresa: "Impressões Rápidas", nif: "543216548", telefone: "+244 934 567 890", email: "carlos@impressoesrapidas.co.ao" },
    itens: [
      { descricao: "Embalagens Personalizadas — Caixa", quantidade: 1000, valorUnitario: 15, total: 15000 },
      { descricao: "Hot Stamping", quantidade: 1000, valorUnitario: 7, total: 7000 },
    ],
    especificacao: { produto: "Embalagens Personalizadas", formato: "20x15cm", papel: "Kraft 300g", impressao: "Digital", acabamento: "Hot Stamping" },
    subtotal: 22000, iva: 3080, prazoExecucao: "7 dias", condicoesPagamento: "50% de sinal + 50% na entrega", observacoes: "Arte final aprovada.",
  },
  {
    id: "ORC-2024-004", data: "2024-05-18", estado: "rejeitado",
    cliente: { nome: "Ana Ferreira", empresa: "Marketing Total", nif: "546549871", telefone: "+244 945 678 901", email: "ana@marketingtotal.co.ao" },
    itens: [
      { descricao: "Flyers Promocionais A5", quantidade: 2000, valorUnitario: 2.6, total: 5200 },
    ],
    especificacao: { produto: "Flyers Promocionais", formato: "A5", papel: "Papel Offset 90g", impressao: "Offset", acabamento: "Corte e Dobra" },
    subtotal: 5200, iva: 0, prazoExecucao: "2 dias", condicoesPagamento: "100% antecipado", observacoes: "Cliente desistiu do pedido.",
  },
  {
    id: "ORC-2024-005", data: "2024-05-23", estado: "aprovado",
    cliente: { nome: "Pedro Neto", empresa: "Editora Nacional", nif: "549873214", telefone: "+244 956 789 012", email: "pedro@editoranacional.co.ao" },
    itens: [
      { descricao: "Revistas — Capa", quantidade: 3000, valorUnitario: 5, total: 15000 },
      { descricao: "Revistas — Miolo 64p", quantidade: 3000, valorUnitario: 8, total: 24000 },
      { descricao: "Encadernação Revista", quantidade: 3000, valorUnitario: 1, total: 3000 },
    ],
    especificacao: { produto: "Revistas", formato: "A4", papel: "Papel Couché 115g", impressao: "Offset", acabamento: "Encadernação Revista" },
    subtotal: 42000, iva: 5880, prazoExecucao: "10 dias", condicoesPagamento: "Outro (30% sinal + 70% antes da entrega)", observacoes: "Edição mensal — contrato anual.",
  },
];

const estadoColors = {
  aprovado: { bg: "bg-primary/10", text: "text-primary", dot: "bg-green-500" },
  pendente: { bg: "bg-tertiary-container/10", text: "text-tertiary", dot: "bg-amber-500" },
  rejeitado: { bg: "bg-error-container/10", text: "text-error", dot: "bg-red-500" },
};

const EMPRESA = {
  nome: "SIGRAF — Indústria Gráfica",
  nif: "541000000",
  endereco: "Zona Industrial, Km 15, Luanda — Angola",
  telefone: "+244 923 000 000",
  email: "geral@sigraf.co.ao",
};

function formatKz(v) { return `Kz ${Number(v).toLocaleString("pt-AO")}`; }

const blankItem = { descricao: "", quantidade: "", valorUnitario: "" };
const blankForm = {
  cliente: "", empresa: "", nif: "", telefone: "", email: "",
  itens: [{ ...blankItem }],
  produto: "", formato: "", papel: "", impressao: "", acabamento: "",
  iva: "", prazoExecucao: "", condicoesPagamento: "100% antecipado", observacoes: "",
};

function gerarProformaPDF(o) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 60, 114);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(EMPRESA.nome, 14, 17);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(EMPRESA.endereco, 14, 23);
  doc.text(`NIF: ${EMPRESA.nif} | Tel: ${EMPRESA.telefone} | Email: ${EMPRESA.email}`, 14, 29);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("FATURA PROFORMA", pw - 14, 17, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${o.id}`, pw - 14, 24, { align: "right" });
  doc.text(`Data: ${new Date(o.data).toLocaleDateString("pt-BR")}`, pw - 14, 30, { align: "right" });
  doc.text(`Validade: 30 dias`, pw - 14, 36, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${o.cliente.nome}`, 14, y); y += 5;
  doc.text(`Empresa: ${o.cliente.empresa}`, 14, y); y += 5;
  doc.text(`NIF: ${o.cliente.nif}`, 14, y); y += 5;
  doc.text(`Telefone: ${o.cliente.telefone}  |  Email: ${o.cliente.email}`, 14, y); y += 8;

  const headStyles = { fillColor: [30, 60, 114], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;

  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: o.itens.map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  doc.autoTable({
    startY: y,
    head: [["Especificação Técnica", "Detalhe"]],
    body: [
      ["Produto", o.especificacao.produto],
      ["Formato", o.especificacao.formato],
      ["Papel", o.especificacao.papel],
      ["Impressão", o.especificacao.impressao],
      ["Acabamento", o.especificacao.acabamento],
    ],
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 0: { cellWidth: 45, fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  const boxX = pw - 88;
  doc.setFillColor(30, 60, 114);
  doc.roundedRect(boxX, y, 74, 28, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text("Subtotal:", boxX + 4, y + 8); doc.text(formatKz(o.subtotal), pw - 18, y + 8, { align: "right" });
  if (o.iva > 0) { doc.text("IVA (14%):", boxX + 4, y + 15); doc.text(formatKz(o.iva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", boxX + 4, y + 24); doc.text(formatKz(o.subtotal + o.iva), pw - 18, y + 24, { align: "right" });

  y += 34;
  doc.setTextColor(50, 50, 50); doc.setFontSize(9);
  doc.text(`Prazo de Execução: ${o.prazoExecucao}`, 14, y); y += 5;
  doc.text(`Condições de Pagamento: ${o.condicoesPagamento}`, 14, y); y += 8;
  if (o.observacoes) { doc.setFont("helvetica", "italic"); doc.text(`Obs: ${o.observacoes}`, 14, y); y += 6; }

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 285, { align: "center" });

  doc.save(`Proforma_${o.id}.pdf`);
}

function gerarReciboPDF(o) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(46, 125, 50);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(EMPRESA.nome, 14, 17);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(EMPRESA.endereco, 14, 23);
  doc.text(`NIF: ${EMPRESA.nif} | Tel: ${EMPRESA.telefone} | Email: ${EMPRESA.email}`, 14, 29);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("FATURA DE RECIBO", pw - 14, 17, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: REC-${o.id.replace("ORC-", "")}`, pw - 14, 24, { align: "right" });
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pw - 14, 30, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${o.cliente.nome}`, 14, y); y += 5;
  doc.text(`Empresa: ${o.cliente.empresa}`, 14, y); y += 5;
  doc.text(`NIF: ${o.cliente.nif}`, 14, y); y += 5;
  doc.text(`Telefone: ${o.cliente.telefone}  |  Email: ${o.cliente.email}`, 14, y); y += 8;

  const headStyles = { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;

  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: o.itens.map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [245, 252, 245] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  const boxX = pw - 88;
  doc.setFillColor(46, 125, 50);
  doc.roundedRect(boxX, y, 74, 28, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text("Subtotal:", boxX + 4, y + 8); doc.text(formatKz(o.subtotal), pw - 18, y + 8, { align: "right" });
  if (o.iva > 0) { doc.text("IVA (14%):", boxX + 4, y + 15); doc.text(formatKz(o.iva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAGO:", boxX + 4, y + 24); doc.text(formatKz(o.subtotal + o.iva), pw - 18, y + 24, { align: "right" });

  y += 34;
  doc.setFillColor(232, 245, 233);
  doc.roundedRect(14, y, pw - 28, 18, 2, 2, "F");
  doc.setTextColor(46, 125, 50); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Pagamento recebido integralmente.", 18, y + 7);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(`Ref: ${o.id} | Condições: ${o.condicoesPagamento}`, 18, y + 13);

  y += 24;
  doc.setTextColor(50, 50, 50); doc.setFontSize(9);
  doc.text(`Prazo de Execução: ${o.prazoExecucao}`, 14, y);
  if (o.observacoes) { y += 5; doc.setFont("helvetica", "italic"); doc.text(`Obs: ${o.observacoes}`, 14, y); }

  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pw / 2 - 10, y);
  doc.line(pw / 2 + 10, y, pw - 14, y);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 150);
  doc.text("Assinatura do Responsável", pw / 2, y + 5, { align: "center" });

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 285, { align: "center" });

  doc.save(`Recibo_${o.id}.pdf`);
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState(sampleOrcamentos);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...blankForm });

  const setField = (name, val) => setForm((p) => ({ ...p, [name]: val }));

  const setItem = (idx, key, val) => {
    setForm((p) => {
      const itens = [...p.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      if (key === "quantidade" || key === "valorUnitario") {
        const q = Number(itens[idx].quantidade) || 0;
        const v = Number(itens[idx].valorUnitario) || 0;
        itens[idx].total = q * v;
      }
      return { ...p, itens };
    });
  };

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, { ...blankItem }] }));

  const removeItem = (idx) => setForm((p) => {
    if (p.itens.length <= 1) return p;
    return { ...p, itens: p.itens.filter((_, i) => i !== idx) };
  });

  const subtotalCalc = form.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const ivaCalc = Number(form.iva) || 0;
  const totalCalc = subtotalCalc + ivaCalc;

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = orcamentos.length + 1;
    const novo = {
      id: `ORC-${String(n).padStart(3, "0")}`,
      data: new Date().toISOString().split("T")[0],
      estado: "pendente",
      cliente: { nome: form.cliente, empresa: form.empresa, nif: form.nif, telefone: form.telefone, email: form.email },
      itens: form.itens.map((it) => ({ ...it, quantidade: Number(it.quantidade), valorUnitario: Number(it.valorUnitario), total: Number(it.total) || 0 })),
      especificacao: { produto: form.produto, formato: form.formato, papel: form.papel, impressao: form.impressao, acabamento: form.acabamento },
      subtotal: subtotalCalc, iva: ivaCalc,
      prazoExecucao: form.prazoExecucao, condicoesPagamento: form.condicoesPagamento, observacoes: form.observacoes,
    };
    setOrcamentos([novo, ...orcamentos]);
    setForm({ ...blankForm, itens: [{ ...blankItem }] });
    setModalOpen(false);
  };

  const filtered = filter === "todos" ? orcamentos : orcamentos.filter((o) => o.estado === filter);
  const totalValor = orcamentos.reduce((s, o) => s + o.subtotal + o.iva, 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;
  const aprovados = orcamentos.filter((o) => o.estado === "aprovado").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Orçamentos</h1>
              <p className="text-xs text-on-surface-variant mt-1">{orcamentos.length} orçamentos registados</p>
            </div>
            <button onClick={() => setModalOpen(true)} className="bg-primary text-on-primary font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs">
              <Icon name="add" className="text-lg" /> Novo Orçamento
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Orçamentos", value: orcamentos.length, icon: "request_quote", color: "text-primary" },
              { label: "Valor Total", value: `Kz ${(totalValor / 1000).toFixed(1)}k`, icon: "paid", color: "text-tertiary" },
              { label: "Pendentes", value: pendentes, icon: "pending", color: "text-tertiary" },
              { label: "Aprovados", value: aprovados, icon: "check_circle", color: "text-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container p-5 rounded-xl border border-outline-variant flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center ${kpi.color}`}><Icon name={kpi.icon} /></div>
                <div><p className="text-xs text-on-surface-variant">{kpi.label}</p><p className="text-xl font-bold text-on-surface">{kpi.value}</p></div>
              </div>
            ))}
          </section>

          <div className="flex gap-2 flex-wrap">
            {["todos", "pendente", "aprovado", "rejeitado"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high/50">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Nº</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Produto</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden lg:table-cell text-right">Total</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Estado</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const ec = estadoColors[o.estado];
                    return (
                      <tr key={o.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high/30 transition-colors cursor-pointer" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                        <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{o.id}</span></td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-on-surface-variant">{new Date(o.data).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 font-medium text-on-surface">{o.cliente.nome}</td>
                        <td className="px-4 py-3 text-on-surface-variant hidden lg:table-cell">{o.especificacao.produto}</td>
                        <td className="px-4 py-3 font-bold hidden lg:table-cell text-on-surface text-right">{formatKz(o.subtotal + o.iva)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{o.estado}</span></td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => gerarProformaPDF(o)} title="Fatura Proforma" className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center"><Icon name="description" className="text-[16px] text-primary" /></button>
                            <button onClick={() => gerarReciboPDF(o)} title="Fatura de Recibo" className="w-8 h-8 rounded-full hover:bg-tertiary/10 flex items-center justify-center"><Icon name="receipt_long" className="text-[16px] text-tertiary" /></button>
                            <button title="Enviar WhatsApp" className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center"><Icon name="chat" className="text-[16px] text-primary" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="md:hidden space-y-3 p-3">
                {filtered.map((o) => {
                  const ec = estadoColors[o.estado];
                  return (
                    <div key={o.id} className="bg-surface-container-high rounded-xl p-4 border border-outline-variant/50 space-y-2 cursor-pointer" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-on-surface">{o.id}</p>
                          <p className="text-[10px] text-on-surface-variant">{o.cliente.nome} · {o.especificacao.produto}</p>
                          <p className="text-[10px] text-on-surface-variant">{new Date(o.data).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.bg} ${ec.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{o.estado}</span>
                          <p className="text-xs font-bold text-on-surface mt-1">{formatKz(o.subtotal + o.iva)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1 border-t border-outline-variant/30" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => gerarProformaPDF(o)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold"><Icon name="description" className="text-sm" /> Proforma</button>
                        <button onClick={() => gerarReciboPDF(o)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-tertiary/10 text-tertiary text-[10px] font-bold"><Icon name="receipt_long" className="text-sm" /> Recibo</button>
                        <button className="flex items-center justify-center w-8 rounded-lg bg-surface-container-highest"><Icon name="chat" className="text-sm text-primary" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {selected && (() => {
            const o = orcamentos.find((x) => x.id === selected);
            if (!o) return null;
            const ec = estadoColors[o.estado];
            return (
              <section className="bg-surface-container rounded-xl border border-outline-variant p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                    <Icon name="description" className="text-primary" /> Detalhes — {o.id}
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => gerarProformaPDF(o)} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1 hover:bg-primary-container transition-all"><Icon name="description" className="text-[16px]" /> Proforma</button>
                    <button onClick={() => gerarReciboPDF(o)} className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold flex items-center gap-1 hover:bg-tertiary-container transition-all"><Icon name="receipt_long" className="text-[16px]" /> Recibo</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dados do Cliente</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-on-surface-variant">Nome:</span><span className="font-medium text-on-surface">{o.cliente.nome}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Empresa:</span><span className="font-medium text-on-surface">{o.cliente.empresa}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">NIF:</span><span className="font-medium text-on-surface">{o.cliente.nif}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Telefone:</span><span className="font-medium text-on-surface">{o.cliente.telefone}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Email:</span><span className="font-medium text-on-surface">{o.cliente.email}</span></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Especificação Técnica</h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-on-surface-variant">Produto:</span><span className="font-medium text-on-surface">{o.especificacao.produto}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Formato:</span><span className="font-medium text-on-surface">{o.especificacao.formato}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Papel:</span><span className="font-medium text-on-surface">{o.especificacao.papel}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Impressão:</span><span className="font-medium text-on-surface">{o.especificacao.impressao}</span></div>
                      <div className="flex justify-between"><span className="text-on-surface-variant">Acabamento:</span><span className="font-medium text-on-surface">{o.especificacao.acabamento}</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Descrição dos Serviços</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-high/50">
                          <th className="text-left px-3 py-2 font-bold text-on-surface-variant uppercase">Descrição</th>
                          <th className="text-center px-3 py-2 font-bold text-on-surface-variant uppercase">Qtd</th>
                          <th className="text-right px-3 py-2 font-bold text-on-surface-variant uppercase">Valor Unit.</th>
                          <th className="text-right px-3 py-2 font-bold text-on-surface-variant uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.itens.map((it, i) => (
                          <tr key={i} className="border-b border-outline-variant/20">
                            <td className="px-3 py-2 text-on-surface">{it.descricao}</td>
                            <td className="px-3 py-2 text-center text-on-surface-variant">{it.quantidade}</td>
                            <td className="px-3 py-2 text-right text-on-surface-variant">{formatKz(it.valorUnitario)}</td>
                            <td className="px-3 py-2 text-right font-bold text-on-surface">{formatKz(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end mt-3">
                    <div className="w-64 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal:</span><span className="font-medium">{formatKz(o.subtotal)}</span></div>
                      {o.iva > 0 && <div className="flex justify-between"><span className="text-on-surface-variant">IVA (14%):</span><span className="font-medium">{formatKz(o.iva)}</span></div>}
                      <div className="flex justify-between border-t border-outline-variant pt-1 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(o.subtotal + o.iva)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-surface-container-high rounded-lg p-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Prazo de Execução</p>
                    <p className="font-medium text-on-surface">{o.prazoExecucao}</p>
                  </div>
                  <div className="bg-surface-container-high rounded-lg p-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Condições de Pagamento</p>
                    <p className="font-medium text-on-surface">{o.condicoesPagamento}</p>
                  </div>
                  <div className="bg-surface-container-high rounded-lg p-3">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Estado</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ec.bg} ${ec.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{o.estado}</span>
                  </div>
                </div>

                {o.observacoes && (
                  <div className="bg-surface-container-high rounded-lg p-3 text-xs">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Observações</p>
                    <p className="text-on-surface">{o.observacoes}</p>
                  </div>
                )}
              </section>
            );
          })()}
        </div>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-high/50">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Orçamento" icon="request_quote" size="2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2"><Icon name="person" className="text-sm text-primary" /> Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Cliente *</label>
                  <input required name="cliente" value={form.cliente} onChange={(e) => setField("cliente", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome do cliente" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Empresa</label>
                  <input name="empresa" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome da empresa" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">NIF *</label>
                  <input required name="nif" value={form.nif} onChange={(e) => setField("nif", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nº de identificação fiscal" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Telefone *</label>
                  <input required name="telefone" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="+244 9XX XXX XXX" />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Email</label>
                  <input name="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="cliente@email.com" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2"><Icon name="list" className="text-sm text-primary" /> Descrição dos Serviços</h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-container transition-colors"><Icon name="add_circle" className="text-sm" /> Adicionar Item</button>
              </div>
              {form.itens.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-surface-container-high rounded-lg p-3">
                  <div className="col-span-12 sm:col-span-5 flex flex-col gap-1">
                    {idx === 0 && <label className="text-[9px] font-semibold text-on-surface-variant uppercase">Descrição *</label>}
                    <input required name="descricao" value={it.descricao} onChange={(e) => setItem(idx, "descricao", e.target.value)} className="px-2.5 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Descrição do serviço" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                    {idx === 0 && <label className="text-[9px] font-semibold text-on-surface-variant uppercase">Qtd *</label>}
                    <input required type="number" min="1" name="quantidade" value={it.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} className="px-2.5 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 flex flex-col gap-1">
                    {idx === 0 && <label className="text-[9px] font-semibold text-on-surface-variant uppercase">Valor Unit. *</label>}
                    <input required type="number" min="0" name="valorUnitario" value={it.valorUnitario} onChange={(e) => setItem(idx, "valorUnitario", e.target.value)} className="px-2.5 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex flex-col gap-1">
                    {idx === 0 && <label className="text-[9px] font-semibold text-on-surface-variant uppercase">Total</label>}
                    <div className="px-2.5 py-2 bg-surface-container-highest border border-outline-variant rounded-lg text-xs font-bold text-on-surface">{formatKz(it.total || 0)}</div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {form.itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="w-7 h-7 rounded-full hover:bg-error-container/10 flex items-center justify-center transition-colors" title="Remover">
                        <Icon name="close" className="text-[14px] text-error" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2"><Icon name="settings" className="text-sm text-primary" /> Especificação Técnica</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Produto *</label>
                  <input required name="produto" value={form.produto} onChange={(e) => setField("produto", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Catálogos Institucionais" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Formato *</label>
                  <input required name="formato" value={form.formato} onChange={(e) => setField("formato", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: A4, 1x2m" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Papel / Material *</label>
                  <input required name="papel" value={form.papel} onChange={(e) => setField("papel", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Papel Couché 150g" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Impressão *</label>
                  <select required name="impressao" value={form.impressao} onChange={(e) => setField("impressao", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="" disabled>Selecionar...</option>
                    <option>Offset</option><option>Digital</option><option>Serigrafia</option><option>Flexografia</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Acabamento *</label>
                  <input required name="acabamento" value={form.acabamento} onChange={(e) => setField("acabamento", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Verniz Localizado, Corte e Dobra" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2"><Icon name="payments" className="text-sm text-primary" /> Valores e Condições</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">IVA (Kz) — Opcional</label>
                  <input type="number" min="0" name="iva" value={form.iva} onChange={(e) => setField("iva", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="0" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Prazo de Execução *</label>
                  <input required name="prazoExecucao" value={form.prazoExecucao} onChange={(e) => setField("prazoExecucao", e.target.value)} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 5 dias úteis" />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Condições de Pagamento *</label>
                  <div className="flex gap-2 flex-wrap">
                    {["100% antecipado", "50% de sinal + 50% na entrega", "Outro"].map((c) => (
                      <button key={c} type="button" onClick={() => setField("condicoesPagamento", c)} className={`px-3 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
                        form.condicoesPagamento === c ? "border-primary bg-primary/10 text-primary" : "border-outline-variant bg-surface-container text-on-surface-variant hover:border-outline"
                      }`}>{c}</button>
                    ))}
                  </div>
                  {form.condicoesPagamento === "Outro" && (
                    <input required name="condicoesPagamentoOutro" className="mt-2 px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Especificar condições..." onChange={(e) => setField("condicoesPagamento", e.target.value)} />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} rows={2} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Notas adicionais..." />
              </div>
            </div>

            <div className="bg-surface-container-high rounded-xl p-4 flex items-center justify-between">
              <div className="text-xs text-on-surface-variant">
                <p>Subtotal: <strong>{formatKz(subtotalCalc)}</strong></p>
                {ivaCalc > 0 && <p>IVA: <strong>{formatKz(ivaCalc)}</strong></p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-on-surface-variant uppercase font-bold">Total</p>
                <p className="text-lg font-bold text-primary">{formatKz(totalCalc)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setForm({ ...blankForm, itens: [{ ...blankItem }] }); setModalOpen(false); }} className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Criar Orçamento</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
