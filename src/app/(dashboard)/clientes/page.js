"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Card, CardContent } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { listar, criar, atualizar, remover } from "@/services/clientes";

const initialForm = {
  tipo: "cliente", nome: "", empresa: "", nif: "", telefone: "",
  whatsapp: "", email: "", endereco: "",
  dataCadastro: new Date().toISOString().split("T")[0],
};

export default function CadastrosPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(null);
  const { addToast } = useToast();

  const carregar = useCallback(async (params = {}) => {
    setCarregando(true);
    try {
      const data = await listar(params);
      setClientes(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar clientes", "error");
      setClientes([]);
    } finally { setCarregando(false); }
  }, [addToast]);

  useEffect(() => {
    const params = {};
    if (filtroTipo !== "todos") params.tipo = filtroTipo;
    if (searchTerm) params.busca = searchTerm;
    carregar(params);
  }, [searchTerm, filtroTipo, carregar]);

  const totalClientes = clientes.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = clientes.filter((c) => c.tipo === "fornecedor").length;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await atualizar(editando, form);
        addToast("Cliente atualizado com sucesso", "success");
      } else {
        await criar(form);
        addToast("Cliente cadastrado com sucesso", "success");
      }
      setForm(initialForm); setShowForm(false); setEditando(null);
      const params = {};
      if (filtroTipo !== "todos") params.tipo = filtroTipo;
      if (searchTerm) params.busca = searchTerm;
      await carregar(params);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const handleDelete = async (codigo) => {
    try {
      await remover(codigo);
      addToast("Cliente removido com sucesso", "success");
      const params = {};
      if (filtroTipo !== "todos") params.tipo = filtroTipo;
      if (searchTerm) params.busca = searchTerm;
      await carregar(params);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    }
  };

  const handleEdit = (item) => {
    setForm({
      tipo: item.tipo || "cliente", nome: item.nome || "", empresa: item.empresa || "",
      nif: item.nif || "", telefone: item.telefone || "", whatsapp: item.whatsapp || "",
      email: item.email || "", endereco: item.endereco || "",
      dataCadastro: item.dataCadastro ? item.dataCadastro.split("T")[0] : new Date().toISOString().split("T")[0],
    });
    setEditando(item._id || item.id || item.codigo);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cadastros</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {clientes.length} registos ({totalClientes} clientes, {totalFornecedores} fornecedores)
          </p>
        </div>
        <Button onClick={() => { setEditando(null); setForm(initialForm); setShowForm(true); }}>
          <Icon name="add" className="text-lg" /> Novo Cadastro
        </Button>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {[
          { label: "Total Cadastros", value: clientes.length, icon: "badge" },
          { label: "Clientes", value: totalClientes, icon: "person" },
          { label: "Fornecedores", value: totalFornecedores, icon: "local_shipping" },
        ].map((kpi) => (
          <KpiCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditando(null); setForm(initialForm); }} title={editando ? "Editar Cadastro" : "Novo Cadastro"} icon="person_add" size="lg"
        footer={<><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditando(null); setForm(initialForm); }}>Cancelar</Button><Button type="submit" form="form-cliente">Guardar {form.tipo === "cliente" ? "Cliente" : "Fornecedor"}</Button></>}>
        <form id="form-cliente" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Cadastro *</label>
            <div className="flex gap-2">
              {["cliente", "fornecedor"].map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                    form.tipo === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-muted/50 text-muted-foreground"
                  }`}>
                  <Icon name={t === "cliente" ? "person" : "local_shipping"} className="text-lg" />
                  {t === "cliente" ? "Cliente" : "Fornecedor"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "nome", label: "Nome Completo / Razão Social *", placeholder: form.tipo === "cliente" ? "Ex: João Matos" : "Ex: Papelaria Angola Lda", required: true },
              { name: "empresa", label: "Empresa", placeholder: "Ex: Gráfica Expresso" },
              { name: "nif", label: "NIF *", placeholder: "Ex: 541236987", required: true },
              { name: "telefone", label: "Telefone *", placeholder: "Ex: +244 923 456 789", required: true },
              { name: "whatsapp", label: "WhatsApp", placeholder: "Ex: +244 923 456 789" },
              { name: "email", label: "Email", placeholder: "Ex: contato@email.com", type: "email" },
            ].map((f) => (
              <div key={f.name} className={f.name === "endereco" || f.name === "email" ? "sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                <input required={f.required} name={f.name} type={f.type || "text"} value={form[f.name]} onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Endereço</label>
              <input name="endereco" value={form.endereco} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                placeholder="Ex: Rua Major Kanhangulo, 145 - Luanda" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Data de Cadastro</label>
              <input name="dataCadastro" type="date" value={form.dataCadastro} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
          </div>
        </form>
      </Modal>

      {carregando ? <ListSkeleton count={5} /> : (
        <Card>
          <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex gap-2">
              {["todos", "cliente", "fornecedor"].map((f) => (
                <Button key={f} variant={filtroTipo === f ? "default" : "outline"} size="sm" onClick={() => setFiltroTipo(f)}>
                  <Icon name={f === "todos" ? "badge" : f === "cliente" ? "person" : "local_shipping"} className="text-sm" />
                  {f === "todos" ? "Todos" : f === "cliente" ? "Clientes" : "Fornecedores"}
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:w-auto">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
              <input className="pl-10 pr-4 py-2 bg-background border border-input rounded-full text-xs w-full sm:w-64 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                placeholder="Buscar por nome, empresa, código ou NIF..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["Código", "Tipo", "Nome", "Empresa", "NIF", "Telefone", "Email", "Cadastro", "Ações"].map((h) => (
                    <th key={h} className={`text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ${["Empresa", "Telefone", "Email"].includes(h) ? "hidden xl:table-cell" : ""} ${h === "Email" ? "hidden 2xl:table-cell" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((item) => (
                  <tr key={item.codigo} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded text-[10px]">{item.codigo}</span></td>
                    <td className="px-5 py-3">
                      <Badge variant={item.tipo === "cliente" ? "info" : "secondary"} className="text-[10px]">
                        <Icon name={item.tipo === "cliente" ? "person" : "local_shipping"} className="text-xs mr-1" />
                        {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{item.nome}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden xl:table-cell">{item.empresa}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{item.nif}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden xl:table-cell">{item.telefone}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden 2xl:table-cell">{item.email}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(item.dataCadastro).toLocaleDateString("pt-BR")}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Ver detalhes"><Icon name="visibility" className="text-[16px]" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.codigo)} title="Eliminar" className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientes.length === 0 && (
              <div className="p-12 text-center">
                <Icon name="search_off" className="text-4xl text-muted-foreground mb-2 block" />
                <p className="text-muted-foreground font-medium">Nenhum cadastro encontrado</p>
                <p className="text-muted-foreground text-xs mt-1">Tente ajustar os termos de pesquisa</p>
              </div>
            )}
          </div>

          <div className="lg:hidden divide-y divide-border/20">
            {clientes.map((item) => (
              <div key={item.codigo} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-[10px]">{item.codigo}</span>
                      <Badge variant={item.tipo === "cliente" ? "info" : "secondary"} className="text-[10px]">
                        <Icon name={item.tipo === "cliente" ? "person" : "local_shipping"} className="text-[10px] mr-0.5" />
                        {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.empresa}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon name="call" className="text-[10px]" /> {item.telefone}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Icon name="mail" className="text-[10px]" /> {item.email}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">NIF: {item.nif}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar"><Icon name="edit" className="text-[14px]" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.codigo)} title="Eliminar" className="text-error"><Icon name="delete" className="text-[14px]" /></Button>
                  </div>
                </div>
              </div>
            ))}
            {clientes.length === 0 && (
              <div className="p-12 text-center">
                <Icon name="search_off" className="text-4xl text-muted-foreground mb-2 block" />
                <p className="text-muted-foreground font-medium">Nenhum cadastro encontrado</p>
                <p className="text-muted-foreground text-xs mt-1">Tente ajustar os termos de pesquisa</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-between items-center text-xs text-muted-foreground">
            <span>A mostrar {clientes.length} de {clientes.length} cadastros</span>
            <div className="flex gap-1">
              <Button size="sm" variant="default" className="px-3">1</Button>
              <Button size="sm" variant="outline" className="px-3">Próximo →</Button>
            </div>
          </div>
        </Card>
      )}

      <footer className="p-6 text-center border-t bg-muted/30 rounded-2xl">
        <p className="text-sm text-muted-foreground">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
      </footer>
    </div>
  );
}
