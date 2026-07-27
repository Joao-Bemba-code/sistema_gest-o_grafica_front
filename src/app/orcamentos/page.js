"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar, { Breadcrumbs } from "@/components/TopBar";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";

const sampleOrcamentos = [
  { id: "ORC-2024-001", data: "2024-05-20", cliente: "João Matos", empresa: "Gráfica Expresso", produto: "Catálogos Institucionais", quantidade: "500 un", formato: "A4", material: "Papel Couché 150g", tipoImpressao: "Offset", acabamento: "Verniz Localizado", prazo: "5 dias", custoMaterial: 4500, custoProducao: 3200, custoDesign: 1500, custoAcabamento: 800, custoEntrega: 200, valorTotal: 15200, lucroEstimado: 5000, estado: "aprovado" },
  { id: "ORC-2024-002", data: "2024-05-21", cliente: "Maria Santos", empresa: "PubliAngola Lda", produto: "Banners Publicitários", quantidade: "10 un", formato: "1x2m", material: "Lona Front Light 440g", tipoImpressao: "Digital", acabamento: "Bordas e Ilhoses", prazo: "3 dias", custoMaterial: 2800, custoProducao: 1800, custoDesign: 0, custoAcabamento: 600, custoEntrega: 300, valorTotal: 7500, lucroEstimado: 2000, estado: "pendente" },
  { id: "ORC-2024-003", data: "2024-05-22", cliente: "Carlos Fernandes", empresa: "Impressões Rápidas", produto: "Embalagens Personalizadas", quantidade: "1000 un", formato: "20x15cm", material: "Kraft 300g", tipoImpressao: "Digital", acabamento: "Hot Stamping", prazo: "7 dias", custoMaterial: 6500, custoProducao: 4200, custoDesign: 2000, custoAcabamento: 3500, custoEntrega: 400, valorTotal: 22000, lucroEstimado: 5400, estado: "pendente" },
  { id: "ORC-2024-004", data: "2024-05-18", cliente: "Ana Ferreira", empresa: "Marketing Total", produto: "Flyers Promocionais", quantidade: "2000 un", formato: "A5", material: "Papel Offset 90g", tipoImpressao: "Offset", acabamento: "Corte e Dobra", prazo: "2 dias", custoMaterial: 1200, custoProducao: 1800, custoDesign: 500, custoAcabamento: 300, custoEntrega: 150, valorTotal: 5200, lucroEstimado: 1250, estado: "rejeitado" },
  { id: "ORC-2024-005", data: "2024-05-23", cliente: "Pedro Neto", empresa: "Editora Nacional", produto: "Revistas", quantidade: "3000 un", formato: "A4", material: "Papel Couché 115g", tipoImpressao: "Offset", acabamento: "Encadernação Revista", prazo: "10 dias", custoMaterial: 12000, custoProducao: 8500, custoDesign: 3000, custoAcabamento: 4000, custoEntrega: 600, valorTotal: 42000, lucroEstimado: 13900, estado: "aprovado" },
];

const estadoColors = {
   aprovado: { bg: "bg-primary/10", text: "text-primary", dot: "bg-green-500" },
   pendente: { bg: "bg-tertiary-container/10", text: "text-tertiary", dot: "bg-amber-500" },
   rejeitado: { bg: "bg-error-container/10", text: "text-error", dot: "bg-red-500" },
};

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState(sampleOrcamentos);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ cliente: "", empresa: "", produto: "", quantidade: "", formato: "", material: "", tipoImpressao: "", acabamento: "", prazo: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = Math.floor(Math.random() * 30000) + 5000;
    const lucro = Math.floor(total * 0.25);
    const novo = { id: `ORC-${String(orcamentos.length + 1).padStart(3, "0")}`, data: new Date().toISOString().split("T")[0], ...form, custoMaterial: 0, custoProducao: 0, custoDesign: 0, custoAcabamento: 0, custoEntrega: 0, valorTotal: total, lucroEstimado: lucro, estado: "pendente" };
    setOrcamentos([novo, ...orcamentos]);
    setForm({ cliente: "", empresa: "", produto: "", quantidade: "", formato: "", material: "", tipoImpressao: "", acabamento: "", prazo: "" });
    setModalOpen(false);
  };

  const filtered = filter === "todos" ? orcamentos : orcamentos.filter((o) => o.estado === filter);

  const totalValor = orcamentos.reduce((s, o) => s + o.valorTotal, 0);
  const totalLucro = orcamentos.reduce((s, o) => s + o.lucroEstimado, 0);
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
              <Icon name="add" className="text-lg" />
              Novo Orçamento
            </button>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
               { label: "Total Orçamentos", value: orcamentos.length, icon: "request_quote", color: "text-primary" },
               { label: "Valor Total", value: `Kz ${(totalValor / 1000).toFixed(1)}k`, icon: "paid", color: "text-tertiary" },
               { label: "Pendentes", value: pendentes, icon: "pending", color: "text-tertiary" },
               { label: "Aprovados", value: aprovados, icon: "check_circle", color: "text-primary" },
            ].map((kpi) => (
               <div key={kpi.label} className="bg-surface-container dark:bg-surface-container p-5 rounded-xl border border-outline-variant flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center ${kpi.color}`}>
                  <Icon name={kpi.icon} />
                </div>
                <div>
                   <p className="text-xs text-on-surface-variant">{kpi.label}</p>
                   <p className="text-xl font-bold text-on-surface">{kpi.value}</p>
                </div>
              </div>
            ))}
          </section>

          <div className="flex gap-2 flex-wrap">
             {["todos", "pendente", "aprovado", "rejeitado"].map((f) => (
               <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="border-b border-outline-variant bg-surface-container-high/50">
                     {["Nº", "Data", "Cliente", "Produto", "Valor Total", "Lucro", "Estado", "Ações"].map((h) => (
                       <th key={h} className={`text-left px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ${h === "Ações" ? "text-right" : ""} ${h === "Lucro" || h === "Valor Total" ? "hidden md:table-cell" : ""}`}>{h}</th>
                     ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const ec = estadoColors[o.estado];
                    return (
                       <tr key={o.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high/30 transition-colors cursor-pointer" onClick={() => setSelected(selected === o.id ? null : o.id)}>
                         <td className="px-4 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-xs">{o.id}</span></td>
                         <td className="px-4 py-3 text-xs whitespace-nowrap text-on-surface-variant">{new Date(o.data).toLocaleDateString("pt-BR")}</td>
                         <td className="px-4 py-3 font-medium text-on-surface">{o.cliente}</td>
                         <td className="px-4 py-3 text-on-surface-variant">{o.produto}</td>
                         <td className="px-4 py-3 font-bold hidden md:table-cell text-on-surface">Kz {o.valorTotal.toLocaleString("pt-AO")}</td>
                         <td className="px-4 py-3 text-primary font-bold hidden md:table-cell">Kz {o.lucroEstimado.toLocaleString("pt-AO")}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{o.estado}</span></td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                             <button title="Imprimir" className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center"><Icon name="print" className="text-[16px] text-on-surface-variant" /></button>
                             <button title="Enviar WhatsApp" className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center"><Icon name="chat" className="text-[16px] text-primary" /></button>
                             <button title="Converter em OP" className="w-8 h-8 rounded-full hover:bg-surface-container-highest flex items-center justify-center"><Icon name="conversion_path" className="text-[16px] text-primary" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selected && (() => {
            const o = orcamentos.find((x) => x.id === selected);
            if (!o) return null;
            const ec = estadoColors[o.estado];
            return (
               <section className="bg-surface-container dark:bg-surface-container rounded-xl border border-outline-variant p-6 space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <h2 className="text-base font-semibold text-on-surface flex items-center gap-2">
                     <Icon name="description" className="text-primary" />
                     Detalhes do Orçamento {o.id}
                  </h2>
                  <div className="flex gap-2 flex-wrap">
                     <button className="px-4 py-2 rounded-lg bg-surface-container-highest text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-highest transition-colors text-on-surface-variant"><Icon name="print" className="text-[16px]" /> Imprimir</button>
                     <button className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1 hover:bg-primary-container transition-all"><Icon name="chat" className="text-[16px]" /> WhatsApp</button>
                     <button className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center gap-1 hover:bg-primary-container transition-all"><Icon name="conversion_path" className="text-[16px]" /> Criar OP</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                     <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dados Gerais</h3>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between"><span className="text-on-surface-variant">Data:</span><span className="font-medium text-on-surface">{new Date(o.data).toLocaleDateString("pt-BR")}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Cliente:</span><span className="font-medium text-on-surface">{o.cliente}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Empresa:</span><span className="font-medium text-on-surface">{o.empresa}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Prazo:</span><span className="font-medium text-on-surface">{o.prazo}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Estado:</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${ec.bg} ${ec.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ec.dot}`} />{o.estado}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Especificação do Produto</h3>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between"><span className="text-on-surface-variant">Produto:</span><span className="font-medium text-on-surface">{o.produto}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Quantidade:</span><span className="font-medium text-on-surface">{o.quantidade}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Formato:</span><span className="font-medium text-on-surface">{o.formato}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Material:</span><span className="font-medium text-on-surface">{o.material}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Impressão:</span><span className="font-medium text-on-surface">{o.tipoImpressao}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Acabamento:</span><span className="font-medium text-on-surface">{o.acabamento}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                     <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Custos</h3>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between"><span className="text-on-surface-variant">Material:</span><span className="text-on-surface">Kz {o.custoMaterial.toLocaleString("pt-AO")}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Produção:</span><span className="text-on-surface">Kz {o.custoProducao.toLocaleString("pt-AO")}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Design:</span><span className="text-on-surface">Kz {o.custoDesign.toLocaleString("pt-AO")}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Acabamento:</span><span className="text-on-surface">Kz {o.custoAcabamento.toLocaleString("pt-AO")}</span></div>
                       <div className="flex justify-between"><span className="text-on-surface-variant">Entrega:</span><span className="text-on-surface">Kz {o.custoEntrega.toLocaleString("pt-AO")}</span></div>
                       <div className="border-t border-outline-variant pt-2 flex justify-between font-bold"><span>Valor Total:</span><span className="text-primary">Kz {o.valorTotal.toLocaleString("pt-AO")}</span></div>
                       <div className="flex justify-between font-bold"><span>Lucro Estimado:</span><span className="text-primary">Kz {o.lucroEstimado.toLocaleString("pt-AO")}</span></div>
                    </div>
                  </div>
                </div>
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
                 <select required name="cliente" onChange={handleChange} defaultValue="" className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                   <option value="" disabled>Seleccionar cliente...</option>
                   <option value="João Matos">João Matos</option>
                   <option value="Maria Santos">Maria Santos</option>
                   <option value="Carlos Fernandes">Carlos Fernandes</option>
                   <option value="Ana Ferreira">Ana Ferreira</option>
                   <option value="Pedro Neto">Pedro Neto</option>
                 </select>
                 <input placeholder="Empresa" name="empresa" onChange={handleChange} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
               </div>
            </div>
             <div className="space-y-3">
               <h3 className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2"><Icon name="inventory_2" className="text-sm text-primary" /> Especificação</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <input required placeholder="Produto *" name="produto" onChange={handleChange} className="sm:col-span-2 px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                 <input required placeholder="Quantidade *" name="quantidade" onChange={handleChange} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                 <input placeholder="Formato" name="formato" onChange={handleChange} className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                 <select name="material" onChange={handleChange} defaultValue="" className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                   <option value="" disabled>Material</option>
                   <option>Papel Couché 150g</option><option>Papel Offset 90g</option><option>Lona Front Light</option>
                 </select>
                 <select name="tipoImpressao" onChange={handleChange} defaultValue="" className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                   <option value="" disabled>Tipo Impressão</option>
                   <option>Offset</option><option>Digital</option>
                 </select>
                 <select name="acabamento" onChange={handleChange} defaultValue="" className="px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                   <option value="" disabled>Acabamento</option>
                   <option>Corte e Dobra</option><option>Verniz</option><option>Encadernação</option>
                 </select>
               </div>
               <input required type="date" name="prazo" onChange={handleChange} className="w-full px-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
             </div>
             <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors">Cancelar</button>
               <button type="submit" className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">Criar Orçamento</button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
