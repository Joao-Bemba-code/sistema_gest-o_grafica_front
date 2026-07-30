"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { listar, criar, atualizar, remover } from "@/services/orcamentos";
import { listar as listarClientes } from "@/services/clientes";

const estadoColors = {
  aprovado: "success",
  pendente: "warning",
  rejeitado: "destructive",
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
  doc.setFillColor(5, 150, 105);
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
  doc.text("Validade: 30 dias", pw - 14, 36, { align: "right" });

  doc.setTextColor(50, 50, 50);
  let y = 50;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Dados do Cliente:", 14, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Nome: ${o.cliente.nome}`, 14, y); y += 5;
  doc.text(`Empresa: ${o.cliente.empresa}`, 14, y); y += 5;
  doc.text(`NIF: ${o.cliente.nif}`, 14, y); y += 5;
  doc.text(`Telefone: ${o.cliente.telefone}  |  Email: ${o.cliente.email}`, 14, y); y += 8;

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: o.itens.map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
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
  const boxX = pw - 88;
  doc.setFillColor(5, 150, 105);
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
  doc.setFillColor(5, 150, 105);
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

  const headStyles = { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 };
  const bodyStyles = { fontSize: 8, textColor: [50, 50, 50] };

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Descrição dos Serviços:", 14, y); y += 2;
  doc.autoTable({
    startY: y,
    head: [["Descrição", "Qtd", "Valor Unit.", "Total"]],
    body: o.itens.map((it) => [it.descricao, String(it.quantidade), formatKz(it.valorUnitario), formatKz(it.total)]),
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
  if (o.iva > 0) { doc.text("IVA (14%):", boxX + 4, y + 15); doc.text(formatKz(o.iva), pw - 18, y + 15, { align: "right" }); }
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAGO:", boxX + 4, y + 24); doc.text(formatKz(o.subtotal + o.iva), pw - 18, y + 24, { align: "right" });

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
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ ...blankForm });
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setCarregando(true);
      setErro(null);
      try {
        const [orcData, cliData] = await Promise.all([listar(), listarClientes()]);
        setOrcamentos(Array.isArray(orcData) ? orcData : orcData?.data ?? []);
        setClientes(Array.isArray(cliData) ? cliData : cliData?.data ?? []);
      } catch (err) {
        addToast(err.response?.data?.erro || "Erro na operação", "error");
      } finally {
        setCarregando(false);
      }
    }
    fetchData();
  }, []);

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
        setOrcamentos((prev) => prev.map((o) => (o.id === editandoId ? { ...o, ...(atualizado?.data ?? atualizado) } : o)));
        addToast("Orçamento atualizado com sucesso", "success");
      } else {
        const criado = await criar(dados);
        setOrcamentos((prev) => [(criado?.data ?? criado), ...prev]);
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
      cliente: o.cliente.nome, empresa: o.cliente.empresa, nif: o.cliente.nif,
      telefone: o.cliente.telefone, email: o.cliente.email,
      itens: o.itens.map((it) => ({ descricao: it.descricao, quantidade: String(it.quantidade), valorUnitario: String(it.valorUnitario), total: it.total })),
      produto: o.especificacao.produto, formato: o.especificacao.formato, papel: o.especificacao.papel,
      impressao: o.especificacao.impressao, acabamento: o.especificacao.acabamento,
      iva: String(o.iva), prazoExecucao: o.prazoExecucao,
      condicoesPagamento: o.condicoesPagamento, observacoes: o.observacoes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem a certeza que deseja remover este orçamento?")) return;
    try {
      await remover(id);
      setOrcamentos((prev) => prev.filter((o) => o.id !== id));
      addToast("Orçamento removido com sucesso", "success");
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
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
  const totalValor = orcamentos.reduce((s, o) => s + o.subtotal + o.iva, 0);
  const pendentes = orcamentos.filter((o) => o.estado === "pendente").length;
  const aprovadosCount = orcamentos.filter((o) => o.estado === "aprovado").length;

  return (
    <div className="space-y-5">
      {carregando && <ListSkeleton count={5} />}

      {!carregando && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Orçamentos</h1>
            <p className="text-xs text-muted-foreground mt-1">{orcamentos.length} orçamentos registados</p>
          </div>
          <Button onClick={() => { setForm({ ...blankForm, itens: [{ ...blankItem }] }); setEditandoId(null); setModalOpen(true); }}>
            <Icon name="add" className="text-lg" /> Novo Orçamento
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: "Total Orçamentos", value: orcamentos.length, icon: "request_quote" },
          { label: "Valor Total", value: `Kz ${(totalValor / 1000).toFixed(1)}k`, icon: "paid" },
          { label: "Pendentes", value: pendentes, icon: "pending" },
          { label: "Aprovados", value: aprovadosCount, icon: "check_circle" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <div className="flex gap-2 flex-wrap">
        {["todos", "pendente", "aprovado", "rejeitado"].map((f) => (
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
                  <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{o.id}</span></td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{o.cliente.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{o.especificacao.produto}</td>
                  <td className="px-4 py-3 font-bold hidden lg:table-cell text-foreground text-right">{formatKz(o.subtotal + o.iva)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(o)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} title="Remover" className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => gerarProformaPDF(o)} title="Fatura Proforma"><Icon name="description" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => gerarReciboPDF(o)} title="Fatura de Recibo"><Icon name="receipt_long" className="text-[16px]" /></Button>
                      <Button variant="ghost" size="icon" title="Enviar WhatsApp"><Icon name="chat" className="text-[16px]" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden space-y-3 p-3">
            {filtered.map((o) => (
              <Card key={o.id} className="cursor-pointer hover-lift" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground">{o.id}</p>
                      <p className="text-[10px] text-muted-foreground">{o.cliente.nome} · {o.especificacao.produto}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(o.data).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={estadoColors[o.estado] || "secondary"} className="text-[10px]">{o.estado}</Badge>
                      <p className="text-xs font-bold text-foreground mt-1">{formatKz(o.subtotal + o.iva)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(o)}><Icon name="edit" className="text-sm" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)} className="text-error"><Icon name="delete" className="text-sm" /></Button>
                    <Button variant="outline" size="sm" onClick={() => gerarProformaPDF(o)}><Icon name="description" className="text-sm" /> Proforma</Button>
                    <Button variant="outline" size="sm" onClick={() => gerarReciboPDF(o)}><Icon name="receipt_long" className="text-sm" /> Recibo</Button>
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
              <CardTitle className="flex items-center gap-2"><Icon name="description" className="text-primary" /> Detalhes — {o.id}</CardTitle>
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={() => gerarProformaPDF(o)}><Icon name="description" className="text-[16px]" /> Proforma</Button>
                <Button variant="outline" size="sm" onClick={() => gerarReciboPDF(o)}><Icon name="receipt_long" className="text-[16px]" /> Recibo</Button>
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
                        <span className="font-medium text-foreground">{o.cliente[campo.toLowerCase()] || "—"}</span>
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
                        <span className="font-medium text-foreground">{o.especificacao[campo.toLowerCase()] || "—"}</span>
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
                      {o.itens.map((it, i) => (
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
                    {o.iva > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IVA (14%):</span><span className="font-medium">{formatKz(o.iva)}</span></div>}
                    <div className="flex justify-between border-t pt-1 font-bold text-sm"><span>Total:</span><span className="text-primary">{formatKz(o.subtotal + o.iva)}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Prazo de Execução", value: o.prazoExecucao },
                  { label: "Condições de Pagamento", value: o.condicoesPagamento },
                  { label: "Estado", value: <Badge variant={estadoColors[o.estado] || "secondary"}>{o.estado}</Badge> },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
                    <p className="font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
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
                <select required name="cliente_id" value={form.cliente_id || ""} onChange={handleClienteSelect} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                  <option value="">Selecionar cliente...</option>
                  {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome || c.razao_social}{c.empresa ? ` — ${c.empresa}` : ""}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Empresa</label>
                <input name="empresa" value={form.empresa} onChange={(e) => setField("empresa", e.target.value)} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nome da empresa" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">NIF *</label>
                <input required name="nif" value={form.nif} onChange={(e) => setField("nif", e.target.value)} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Nº de identificação fiscal" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telefone *</label>
                <input required name="telefone" value={form.telefone} onChange={(e) => setField("telefone", e.target.value)} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="+244 9XX XXX XXX" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                <input name="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="cliente@email.com" />
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
                <input required name="produto" value={form.produto} onChange={(e) => setField("produto", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Catálogos Institucionais" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Formato *</label>
                <input required name="formato" value={form.formato} onChange={(e) => setField("formato", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: A4, 1x2m" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Papel / Material *</label>
                <input required name="papel" value={form.papel} onChange={(e) => setField("papel", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Papel Couché 150g" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impressão *</label>
                <select required name="impressao" value={form.impressao} onChange={(e) => setField("impressao", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="" disabled>Selecionar...</option>
                  <option>Offset</option><option>Digital</option><option>Serigrafia</option><option>Flexografia</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Acabamento *</label>
                <input required name="acabamento" value={form.acabamento} onChange={(e) => setField("acabamento", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: Verniz Localizado, Corte e Dobra" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Icon name="payments" className="text-sm text-primary" /> Valores e Condições</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">IVA (Kz) — Opcional</label>
                <input type="number" min="0" name="iva" value={form.iva} onChange={(e) => setField("iva", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prazo de Execução *</label>
                <input required name="prazoExecucao" value={form.prazoExecucao} onChange={(e) => setField("prazoExecucao", e.target.value)} className="px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30" placeholder="Ex: 5 dias úteis" />
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
                  <input required className="mt-2 px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Especificar condições..." onChange={(e) => setField("condicoesPagamento", e.target.value)} />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</label>
              <textarea name="observacoes" value={form.observacoes} onChange={(e) => setField("observacoes", e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Notas adicionais..." />
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

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
