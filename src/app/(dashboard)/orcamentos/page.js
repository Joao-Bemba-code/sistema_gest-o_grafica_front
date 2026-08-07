"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { inputCls } from "@/lib/estoque";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);
import { listar, criar, atualizar, remover, mudarEstado } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";
import { buscarOrganizacao } from "@/services/configuracoes";
import { faturarOrcamento } from "@/services/faturacao";
import gerarPDF from "@/lib/faturacaoPdf";

const estadoColors = {
  aprovado: "success",
  pendente: "warning",
  cancelado: "secondary",
  rejeitado: "destructive",
};

const ESTADOS = ["pendente", "aprovado", "cancelado", "rejeitado"];

function formatKz(v) { return `Kz ${Number(v).toLocaleString("pt-AO")}`; }

function BarChart({ dados }) {
  const max = Math.max(...dados.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-44 px-1">
      {dados.map((b, i) => (
        <div key={i} className="flex flex-col items-center justify-end flex-1 h-full gap-1.5" title={`${b.label}: ${b.value}`}>
          <span className="text-[9px] font-bold text-foreground">{b.value || ""}</span>
          <div
            className="w-full max-w-[30px] rounded-t-lg bg-gradient-to-t from-primary/60 to-primary transition-all duration-500"
            style={{ height: `${Math.max((b.value / max) * 100, 3)}%` }}
          />
          <span className="text-[9px] font-semibold text-muted-foreground uppercase">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

const estadoCor = {
  aprovado: "#10b981",
  pendente: "#f59e0b",
  cancelado: "#94a3b8",
  rejeitado: "#ef4444",
};

function parseDataOrc(o) {
  const [y, m, d] = String(o.data || "").split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, d || 1);
}

function normalizarOrcamento(o) {
  if (!o) return o;
  return {
    ...o,
    cliente: {
      nome: o.cliente?.nome || "",
      empresa: o.cliente?.empresa || "",
      nif: o.cliente?.nif || "",
      telefone: o.cliente?.telefone || "",
      email: o.cliente?.email || "",
    },
    especificacao: {
      produto: o.especificacao?.produto || "",
      formato: o.especificacao?.formato || "",
      papel: o.especificacao?.papel || "",
      impressao: o.especificacao?.impressao || "",
      acabamento: o.especificacao?.acabamento || "",
    },
    itens: Array.isArray(o.itens) ? o.itens : [],
    subtotal: Number(o.subtotal) || 0,
    iva: Number(o.iva) || 0,
    valorIva: Number(o.valorIva) || 0,
    total: Number(o.total) || 0,
    prazoExecucao: o.prazoExecucao || "",
    condicoesPagamento: o.condicoesPagamento || "",
  };
}

const blankItem = { descricao: "", quantidade: "", valorUnitario: "" };
const blankForm = {
  cliente: "", empresa: "", nif: "", telefone: "", email: "",
  itens: [{ ...blankItem }],
  produto: "", formato: "", papel: "", impressao: "", acabamento: "",
  iva: "", prazoExecucao: "", condicoesPagamento: "100% antecipado", observacoes: "",
};

function gerarProformaPDF(o, empresa) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const cli = o.cliente || {};
  const spec = o.especificacao || {};
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome || "SIGRAF", 14, 17);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(empresa.endereco || "", 14, 23);
  doc.text(`NIF: ${empresa.nif || ""} | Tel: ${empresa.telefone || ""} | Email: ${empresa.email || ""}`, 14, 29);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("FATURA PROFORMA", pw - 14, 17, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: ${o.numero || o.id}`, pw - 14, 24, { align: "right" });
  doc.text(`Data: ${new Date(o.data).toLocaleDateString("pt-BR")}`, pw - 14, 30, { align: "right" });
  doc.text("Validade: 30 dias", pw - 14, 36, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${cli.nome}`, 14, y); y += 5;
  doc.text(`Empresa: ${cli.empresa}`, 14, y); y += 5;
  doc.text(`NIF: ${cli.nif}`, 14, y); y += 5;
  doc.text(`Telefone: ${cli.telefone}  |  Email: ${cli.email}`, 14, y); y += 8;

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: (o.itens || []).map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [240, 253, 244] },
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
    alternateRowStyles: { fillColor: [240, 253, 244] },
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
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;
  const boxX = pw - 88;
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(boxX, y, 74, 28, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text("Subtotal:", boxX + 4, y + 8); doc.text(formatKz(o.subtotal), pw - 18, y + 8, { align: "right" });
  if (o.valorIva > 0) { doc.text(`IVA (${o.iva}%):`, boxX + 4, y + 15); doc.text(formatKz(o.valorIva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", boxX + 4, y + 24); doc.text(formatKz(o.total), pw - 18, y + 24, { align: "right" });

  y += 34;
  doc.setTextColor(50, 50, 50); doc.setFontSize(9);
  doc.text(`Prazo de Execução: ${o.prazoExecucao}`, 14, y); y += 5;
  doc.text(`Condições de Pagamento: ${o.condicoesPagamento}`, 14, y); y += 8;
  if (o.observacoes) { doc.setFont("helvetica", "italic"); doc.text(`Obs: ${o.observacoes}`, 14, y); y += 6; }

  doc.setTextColor(180, 180, 180); doc.setFontSize(7);
  doc.text(`Documento gerado por SIGRAF — ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 285, { align: "center" });
  doc.save(`Proforma_${o.id}.pdf`);
}

function gerarReciboPDF(o, empresa) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const cli = o.cliente || {};
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pw, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(empresa.nome, 14, 17);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(empresa.endereco, 14, 23);
  doc.text(`NIF: ${empresa.nif} | Tel: ${empresa.telefone} | Email: ${empresa.email}`, 14, 29);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("FATURA DE RECIBO", pw - 14, 17, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Nº: REC-${String(o.numero || o.id).replace("ORC-", "")}`, pw - 14, 24, { align: "right" });
  doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, pw - 14, 30, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${cli.nome}`, 14, y); y += 5;
  doc.text(`Empresa: ${cli.empresa}`, 14, y); y += 5;
  doc.text(`NIF: ${cli.nif}`, 14, y); y += 5;
  doc.text(`Telefone: ${cli.telefone}  |  Email: ${cli.email}`, 14, y); y += 8;

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: (o.itens || []).map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
    theme: "grid", headStyles, bodyStyles,
    columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;
  const boxX = pw - 88;
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(boxX, y, 74, 28, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text("Subtotal:", boxX + 4, y + 8); doc.text(formatKz(o.subtotal), pw - 18, y + 8, { align: "right" });
  if (o.valorIva > 0) { doc.text(`IVA (${o.iva}%):`, boxX + 4, y + 15); doc.text(formatKz(o.valorIva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAGO:", boxX + 4, y + 24); doc.text(formatKz(o.total), pw - 18, y + 24, { align: "right" });

  y += 34;
  doc.setFillColor(232, 245, 233);
  doc.roundedRect(14, y, pw - 28, 18, 2, 2, "F");
  doc.setTextColor(5, 150, 105); doc.setFontSize(10); doc.setFont("helvetica", "bold");
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
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", nif: "", endereco: "", telefone: "", email: "" });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ ...blankForm });
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setCarregando(true);
      setErro(null);
      try {
        const [orcData, cliData, empData] = await Promise.all([listar(), listarClientes({ tipo: "cliente" }), buscarOrganizacao().catch(() => null)]);
        setOrcamentos((Array.isArray(orcData) ? orcData : orcData?.data ?? []).map(normalizarOrcamento));
        setClientes(Array.isArray(cliData) ? cliData : cliData?.data ?? []);
        if (empData) setEmpresa(empData);
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro na operação", "error");
      } finally {
        setCarregando(false);
      }
    }
    fetchData();
  }, [addToast]);

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
  const removeItem = (idx) => setForm((p) => p.itens.length <= 1 ? p : { ...p, itens: p.itens.filter((_, i) => i !== idx) });

  const subtotalCalc = form.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
  const ivaCalc = Number(form.iva) || 0;
  const totalCalc = subtotalCalc + ivaCalc;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dados = {
      cliente_id: form.cliente_id,
      cliente: { nome: form.cliente, empresa: form.empresa, nif: form.nif, telefone: form.telefone, email: form.email },
      itens: form.itens.map((it) => ({ ...it, quantidade: Number(it.quantidade), valorUnitario: Number(it.valorUnitario), total: Number(it.total) || 0 })),
      especificacao: { produto: form.produto, formato: form.formato, papel: form.papel, impressao: form.impressao, acabamento: form.acabamento },
      subtotal: subtotalCalc, iva: ivaCalc,
      prazoExecucao: form.prazoExecucao, condicoesPagamento: form.condicoesPagamento, observacoes: form.observacoes,
    };
    try {
      if (editandoId) {
        const atualizado = await atualizar(editandoId, dados);
        setOrcamentos((prev) => prev.map((o) => (o.id === editandoId ? normalizarOrcamento({ ...o, ...atualizado }) : o)));
        addToast("Orçamento atualizado com sucesso", "success");
      } else {
        const criado = await criar(dados);
        setOrcamentos((prev) => [normalizarOrcamento(criado), ...prev]);
        addToast("Orçamento criado com sucesso", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
    setForm({ ...blankForm, itens: [{ ...blankItem }] });
    setEditandoId(null);
    setModalOpen(false);
  };

  const handleEdit = (o) => {
    setEditandoId(o.id);
    setForm({
      cliente_id: o.cliente_id || "",
      cliente: o.cliente?.nome || "", empresa: o.cliente?.empresa || "", nif: o.cliente?.nif || "",
      telefone: o.cliente?.telefone || "", email: o.cliente?.email || "",
      itens: (o.itens || []).map((it) => ({ descricao: it.descricao, quantidade: String(it.quantidade), valorUnitario: String(it.valorUnitario), total: it.total })),
      produto: o.especificacao?.produto || "", formato: o.especificacao?.formato || "", papel: o.especificacao?.papel || "",
      impressao: o.especificacao?.impressao || "", acabamento: o.especificacao?.acabamento || "",
      iva: String(o.iva), prazoExecucao: o.prazoExecucao,
      condicoesPagamento: o.condicoesPagamento, observacoes: o.observacoes || "",
    });
    setModalOpen(true);
  };

  const handleMudarEstado = async (o, novoEstado) => {
    if (!novoEstado || novoEstado === o.estado) return;
    const antigo = o.estado;
    try {
      const atualizado = await mudarEstado(o.id, novoEstado);
      setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? normalizarOrcamento({ ...x, ...atualizado }) : x)));
      addToast(`Orçamento ${o.numero || o.id} marcado como ${novoEstado}`, "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao mudar o estado", "error");
      if (selected === o.id) setOrcamentos((prev) => prev.map((x) => (x.id === o.id ? { ...x, estado: antigo } : x)));
    }
  };

  const handleWhatsApp = (o) => {
    const tel = String(o.cliente?.telefone || o.cliente?.whatsapp || "").replace(/\D/g, "");
    if (!tel) {
      addToast("Cliente sem telefone registado", "error");
      return;
    }
    const msg = encodeURIComponent(`Olá ${o.cliente?.nome || ""}! Segue o seu orçamento ${o.numero || o.id} da ${empresa.nome || "SIGRAF"}.`);
    window.open(`https://wa.me/${tel}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const handleFaturar = async (o) => {
    try {
      const fatura = await faturarOrcamento(o.id, { tipo: "fatura" });
      addToast(`Orçamento faturado — ${fatura.numero} criado`, "success");
      gerarPDF(fatura, empresa);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao faturar orçamento", "error");
    }
  };

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await remover(eliminarItem.id);
      setOrcamentos((prev) => prev.filter((o) => o.id !== eliminarItem.id));
      addToast("Orçamento removido com sucesso", "success");
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally {
      setDeletando(false);
    }
  };

  const handleClienteSelect = (e) => {
    const id = e.target.value;
    if (!id) { setField("cliente_id", ""); setField("cliente", ""); setField("empresa", ""); setField("nif", ""); setField("telefone", ""); setField("email", ""); return; }
    const cli = clientes.find((c) => String(c.id) === id);
    if (cli) {
      setField("cliente_id", id); setField("cliente", cli.nome || cli.razao_social || "");
      setField("empresa", cli.empresa || ""); setField("nif", cli.nif || "");
      setField("telefone", cli.telefone || ""); setField("email", cli.email || "");
    }
  };

  const filtered = filter === "todos" ? orcamentos : orcamentos.filter((o) => o.estado === filter);
  const totalValor = orcamentos.reduce((s, o) => s + (o.total || o.subtotal + o.valorIva), 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;
  const aprovadosCount = orcamentos.filter((o) => o.estado === "aprovado").length;

  const agora = new Date();
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const dadosPorMes = meses.map((m, i) => ({
    label: m,
    value: orcamentos.filter((o) => {
      const d = parseDataOrc(o);
      return d && d.getFullYear() === agora.getFullYear() && d.getMonth() === i;
    }).length,
  }));
  const valorPorMes = meses.map((m, i) => ({
    label: m,
    value: Math.round(orcamentos
      .filter((o) => {
        const d = parseDataOrc(o);
        return d && d.getFullYear() === agora.getFullYear() && d.getMonth() === i;
      })
      .reduce((s, o) => s + (o.total || o.subtotal + o.valorIva), 0)),
  }));
  const porEstado = ESTADOS.map((s) => ({
    estado: s,
    qtd: orcamentos.filter((o) => o.estado === s).length,
  }));

  return (
    <div className="space-y-5">
      {carregando && <ListSkeleton count={5} />}

      {!carregando && (
        <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Orçamentos</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">{orcamentos.length} orçamentos registados // ORC</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setForm({ ...blankForm, itens: [{ ...blankItem }] }); setEditandoId(null); setModalOpen(true); }} className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(128,213,203,0.2)] hover:shadow-[0_0_25px_rgba(128,213,203,0.4)]">
              <Icon name="add" className="text-[16px]" /> Novo Orçamento
            </button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Orçamentos", value: orcamentos.length, icon: "request_quote", iconVariant: "primary" },
          { label: "Valor Total", value: `Kz ${(totalValor / 1000).toFixed(1)}k`, icon: "paid", iconVariant: "success" },
          { label: "Pendentes", value: pendentes, icon: "pending", iconVariant: "warning" },
          { label: "Aprovados", value: aprovadosCount, icon: "check_circle", iconVariant: "success" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} iconVariant={kpi.iconVariant} />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Orçamentos por Mês</CardTitle>
            <CardDescription>Quantidade emitida em {agora.getFullYear()} (dados reais)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart dados={dadosPorMes} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor por Mês</CardTitle>
            <CardDescription>Total em Kz emitido em {agora.getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart dados={valorPorMes} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Por Estado</CardTitle>
            <CardDescription>Distribuição real dos orçamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {porEstado.map(({ estado, qtd }) => {
              const pct = orcamentos.length ? Math.round((qtd / orcamentos.length) * 100) : 0;
              return (
                <div key={estado} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-muted-foreground capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: estadoCor[estado] }} />
                      {estado}
                    </span>
                    <span className="font-bold text-foreground">{qtd} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: estadoCor[estado] }} />
                  </div>
                </div>
              );
            })}
            {orcamentos.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem dados ainda</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["todos", ...ESTADOS].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm hidden md:table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nº</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Produto</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Total</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                  <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{o.numero || o.id}</span></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{o.cliente?.nome || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{o.especificacao?.produto || "—"}</td>
                  <td className="px-4 py-3 font-bold hidden lg:table-cell text-foreground text-right">{formatKz(o.total || o.subtotal + o.valorIva)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <select
                        value={o.estado}
                        onChange={(e) => handleMudarEstado(o, e.target.value)}
                        title="Mudar estado"
                        className="px-2 py-1.5 bg-background border border-input rounded-lg text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                      >
                        {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(o)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEliminarItem(o)} title="Remover" className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => gerarProformaPDF(o, empresa)} title="Fatura Proforma"><Icon name="description" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => gerarReciboPDF(o, empresa)} title="Fatura de Recibo"><Icon name="receipt_long" className="text-[16px]" /></Button>
                      {o.estado === "aprovado" && (
                        <Button variant="ghost" size="icon" onClick={() => handleFaturar(o)} title="Faturar orçamento"><Icon name="point_of_sale" className="text-[16px]" /></Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(o)} title="Enviar WhatsApp"><Icon name="chat" className="text-[16px]" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden space-y-3 p-3">
            {filtered.map((o) => (
              <Card key={o.id} className="cursor-pointer hover-lift" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{o.numero || o.id}</p>
                      <p className="text-[10px] text-muted-foreground">{o.cliente?.nome || "—"} · {o.especificacao?.produto || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                      <p className="text-xs font-bold text-foreground mt-1">{formatKz(o.total || o.subtotal + o.valorIva)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.estado}
                      onChange={(e) => handleMudarEstado(o, e.target.value)}
                      title="Mudar estado"
                      className="px-2 py-1.5 bg-background border border-input rounded-lg text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(o)}><Icon name="edit" className="text-sm" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEliminarItem(o)} className="text-error"><Icon name="delete" className="text-sm" /></Button>
                    <Button variant="outline" size="sm" onClick={() => gerarProformaPDF(o, empresa)}><Icon name="description" className="text-sm" /> Proforma</Button>
                    <Button variant="outline" size="sm" onClick={() => gerarReciboPDF(o, empresa)}><Icon name="receipt_long" className="text-sm" /> Recibo</Button>
                    {o.estado === "aprovado" && (
                      <Button variant="success" size="sm" onClick={() => handleFaturar(o)}><Icon name="point_of_sale" className="text-sm" /> Faturar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {selected && (() => {
        const o = orcamentos.find((x) => x.id === selected);
        if (!o) return null;
        return (
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2"><Icon name="description" className="text-primary" /> Detalhes — {o.numero || o.id}</CardTitle>
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={() => gerarProformaPDF(o, empresa)}><Icon name="description" className="text-[16px]" /> Proforma</Button>
                <Button variant="outline" size="sm" onClick={() => gerarReciboPDF(o, empresa)}><Icon name="receipt_long" className="text-[16px]" /> Recibo</Button>
                {o.estado === "aprovado" && (
                  <Button variant="success" size="sm" onClick={() => handleFaturar(o)}><Icon name="point_of_sale" className="text-[16px]" /> Faturar</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados do Cliente</h3>
                  <div className="space-y-1.5 text-sm">
                    {["Nome", "Empresa", "NIF", "Telefone", "Email"].map((campo) => (
                      <div key={campo} className="flex justify-between">
                        <span className="text-muted-foreground">{campo}:</span>
                        <span className="font-medium text-foreground">{o.cliente?.[campo.toLowerCase()] || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Especificação Técnica</h3>
                  <div className="space-y-1.5 text-sm">
                    {["Produto", "Formato", "Papel", "Impressão", "Acabamento"].map((campo) => (
                      <div key={campo} className="flex justify-between">
                        <span className="text-muted-foreground">{campo}:</span>
                        <span className="font-medium text-foreground">{o.especificacao?.[campo.toLowerCase()] || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descrição dos Serviços</h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-bold text-muted-foreground uppercase">Descrição</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground uppercase">Qtd</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Valor Unit.</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(o.itens || []).map((it, i) => (
                        <tr key={i} className="border-b border-border/20">
                          <td className="px-3 py-2 text-foreground">{it.descricao}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{it.quantidade}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{formatKz(it.valorUnitario)}</td>
                          <td className="px-3 py-2 text-right font-bold text-foreground">{formatKz(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-3">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{formatKz(o.subtotal)}</span></div>
                    {o.valorIva > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IVA ({o.iva}%):</span><span className="font-medium">{formatKz(o.valorIva)}</span></div>}
                    <div className="flex justify-between border-t pt-1 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(o.total || o.subtotal + o.valorIva)}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Prazo de Execução", value: o.prazoExecucao },
                  { label: "Condições de Pagamento", value: o.condicoesPagamento },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Estado</p>
                  <select
                    value={o.estado}
                    onChange={(e) => handleMudarEstado(o, e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    {ESTADOS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {o.observacoes && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Observações</p>
                  <p className="text-foreground text-sm">{o.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Modal open={modalOpen} onClose={() => { setForm({ ...blankForm, itens: [{ ...blankItem }] }); setEditandoId(null); setModalOpen(false); }} title={editandoId ? "Editar Orçamento" : "Novo Orçamento"} icon="request_quote" size="2xl"
        footer={<><Button type="button" variant="outline" onClick={() => { setForm({ ...blankForm, itens: [{ ...blankItem }] }); setEditandoId(null); setModalOpen(false); }}>Cancelar</Button><Button type="submit" form="form-orcamento">{editandoId ? "Atualizar Orçamento" : "Criar Orçamento"}</Button></>}>
        <form id="form-orcamento" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="person" className="text-sm text-primary" /> Dados do Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente *</label>
                <select required name="cliente_id" value={form.cliente_id || ""} onChange={handleClienteSelect} className={inputCls}>
                  <option value="">Selecionar cliente...</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome || c.razao_social}{c.empresa ? ` — ${c.empresa}` : ""}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</label>
                <input name="empresa" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} className={inputCls} placeholder="Nome da empresa" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">NIF *</label>
                <input required name="nif" value={form.nif} onChange={(e) => setField("nif", e.target.value)} className={inputCls} placeholder="Nº de identificação fiscal" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telefone *</label>
                <input required name="telefone" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className={inputCls} placeholder="+244 9XX XXX XXX" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <input name="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={inputCls} placeholder="cliente@email.com" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="list" className="text-sm text-primary" /> Descrição dos Serviços</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}><Icon name="add_circle" className="text-sm" /> Adicionar Item</Button>
            </div>
            {form.itens.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/50 rounded-xl p-3">
                <div className="col-span-12 sm:col-span-5 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Descrição *</label>}
                  <input required value={it.descricao} onChange={(e) => setItem(idx, "descricao", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Descrição do serviço" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Qtd *</label>}
                  <input required type="number" min="1" value={it.quantidade} onChange={(e) => setItem(idx, "quantidade", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-4 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Valor Unit. *</label>}
                  <input required type="number" min="0" value={it.valorUnitario} onChange={(e) => setItem(idx, "valorUnitario", e.target.value)} className="px-2.5 py-2 bg-background border border-input rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
                </div>
                <div className="col-span-3 sm:col-span-2 flex flex-col gap-1.5">
                  {idx === 0 && <label className="text-[9px] font-semibold text-muted-foreground uppercase">Total</label>}
                  <div className="px-2.5 py-2 bg-muted border border-input rounded-lg text-xs font-bold text-foreground">{formatKz(it.total || 0)}</div>
                </div>
                <div className="col-span-1 flex justify-center">
                  {form.itens.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} title="Remover" className="text-error">
                      <Icon name="close" className="text-sm" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="settings" className="text-sm text-primary" /> Especificação Técnica</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Produto *</label>
                <input required name="produto" value={form.produto} onChange={(e) => setField("produto", e.target.value)} className={inputCls} placeholder="Ex: Catálogos Institucionais" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Formato *</label>
                <input required name="formato" value={form.formato} onChange={(e) => setField("formato", e.target.value)} className={inputCls} placeholder="Ex: A4, 1x2m" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Papel / Material *</label>
                <input required name="papel" value={form.papel} onChange={(e) => setField("papel", e.target.value)} className={inputCls} placeholder="Ex: Papel Couché 150g" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impressão *</label>
                <select required name="impressao" value={form.impressao} onChange={(e) => setField("impressao", e.target.value)} className={inputCls}>
                  <option value="" disabled>Selecionar...</option>
                  <option>Offset</option><option>Digital</option><option>Serigrafia</option><option>Flexografia</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Acabamento *</label>
                <input required name="acabamento" value={form.acabamento} onChange={(e) => setField("acabamento", e.target.value)} className={inputCls} placeholder="Ex: Verniz Localizado, Corte e Dobra" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="payments" className="text-sm text-primary" /> Valores e Condições</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">IVA (Kz) — Opcional</label>
                <input type="number" min="0" name="iva" value={form.iva} onChange={(e) => setField("iva", e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prazo de Execução *</label>
                <input required name="prazoExecucao" value={form.prazoExecucao} onChange={(e) => setField("prazoExecucao", e.target.value)} className={inputCls} placeholder="Ex: 5 dias úteis" />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Condições de Pagamento *</label>
                <div className="flex gap-2 flex-wrap">
                  {["100% antecipado", "50% de sinal + 50% na entrega", "Outro"].map((c) => (
                    <button key={c} type="button" onClick={() => setField("condicoesPagamento", c)} className={`px-3 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
                      form.condicoesPagamento === c ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground"
                    }`}>{c}</button>
                  ))}
                </div>
                {form.condicoesPagamento === "Outro" && (
                  <input required className={`${inputCls} mt-2`} placeholder="Especificar condições..." onChange={(e) => setField("condicoesPagamento", e.target.value)} />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea name="observacoes" value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Notas adicionais..." />
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <p>Subtotal: <strong className="text-foreground">{formatKz(subtotalCalc)}</strong></p>
              {ivaCalc > 0 && <p>IVA: <strong className="text-foreground">{formatKz(ivaCalc)}</strong></p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Total</p>
              <p className="text-lg font-bold text-primary">{formatKz(totalCalc)}</p>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Remover orçamento"
        description={
          eliminarItem
            ? `Tem a certeza que deseja remover o orçamento #${eliminarItem.numero || eliminarItem.id}? Esta ação não pode ser desfeita.`
            : ""
        }
      />

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
