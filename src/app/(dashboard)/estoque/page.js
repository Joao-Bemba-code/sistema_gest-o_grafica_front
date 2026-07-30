"use client";

import { useState, useEffect } from "react";
import { listar, criar, movimentar } from "@/services/materiais";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/Toast";
import { TableSkeleton } from "@/components/Skeleton";

const categorias = ["Papel", "Tintas", "Lonas", "Vinil", "Cola", "Chapas"];
const categoriaIcones = {
  Papel: "description", Tintas: "format_color_fill", Lonas: "flag",
  Vinil: "sticker", Cola: "inventory_2", Chapas: "view_column",
};
const fornecedores = ["Papelaria Angola", "Tintas Premium Lda", "Lonas & Vinis SA", "Colas Industriais", "Distribuidora Gráfica"];

const initialItem = { codigo: "", categoria: "Papel", fornecedor: "", nomeComercial: "", nomeTecnico: "", descricaoDetalhada: "", especificidade: "", condicaoArmazenagem: "", unidade: "", estoqueMaximo: "", estoqueMinimo: "", pontoReposicao: "", precoCompra: "", precoVenda: "", custo: "", margem: "" };

export default function EstoquePage() {
  const [materiais, setMateriais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const { addToast } = useToast();
  const [movModal, setMovModal] = useState({ open: false, item: null, tipo: "entrada" });
  const [movQtd, setMovQtd] = useState("");
  const [itemModal, setItemModal] = useState(false);
  const [form, setForm] = useState(initialItem);

  useEffect(() => {
    listar().then(setMateriais).catch(setErro).finally(() => setCarregando(false));
  }, []);

  const alertas = materiais.filter((i) => i.saldo <= i.pontoReposicao);
  const carregarDados = () => listar().then(setMateriais).catch(setErro);

  const registrarMov = () => {
    const qtd = Number(movQtd);
    if (!qtd || qtd <= 0) return;
    setCarregando(true);
    movimentar({ material_id: movModal.item.id, tipo: movModal.tipo, quantidade: qtd, motivo: movModal.tipo === "entrada" ? "Entrada manual" : "Saída manual" })
      .then(() => { carregarDados(); addToast("Movimentação registada com sucesso", "success"); })
      .catch((err) => addToast(err.response?.data?.erro || "Erro na operação", "error"))
      .finally(() => setCarregando(false));
    setMovQtd(""); setMovModal({ open: false, item: null, tipo: "entrada" });
  };

  const handleNewItem = (e) => {
    e.preventDefault();
    setCarregando(true);
    const dados = { ...form, saldo: 0, estoqueMaximo: Number(form.estoqueMaximo), estoqueMinimo: Number(form.estoqueMinimo), pontoReposicao: Number(form.pontoReposicao), nome: form.nomeComercial };
    criar(dados)
      .then(() => { carregarDados(); addToast("Material cadastrado com sucesso", "success"); })
      .catch((err) => addToast(err.response?.data?.erro || "Erro na operação", "error"))
      .finally(() => setCarregando(false));
    setForm(initialItem); setItemModal(false);
  };

  const totalGeral = materiais.reduce((s, i) => s + (Number(i.saldo) || 0), 0);
  const emAlerta = materiais.filter(i => i.saldo <= i.pontoReposicao).length;
  const ok = materiais.filter(i => i.saldo > i.pontoReposicao).length;

  return (
    <div className="space-y-5">
      {carregando && <TableSkeleton rows={8} cols={5} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Estoque</h1>
          <p className="text-xs text-muted-foreground mt-1">{materiais.length} materiais em {categorias.length} categorias</p>
        </div>
        <Button onClick={() => setItemModal(true)}><Icon name="add" className="text-lg" /> Novo Material</Button>
      </div>

      {alertas.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
          <Icon name="warning" className="text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-destructive">Materiais com Estoque Baixo</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {alertas.map((a) => (
                <span key={a.id} className="px-2.5 py-1 bg-destructive/10 text-destructive text-[10px] font-bold rounded-full">
                  {a.nome}: {a.saldo}/{a.pontoReposicao} {a.unidade}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: "Total Itens", value: materiais.length, icon: "inventory_2" },
          { label: "Qtd em Stock", value: totalGeral, icon: "checklist" },
          { label: "Estável", value: ok, icon: "check_circle" },
          { label: "Alerta", value: emAlerta, icon: "warning", danger: emAlerta > 0 },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value ?? 0}
            className={kpi.danger ? "ring-1 ring-destructive/30 border-destructive/50" : ""}
            iconClass={kpi.danger ? "!bg-destructive/10 !text-destructive" : ""}
            valueClass={kpi.danger ? "!text-destructive" : ""}
          />
        ))}
      </section>

      {categorias.map((cat) => {
        const catItems = materiais.filter(i => i.categoria === cat);
        if (catItems.length === 0) return null;
        return (
          <Card key={cat}>
            <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
              <Icon name={categoriaIcones[cat]} className="text-lg text-primary" />
              <h2 className="text-sm font-bold text-foreground">{cat}</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">{catItems.length} materiais</span>
            </div>
            <div className="divide-y divide-border/30">
              {catItems.map((item) => {
                const isLow = item.saldo <= item.estoqueMinimo;
                const pct = item.estoqueMaximo > 0 ? Math.min(100, Math.round((item.saldo / item.estoqueMaximo) * 100)) : 100;
                return (
                  <div key={item.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{item.codigo} — {item.nomeTecnico}</p>
                      <p className="text-[10px] text-muted-foreground">{item.fornecedor} • {item.unidade}</p>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-center min-w-[45px]">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Máx</p>
                        <p className="text-sm font-bold text-foreground">{item.estoqueMaximo}</p>
                      </div>
                      <div className="text-center min-w-[45px]">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Mín</p>
                        <p className="text-sm font-bold text-muted-foreground">{item.estoqueMinimo}</p>
                      </div>
                      <div className="text-center min-w-[50px]">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Reposição</p>
                        <p className="text-sm font-bold text-secondary">{item.pontoReposicao}</p>
                      </div>
                      <div className="text-center min-w-[55px]">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Saldo</p>
                        <p className={`text-base font-bold ${isLow ? "text-destructive" : "text-primary"}`}>{item.saldo}</p>
                      </div>
                      <div className="text-center min-w-[60px] hidden sm:block">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Preço Venda</p>
                        <p className="text-sm font-bold text-primary">Kz {item.precoVenda?.toLocaleString("pt-AO")}</p>
                      </div>
                      <div className="text-center min-w-[45px] hidden sm:block">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Margem</p>
                        <p className="text-sm font-bold text-secondary">{item.margem}%</p>
                      </div>
                      <div className="hidden sm:block w-20">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct <= 50 ? "bg-primary" : pct <= 80 ? "bg-secondary" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setMovModal({ open: true, item, tipo: "entrada" }); setMovQtd(""); }} className="text-primary text-[10px]">
                          <Icon name="add" className="text-sm" /> Entrada
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setMovModal({ open: true, item, tipo: "saida" }); setMovQtd(""); }} className="text-destructive text-[10px]">
                          <Icon name="remove" className="text-sm" /> Saída
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      <Modal open={movModal.open} onClose={() => setMovModal({ open: false, item: null, tipo: "entrada" })} title={`Registrar ${movModal.tipo === "entrada" ? "Entrada" : "Saída"}`} icon={movModal.tipo === "entrada" ? "add" : "remove"} size="sm"
        footer={<><Button variant="outline" onClick={() => setMovModal({ open: false, item: null, tipo: "entrada" })}>Cancelar</Button><Button onClick={registrarMov}>{movModal.tipo === "entrada" ? "Dar Entrada" : "Registar Saída"}</Button></>}>
    <div className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Material</p>
            <p className="text-base font-bold text-foreground">{movModal.item?.nome || "—"}</p>
            <p className="text-xs text-muted-foreground">Saldo atual: <strong className="text-foreground text-base">{Number(movModal.item?.saldo) || 0}</strong> {movModal.item?.unidade || "un"}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quantidade *</label>
            <input type="number" min="1" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} className="w-full px-4 py-3 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 5" autoFocus />
          </div>
        </div>
      </Modal>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Novo Material" icon="add_box" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => setItemModal(false)}>Cancelar</Button><Button type="submit" form="form-material">Guardar Material</Button></>}>
        <form id="form-material" onSubmit={handleNewItem} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "codigo", label: "Código *", placeholder: "Ex: MAT-013", required: true },
              { name: "categoria", label: "Categoria *", type: "select", options: categorias, required: true },
              { name: "fornecedor", label: "Fornecedor *", type: "select", options: fornecedores, required: true },
              { name: "nomeComercial", label: "Nome Comercial *", placeholder: "Ex: Papel Couché 150g", required: true },
              { name: "nomeTecnico", label: "Nome Técnico *", placeholder: "Ex: C150-BO", required: true },
              { name: "unidade", label: "Unidade *", placeholder: "Ex: resmas, kg", required: true },
            ].map((f) => (
              <div key={f.name} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                {f.type === "select" ? (
                  <select required={f.required} name={f.name} value={form[f.name]} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="" disabled>Selecionar</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input required={f.required} name={f.name} value={form[f.name]} onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder={f.placeholder} />
                )}
              </div>
            ))}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Descrição Detalhada *</label>
              <textarea required name="descricaoDetalhada" value={form.descricaoDetalhada} onChange={(e) => setForm({ ...form, descricaoDetalhada: e.target.value })}
                rows={2} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Descrição completa do material..." />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Especificidade *</label>
              <textarea required name="especificidade" value={form.especificidade} onChange={(e) => setForm({ ...form, especificidade: e.target.value })}
                rows={2} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Características técnicas específicas..." />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Condição de Armazenagem *</label>
              <textarea required name="condicaoArmazenagem" value={form.condicaoArmazenagem} onChange={(e) => setForm({ ...form, condicaoArmazenagem: e.target.value })}
                rows={2} className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" placeholder="Condições necessárias para armazenamento..." />
            </div>
            {["estoqueMaximo", "estoqueMinimo", "pontoReposicao", "precoCompra", "precoVenda", "custo", "margem"].map((f) => (
              <div key={f} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} *</label>
                <input required type="number" name={f} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 100" />
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
