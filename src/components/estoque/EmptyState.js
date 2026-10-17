"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";

const passos = [
  {
    n: 1,
    icon: "category",
    titulo: "Crie uma categoria",
    desc: "Organize os materiais por tipo (papel, insumo, acabamento, produto).",
    href: "/configuracoes",
    acao: "Ir para Configurações",
    checado: (d) => d.categorias.length > 0,
  },
  {
    n: 2,
    icon: "storefront",
    titulo: "Cadastre um fornecedor",
    desc: "Associe cada material ao seu fornecedor habitual para controlar entradas.",
    href: "/configuracoes",
    acao: "Ir para Configurações",
    checado: (d) => d.fornecedores.length > 0,
  },
  {
    n: 3,
    icon: "add_box",
    titulo: "Registe o primeiro material",
    desc: "Dê entrada na matéria-prima e comece a controlar o seu stock.",
    href: "/estoque/novo",
    acao: "Cadastrar material",
    checado: (d) => d.temMateriais,
  },
];

export default function EmptyState({ categorias = [], fornecedores = [], temMateriais = false }) {
  const dados = { categorias, fornecedores, temMateriais };
  const concluidos = passos.filter((p) => p.checado(dados)).length;

  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-center sm:p-12">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/50">
        <Icon name="inventory_2" className="text-lg text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Vamos montar o seu estoque
      </h2>
      <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
        Siga estes três passos rápidos e em poucos minutos terá o controlo total da sua matéria-prima.
      </p>
      <p className="mt-4 text-[11px] font-medium text-primary">
        {concluidos}/3 passos concluídos
      </p>

      <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
        {passos.map((p, i) => {
          const feito = p.checado(dados);
          return (
            <li
              key={p.n}
              className={`rounded-xl border p-5 transition-colors ${feito ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border"}`}
              style={{ "--stagger": `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${feito ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {feito ? <Icon name="check" className="text-base" /> : p.n}
                </span>
                <Icon name={p.icon} className={`text-lg ${feito ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{p.titulo}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              <div className="mt-4">
                {feito ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                    <Icon name="task_alt" className="text-sm" /> Concluído
                  </span>
                ) : (
                  <Link href={p.href}>
                    <Button size="sm" className="w-full">
                      {p.acao}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
