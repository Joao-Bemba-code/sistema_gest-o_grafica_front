"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const initialForm = {
  nome: "",
  empresa: "",
  nif: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  dataCadastro: new Date().toISOString().split("T")[0],
};

const sampleClients = [
  { codigo: "CLI-001", nome: "João Matos", empresa: "Gráfica Expresso", nif: "541236987", telefone: "+244 923 456 789", whatsapp: "+244 923 456 789", email: "joao@graficaexpresso.co.ao", endereco: "Rua Major Kanhangulo, 145 - Luanda", dataCadastro: "2024-01-15" },
  { codigo: "CLI-002", nome: "Maria Santos", empresa: "PubliAngola Lda", nif: "547891234", telefone: "+244 912 345 678", whatsapp: "+244 912 345 678", email: "maria@publiangola.co.ao", endereco: "Av. 4 de Fevereiro, 230 - Luanda", dataCadastro: "2024-02-20" },
  { codigo: "CLI-003", nome: "Carlos Fernandes", empresa: "Impressões Rápidas", nif: "543216548", telefone: "+244 934 567 890", whatsapp: "+244 934 567 890", email: "carlos@impressoesrapidas.co.ao", endereco: "Rua Comandante Gika, 89 - Luanda", dataCadastro: "2024-03-10" },
  { codigo: "CLI-004", nome: "Ana Ferreira", empresa: "Marketing Total", nif: "546549871", telefone: "+244 945 678 901", whatsapp: "+244 945 678 901", email: "ana@marketingtotal.co.ao", endereco: "Av. Deolinda Rodrigues, 567 - Luanda", dataCadastro: "2024-04-05" },
  { codigo: "CLI-005", nome: "Pedro Neto", empresa: "Editora Nacional", nif: "549873214", telefone: "+244 956 789 012", whatsapp: "+244 956 789 012", email: "pedro@editoranacional.co.ao", endereco: "Rua Rainha Ginga, 321 - Luanda", dataCadastro: "2024-05-18" },
];

export default function ClientesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [clients, setClients] = useState(sampleClients);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nif.includes(searchTerm)
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newCode = `CLI-${String(clients.length + 1).padStart(3, "0")}`;
    setClients([{ ...form, codigo: newCode }, ...clients]);
    setForm(initialForm);
    setShowForm(false);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <TopBar />

        <div className="p-6 md:p-8 space-y-6 flex-1">
          <Breadcrumbs />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">
                Gestão de Clientes
              </h1>
              <p className="text-xs text-on-surface-variant mt-1">
                {clients.length} clientes registados no sistema
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary text-on-primary font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm text-xs"
            >
              <Icon name="person_add" className="text-lg" />
              Cadastrar Cliente
            </button>
          </div>

          {showForm && (
            <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Cliente" icon="person_add" size="2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Nome Completo *</label>
                    <input required name="nome" value={form.nome} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: João Matos" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Empresa</label>
                    <input name="empresa" value={form.empresa} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: Gráfica Expresso" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">NIF *</label>
                    <input required name="nif" value={form.nif} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: 541236987" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Telefone *</label>
                    <input required name="telefone" value={form.telefone} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: +244 923 456 789" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">WhatsApp</label>
                    <input name="whatsapp" value={form.whatsapp} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: +244 923 456 789" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: cliente@email.com" />
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Endereço</label>
                    <input name="endereco" value={form.endereco} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="Ex: Rua Major Kanhangulo, 145 - Luanda" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Data de Cadastro</label>
                    <input name="dataCadastro" type="date" value={form.dataCadastro} onChange={handleChange} className="px-3 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Guardar Cliente</button>
                </div>
              </form>
            </Modal>
          )}

          <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
            <div className="p-6 border-b border-outline-variant">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-base font-semibold text-on-surface">Clientes Registados</h2>
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                  <input
                    className="pl-10 pr-4 py-2 bg-surface-container-high border border-outline-variant rounded-full text-sm w-72 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-xs"
                    placeholder="Buscar por nome, empresa, código ou NIF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high/50">
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Código</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Nome</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Empresa</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">NIF</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Telefone</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden xl:table-cell">Email</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider hidden xl:table-cell">Endereço</th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cadastro</th>
                    <th className="text-right px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.codigo} className="border-b border-outline-variant/10 hover:bg-surface-container-highest transition-colors">
                      <td className="px-6 py-4">
                        <span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded text-xs">
                          {client.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface">{client.nome}</td>
                      <td className="px-6 py-4 text-on-surface-variant hidden md:table-cell">{client.empresa}</td>
                      <td className="px-6 py-4 text-on-surface-variant font-mono text-xs hidden lg:table-cell">{client.nif}</td>
                      <td className="px-6 py-4 text-on-surface-variant hidden lg:table-cell">{client.telefone}</td>
                      <td className="px-6 py-4 text-on-surface-variant hidden xl:table-cell">{client.email}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs max-w-[200px] truncate hidden xl:table-cell">{client.endereco}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs whitespace-nowrap">
                        {new Date(client.dataCadastro).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors">
                            <Icon name="visibility" className="text-[18px] text-on-surface-variant" />
                          </button>
                          <button className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center transition-colors">
                            <Icon name="edit" className="text-[18px] text-on-surface-variant" />
                          </button>
                          <button className="w-8 h-8 rounded-full hover:bg-error-container/10 flex items-center justify-center transition-colors">
                            <Icon name="delete" className="text-[18px] text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <Icon name="search_off" className="text-4xl text-on-surface-variant mb-2 block" />
                        <p className="text-on-surface-variant font-medium">Nenhum cliente encontrado</p>
                        <p className="text-on-surface-variant text-xs mt-1">Tente ajustar os termos de pesquisa</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-outline-variant flex justify-between items-center text-xs text-on-surface-variant">
              <span>A mostrar {filteredClients.length} de {clients.length} clientes</span>
              <div className="flex gap-1">
                <button className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium">1</button>
                <button className="px-3 py-1.5 rounded-lg hover:bg-surface-container-highest transition-colors">2</button>
                <button className="px-3 py-1.5 rounded-lg hover:bg-surface-container-highest transition-colors">Próximo →</button>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-auto p-6 text-center border-t border-outline-variant bg-surface-container-high">
          <p className="text-sm text-on-surface-variant">SIGRAF — Sistema de Gestão para Indústria Gráfica</p>
        </footer>
      </main>
    </div>
  );
}