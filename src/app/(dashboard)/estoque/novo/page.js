"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import MaterialForm from "@/components/estoque/MaterialForm";
import useEstoque from "@/hooks/useEstoque";
import { blankItem, entradasEspecificacao, formatKz, toNum, tiposEstoque, familias, tiposItem, normalizarFamilia } from "@/lib/estoque";

function PreviewLinha({ label, valor, acento }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="cyber-label">{label}</span>
      <span className={`text-sm font-bold font-mono truncate text-right ${acento || "text-foreground"}`}>{valor || "—"}</span>
    </div>
  );
}

export default function NovoMaterialPage() {
  const router = useRouter();
  const { categorias, fornecedores, formatos, materiais, carregando, salvarMaterial } = useEstoque();
  const [form, setForm] = useState(blankItem);
  const [salvando, setSalvando] = useState(false);

  const aoSubmeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    const ok = await salvarMaterial(form, null);
    setSalvando(false);
    if (ok) router.push("/estoque");
  };

  const categoria = categorias.find((c) => String(c.id) === String(form.categoria_id));
  const catFamilia = normalizarFamilia(categoria?.familia);
  const custoTotal = toNum(form.custo_unit) * toNum(form.estoque_max);

  return (
    <div className="space-y-5">
      <div className="obsidian-glass rounded-lg p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/estoque")}
            aria-label="Voltar ao estoque"
            className="w-10 h-10 rounded bg-surface-variant border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors shrink-0"
          >
            <Icon name="arrow_back" className="text-xl" />
          </button>
          <div>
            <h1 className="font-sans text-3xl font-bold text-foreground tracking-tight">Novo Material</h1>
            <p className="text-primary mt-1 font-mono text-xs uppercase tracking-widest">Registar novo material no inventário</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/estoque")}>Cancelar</Button>
          <Button type="submit" form="form-material" loading={salvando}>
            <Icon name="save" className="text-lg" /> Guardar Material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-5">
              {carregando && categorias.length === 0 ? (
                <div className="space-y-3" aria-label="A carregar formulário">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <MaterialForm
                  formId="form-material"
                  form={form}
                  onChange={(campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))}
                  onSubmit={aoSubmeter}
                  categorias={categorias}
                  fornecedores={fornecedores}
                  materiais={materiais}
                  formatos={formatos}
                />
              )}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1 obsidian-glass cyber-border rounded-xl p-5 lg:sticky lg:top-24 space-y-4" aria-label="Pré-visualização do material">
          <div className="flex items-center justify-between">
            <p className="cyber-label flex items-center gap-1.5">
              <Icon name="visibility" className="text-sm text-primary" /> Pré-visualização
            </p>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
          </div>

          <div className="relative w-24 h-24 rounded-2xl obsidian-glass cyber-border flex items-center justify-center mx-auto">
            <Icon name={familias[catFamilia]?.icon || "category"} className="text-4xl text-primary" />
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-success flex items-center justify-center">
              <Icon name="check" className="text-sm text-on-success" />
            </span>
          </div>

          <div className="text-center">
            <p className="text-lg font-extrabold text-foreground truncate">{form.nome || "Novo Material"}</p>
            <p className="text-xs font-mono text-primary">{form.codigo || "SEM-CÓDIGO"}</p>
          </div>

          <div>
            <PreviewLinha label="Categoria" valor={categoria?.nome} />
            <PreviewLinha label="Família" valor={familias[catFamilia]?.label} />
            <PreviewLinha label="Subfamília" valor={(form.especificacoes?.subfamilia || "").trim() || categoria?.subfamilia} />
            <PreviewLinha label="Tipo" valor={tiposItem[categoria?.tipo]?.label} />
            <PreviewLinha label="Unidade" valor={form.unidade} />
            {entradasEspecificacao(form.especificacoes)
              .filter((e) => !["subfamilia", "formato", "gramagem"].includes(e.rotulo.toLowerCase().replace(/[^a-z]/g, "")))
              .map((e) => (
                <PreviewLinha key={e.rotulo} label={e.rotulo} valor={e.valor} />
              ))}
            <PreviewLinha label="Formato" valor={form.formato} />
            <PreviewLinha label="Gramagem" valor={form.gramagem ? `${form.gramagem} g/m²` : "—"} />
            <PreviewLinha label="Tipo de Estoque" valor={tiposEstoque.find((t) => t === form.tipo_estoque)} />
            <PreviewLinha label="Custo Unitário" valor={formatKz(form.custo_unit)} />
            <PreviewLinha label="Localização" valor={form.localizacao} />
            <PreviewLinha label="Valor Máx. Stock" valor={formatKz(custoTotal)} acento="text-primary" />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border/40">
            <Icon name="bolt" className="text-sm text-warning" />
            {form.controla_lote ? "Rastreabilidade por lote ativa" : "Sem controlo de lotes"}
            {" • "}
            {toNum(form.percentual_quebra) > 0 ? `Quebra ${form.percentual_quebra}%` : "Sem quebra técnica"}
          </div>
        </aside>
      </div>
    </div>
  );
}
