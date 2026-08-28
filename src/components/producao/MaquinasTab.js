"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { ListSkeleton } from "@/components/Skeleton";
import Icon from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import MaquinaModal from "@/components/maquinas/MaquinaModal";
import { listar, remover } from "@/services/maquinas";
import { estadoMaquinaCfg, toNumMaq } from "@/lib/maquinas";

export default function MaquinasTab({ showHeader = false }) {
  const { addToast } = useToast();
  const [maquinas, setMaquinas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [eliminarItem, setEliminarItem] = useState(null);
  const [deletando, setDeletando] = useState(false);
  const [formMaq, setFormMaq] = useState({ aberto: false, id: null });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await listar();
      setMaquinas(Array.isArray(data) ? data : data?.data ?? []);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro ao carregar maquinaria", "error");
      setMaquinas([]);
    } finally { setCarregando(false); }
  }, [addToast]);

  useEffect(() => {
    const t = setTimeout(() => carregar(), 0);
    return () => clearTimeout(t);
  }, [carregar]);

  const filtrados = maquinas.filter((m) => {
    if (filtroEstado !== "todos" && m.estado !== filtroEstado) return false;
    const t = searchTerm.toLowerCase();
    if (!t) return true;
    return [m.nome_comum, m.nome_tecnico, m.codigo, m.marca, m.modelo, m.numero_patrimonial]
      .some((campo) => String(campo || "").toLowerCase().includes(t));
  });

  const confirmarEliminacao = async () => {
    if (!eliminarItem) return;
    setDeletando(true);
    try {
      await remover(eliminarItem.id);
      addToast("Máquina removida com sucesso", "success");
      await carregar();
      setEliminarItem(null);
    } catch (err) {
      addToast(err.response?.data?.erro || "Erro na operação", "error");
    } finally { setDeletando(false); }
  };

  const totalOperacionais = maquinas.filter((m) => m.estado === "operacional").length;
  const totalManutencao = maquinas.filter((m) => m.estado === "manutencao" || m.estado === "avariada").length;

  const abrirNova = () => setFormMaq({ aberto: true, id: null });
  const abrirEdicao = (m) => setFormMaq({ aberto: true, id: m.id });

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="obsidian-glass rounded-lg p-5 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-l-4 border-l-primary">
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Maquinária</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Gestão de máquinas e equipamentos // MAQ · {maquinas.length} máquinas</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={abrirNova}
              className="bg-primary/20 text-primary border border-primary/50 px-5 py-2 rounded font-mono flex items-center gap-2 hover:bg-primary/30 transition-all text-[11px] uppercase tracking-wider font-bold"
            >
              <Icon name="add" className="text-[16px]" /> Nova Máquina
            </button>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <KpiCard icon="precision_manufacturing" label="Total Máquinas" value={maquinas.length} iconVariant="primary" />
        <KpiCard icon="check_circle" label="Operacionais" value={totalOperacionais} iconVariant="success" />
        <KpiCard icon="handyman" label="Manutenção / Avaria" value={totalManutencao} iconVariant="warning" />
      </section>

      <Card>
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {["todos", "operacional", "manutencao", "avariada", "desativada"].map((f) => (
              <Button key={f} variant={filtroEstado === f ? "default" : "outline"} size="sm" onClick={() => setFiltroEstado(f)}>
                {f === "todos" ? "Todos" : estadoMaquinaCfg[f]?.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]" />
              <input
                className="pl-10 pr-4 py-2 bg-background border border-input rounded-full text-xs w-full sm:w-64 focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                placeholder="Buscar por nome, código, marca, modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={abrirNova} size="sm" className="shrink-0">
              <Icon name="add" className="text-lg" /> Nova Máquina
            </Button>
          </div>
        </div>

        {carregando && maquinas.length === 0 ? <ListSkeleton count={5} /> : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Código", "Máquina", "Marca / Modelo", "Estado", "Capacidade", "Custo (Kz)", "Localização", "Ações"].map((h) => (
                      <th key={h} className={`text-left px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider ${["Marca / Modelo", "Capacidade", "Custo (Kz)"].includes(h) ? "hidden xl:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((m) => (
                    <tr key={m.id} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3"><span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded text-[10px]">{m.codigo || "—"}</span></td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{m.nome_comum}</p>
                        <p className="text-[10px] text-muted-foreground">{m.nome_tecnico}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground hidden xl:table-cell">{[m.marca, m.modelo].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant={m.estado === "operacional" ? "success" : m.estado === "manutencao" ? "warning" : m.estado === "avariada" ? "destructive" : "secondary"} className="text-[10px]">
                          {estadoMaquinaCfg[m.estado]?.label || m.estado || "—"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground hidden xl:table-cell">{toNumMaq(m.capacidade_nominal) ? `${Number(m.capacidade_nominal).toLocaleString("pt-AO")} un/h` : "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs hidden xl:table-cell">{m.custo_unit ? Number(m.custo_unit).toLocaleString("pt-AO") : "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{m.localizacao || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(m)} title="Editar"><Icon name="edit" className="text-[16px]" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEliminarItem(m)} title="Eliminar" className="text-error hover:text-error"><Icon name="delete" className="text-[16px]" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtrados.length === 0 && (
                <div className="p-12 text-center">
                  <Icon name="precision_manufacturing" className="text-4xl text-muted-foreground mb-2 block" />
                  <p className="text-muted-foreground font-medium">Nenhuma máquina encontrada</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={abrirNova}>
                    <Icon name="add" className="text-sm" /> Registar Primeira Máquina
                  </Button>
                </div>
              )}
            </div>

            <div className="lg:hidden divide-y divide-border/20">
              {filtrados.map((m) => (
                <div key={m.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded text-[10px]">{m.codigo || "—"}</span>
                        <Badge variant={m.estado === "operacional" ? "success" : m.estado === "manutencao" ? "warning" : m.estado === "avariada" ? "destructive" : "secondary"} className="text-[10px]">
                          {estadoMaquinaCfg[m.estado]?.label || m.estado || "—"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{m.nome_comum}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.nome_tecnico}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
                        {[m.marca, m.modelo].filter(Boolean).length > 0 && <span>{[m.marca, m.modelo].filter(Boolean).join(" ")}</span>}
                        {m.localizacao && <span className="flex items-center gap-1"><Icon name="place" className="text-[10px]" /> {m.localizacao}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(m)} title="Editar"><Icon name="edit" className="text-[14px]" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEliminarItem(m)} title="Eliminar" className="text-error"><Icon name="delete" className="text-[14px]" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {filtrados.length === 0 && (
                <div className="p-12 text-center">
                  <Icon name="precision_manufacturing" className="text-4xl text-muted-foreground mb-2 block" />
                  <p className="text-muted-foreground font-medium">Nenhuma máquina encontrada</p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(eliminarItem)}
        onClose={() => setEliminarItem(null)}
        onConfirm={confirmarEliminacao}
        loading={deletando}
        title="Eliminar máquina"
        description={eliminarItem ? `Tem a certeza que deseja eliminar "${eliminarItem.nome_comum}"? Esta ação não pode ser desfeita.` : ""}
      />

      <MaquinaModal
        key={formMaq.id ?? "novo"}
        open={formMaq.aberto}
        maquinaId={formMaq.id}
        onClose={() => setFormMaq({ aberto: false, id: null })}
        onSaved={() => {
          setFormMaq({ aberto: false, id: null });
          carregar();
        }}
      />
    </div>
  );
}