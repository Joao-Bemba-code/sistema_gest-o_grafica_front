"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const initialForm = {
  tipo: "cliente",
  nome: "",
  empresa: "",
  nif: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  dataCadastro: new Date().toISOString().split("T")[0],
};

const sampleCadastros = [
  { codigo: "CAD-001", tipo: "cliente", nome: "João Matos", empresa: "Gráfica Expresso", nif: "541236987", telefone: "+244 923 456 789", whatsapp: "+244 923 456 789", email: "joao@graficaexpresso.co.ao", endereco: "Rua Major Kanhangulo, 145 - Luanda", dataCadastro: "2024-01-15" },
  { codigo: "CAD-002", tipo: "cliente", nome: "Maria Santos", empresa: "PubliAngola Lda", nif: "547891234", telefone: "+244 912 345 678", whatsapp: "+244 912 345 678", email: "maria@publiangola.co.ao", endereco: "Av. 4 de Fevereiro, 230 - Luanda", dataCadastro: "2024-02-20" },
  { codigo: "CAD-003", tipo: "fornecedor", nome: "Papelaria Angola", empresa: "Papelaria Angola Lda", nif: "543216548", telefone: "+244 934 567 890", whatsapp: "+244 934 567 890", email: "vendas@papelariaangola.co.ao", endereco: "Rua Comandante Gika, 89 - Luanda", dataCadastro: "2024-03-10" },
  { codigo: "CAD-004", tipo: "cliente", nome: "Ana Ferreira", empresa: "Marketing Total", nif: "546549871", telefone: "+244 945 678 901", whatsapp: "+244 945 678 901", email: "ana@marketingtotal.co.ao", endereco: "Av. Deolinda Rodrigues, 567 - Luanda", dataCadastro: "2024-04-05" },
  { codigo: "CAD-005", tipo: "fornecedor", nome: "Tintas Premium", empresa: "Tintas Premium Lda", nif: "549873214", telefone: "+244 956 789 012", whatsapp: "+244 956 789 012", email: "comercial@tintaspremium.co.ao", endereco: "Rua Rainha Ginga, 321 - Luanda", dataCadastro: "2024-05-18" },
  { codigo: "CAD-006", tipo: "fornecedor", nome: "Lonas & Vinis SA", empresa: "Lonas & Vinis SA", nif: "541112233", telefone: "+244 921 111 222", whatsapp: "+244 921 111 222", email: "vendas@lonasevinis.co.ao", endereco: "Zona Industrial, Km 15 - Luanda", dataCadastro: "2024-06-01" },
  { codigo: "CAD-007", tipo: "cliente", nome: "Pedro Neto", empresa: "Editora Nacional", nif: "542223344", telefone: "+244 932 222 333", whatsapp: "+244 932 222 333", email: "pedro@editoranacional.co.ao", endereco: "Av. 21 de Janeiro, 100 - Luanda", dataCadastro: "2024-06-15" },
];

export default function CadastrosPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [cadastros, setCadastros] = useState(sampleCadastros);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const filtered = cadastros.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nif.includes(searchTerm);
    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
    return matchSearch && matchTipo;
  });

  const totalClientes = cadastros.filter((c) => c.tipo === "cliente").length;
  const totalFornecedores = cadastros.filter((c) => c.tipo === "fornecedor").length;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const prefix = form.tipo === "cliente" ? "CLI" : "FOR";
    const newCode = `${prefix}-${String(cadastros.length + 1).padStart(3, "0")}`;
    setCadastros([{ ...form, codigo: newCode }, ...cadastros]);
    setForm(initialForm);
    setShowForm(false);
  };

  const handleDelete = (codigo) => {
    setCadastros(cadastros.filter((c) => c.codigo !== codigo));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />

        <div className="p-4 sm:p-6 md:p-8 space-y-5 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Cadastros</h1>
              <p className="text-xs text-on-surface-variant mt-1">
                {cadastros.length} registos ({totalClientes} clientes, {totalFornecedores} fornecedores)
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary text-on-primary font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs"
            >
              <Icon name="add" className="text-lg" />
              Novo Cadastro
            </button>
          </div>

          <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Cadastros", value: cadastros.length, icon: "badge", color: "text-primary" },
              { label: "Clientes", value: totalClientes, icon: "person", color: "text-primary" },
              { label: "Fornecedores", value: totalFornecedores, icon: "local_shipping", color: "text-tertiary" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-surface-container rounded-xl border border-outline-variant p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center ${kpi.color}`}>
                  <Icon name={kpi.icon} className="text-[20px]" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant">{kpi.label}</p>
                  <p className="text-lg font-bold text-on-surface">{kpi.value}</p>
                </div>
              </div>
            ))}
          </section>

          {showForm && (
            <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Cadastro" icon="person_add" size="lg">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Tipo de Cadastro *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tipo: "cliente" })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                        form.tipo === "cliente"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-outline-variant"
                      }`}
                    >
                      <Icon name="person" className="text-lg" />
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, tipo: "fornecedor" })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                        form.tipo === "fornecedor"
                          ? "border-tertiary bg-tertiary/10 text-tertiary"
                          : "border-outline-variant bg-surface-container-high text-on-surface-variant hover:border-outline-variant"
                      }`}
                    >
                      <Icon name="local_shipping" className="text-lg" />
                      Fornecedor
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Nome Completo / Razão Social *</label>
                    <input required name="nome" value={form.nome} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder={form.tipo === "cliente" ? "Ex: João Matos" : "Ex: Papelaria Angola Lda"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Empresa</label>
                    <input name="empresa" value={form.empresa} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Gráfica Expresso" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">NIF *</label>
                    <input required name="nif" value={form.nif} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: 541236987" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Telefone *</label>
                    <input required name="telefone" value={form.telefone} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: +244 923 456 789" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">WhatsApp</label>
                    <input name="whatsapp" value={form.whatsapp} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: +244 923 456 789" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: contato@email.com" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Endereço</label>
                    <input name="endereco" value={form.endereco} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" placeholder="Ex: Rua Major Kanhangulo, 145 - Luanda" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Data de Cadastro</label>
                    <input name="dataCadastro" type="date" value={form.dataCadastro} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">
                    Guardar {form.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          <section className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-outline-variant">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-2">
                  {[
                    { key: "todos", label: "Todos", icon: "badge" },
                    { key: "cliente", label: "Clientes", icon: "person" },
                    { key: "fornecedor", label: "Fornecedores", icon: "local_shipping" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFiltroTipo(f.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        filtroTipo === f.key
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <Icon name={f.icon} className="text-sm" />
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-auto">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                  <input
                    className="pl-10 pr-4 py-2 bg-surface-container-high border border-outline-variant rounded-full text-xs w-full sm:w-64 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                    placeholder="Buscar por nome, empresa, código ou NIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high/50">
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Código</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Nome</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden xl:table-cell">Empresa</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">NIF</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden xl:table-cell">Telefone</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden 2xl:table-cell">Email</th>
                    <th className="text-left px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cadastro</th>
                    <th className="text-right px-5 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.codigo} className="border-b border-outline-variant/10 hover:bg-surface-container-highest/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded text-[10px]">{item.codigo}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                          item.tipo === "cliente" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                        }`}>
                          <Icon name={item.tipo === "cliente" ? "person" : "local_shipping"} className="text-xs" />
                          {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-on-surface">{item.nome}</td>
                      <td className="px-5 py-3 text-on-surface-variant hidden xl:table-cell">{item.empresa}</td>
                      <td className="px-5 py-3 text-on-surface-variant font-mono text-xs">{item.nif}</td>
                      <td className="px-5 py-3 text-on-surface-variant hidden xl:table-cell">{item.telefone}</td>
                      <td className="px-5 py-3 text-on-surface-variant text-xs hidden 2xl:table-cell">{item.email}</td>
                      <td className="px-5 py-3 text-on-surface-variant text-xs whitespace-nowrap">
                        {new Date(item.dataCadastro).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="w-7 h-7 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors" title="Ver detalhes">
                            <Icon name="visibility" className="text-[16px] text-on-surface-variant" />
                          </button>
                          <button className="w-7 h-7 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors" title="Editar">
                            <Icon name="edit" className="text-[16px] text-on-surface-variant" />
                          </button>
                          <button onClick={() => handleDelete(item.codigo)} className="w-7 h-7 rounded-full hover:bg-error-container/10 flex items-center justify-center transition-colors" title="Eliminar">
                            <Icon name="delete" className="text-[16px] text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <Icon name="search_off" className="text-4xl text-on-surface-variant mb-2 block" />
                        <p className="text-on-surface-variant font-medium">Nenhum cadastro encontrado</p>
                        <p className="text-on-surface-variant text-xs mt-1">Tente ajustar os termos de pesquisa</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-outline-variant/20">
              {filtered.map((item) => (
                <div key={item.codigo} className="p-4 hover:bg-surface-container-highest/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-[10px]">{item.codigo}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.tipo === "cliente" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                        }`}>
                          <Icon name={item.tipo === "cliente" ? "person" : "local_shipping"} className="text-[10px]" />
                          {item.tipo === "cliente" ? "Cliente" : "Fornecedor"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-on-surface truncate">{item.nome}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{item.empresa}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                          <Icon name="call" className="text-[10px]" /> {item.telefone}
                        </span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                          <Icon name="mail" className="text-[10px]" /> {item.email}
                        </span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1 font-mono">
                          NIF: {item.nif}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button className="w-7 h-7 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors" title="Editar">
                        <Icon name="edit" className="text-[14px] text-on-surface-variant" />
                      </button>
                      <button onClick={() => handleDelete(item.codigo)} className="w-7 h-7 rounded-full hover:bg-error-container/10 flex items-center justify-center transition-colors" title="Eliminar">
                        <Icon name="delete" className="text-[14px] text-error" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <Icon name="search_off" className="text-4xl text-on-surface-variant mb-2 block" />
                  <p className="text-on-surface-variant font-medium">Nenhum cadastro encontrado</p>
                  <p className="text-on-surface-variant text-xs mt-1">Tente ajustar os termos de pesquisa</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant flex justify-between items-center text-xs text-on-surface-variant">
              <span>A mostrar {filtered.length} de {cadastros.length} cadastros</span>
              <div className="flex gap-1">
                <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium">1</button>
                <button className="px-3 py-1.5 rounded-lg hover:bg-surface-container-highest transition-colors">Próximo →</button>
              </div>
            </div>
          </section>
        </div>

        <footer className="p-6 text-center border-t border-outline-variant bg-surface-container-highest/50">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}
