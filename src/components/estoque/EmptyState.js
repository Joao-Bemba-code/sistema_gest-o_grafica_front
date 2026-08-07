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
    <section className="obsidian-glass rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto animate-scale-in">
      <div className="mx-auto w-20 h-20 rounded-3xl icon-chip flex items-center justify-center mb-5">
        <Icon name="inventory_2" className="text-4xl text-primary" />
      </div>
      <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
        Vamos montar o seu estoque
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Siga estes três passos rápidos e em poucos minutos terá o controlo total da sua matéria-prima.
      </p>
      <p className="text-[11px] font-mono font-bold text-primary mt-4 uppercase tracking-widest">
        {concluidos}/3 passos concluídos
      </p>

      <ol className="grid gap-4 sm:grid-cols-3 text-left mt-8">
        {passos.map((p, i) => {
          const feito = p.checado(dados);
          return (
            <li
              key={p.n}
              className={`relative rounded-2xl border p-5 transition-all duration-300 ${feito ? "border-primary/30 bg-primary/5" : "border-outline-variant/30 bg-card/60 hover:shadow-lg"}`}
              style={{ "--stagger": `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold ${feito ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}>
                  {feito ? <Icon name="check" className="text-lg" /> : p.n}
                </span>
                <Icon name={p.icon} className={`text-2xl ${feito ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <h3 className="mt-4 text-sm font-extrabold text-foreground">{p.titulo}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              <div className="mt-4">
                {feito ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-primary uppercase tracking-widest">
                    <Icon name="task_alt" className="text-base" /> Concluído
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
