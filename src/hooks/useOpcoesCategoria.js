import { useMemo } from "react";
import {
  familias,
  familiasServico,
  tiposItem,
  normalizarFamilia,
  normalizarTipoItem,
} from "@/lib/estoque";

const GRUPO_META = {
  materia_prima: { label: "Matéria-Prima", icon: "inventory" },
  artigo: { label: "Artigo / Produto", icon: "inventory_2" },
  produto_acabado: { label: "Produto Acabado", icon: "inventory_2" },
  servico: { label: "Serviço", icon: "home_repair_service" },
  servicos: { label: "Serviço", icon: "home_repair_service" },
  maquina: { label: "Maquinaria", icon: "precision_manufacturing" },
  funcionario: { label: "Funcionário", icon: "groups" },
  colaborador: { label: "Colaborador", icon: "group" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department" },
  materiais: { label: "Materiais", icon: "inventory" },
  ferramentas: { label: "Ferramentas", icon: "handyman" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing" },
  produtos_quimicos: { label: "Produtos Químicos", icon: "science" },
  pecas_sobressalentes: { label: "Peças e Sobressalentes", icon: "settings_suggest" },
  produtos_acabados: { label: "Produtos Acabados", icon: "inventory_2" },
};

export function useOpcoesCategoria(categorias = []) {
  return useMemo(() => {
    const mapaFamilias = new Map();
    Object.entries({ ...familias, ...familiasServico }).forEach(([k, cfg]) => {
      const chave = normalizarFamilia(k);
      if (!mapaFamilias.has(chave)) {
        mapaFamilias.set(chave, { value: chave, label: cfg.label, icon: cfg.icon, classe: cfg.classe });
      }
    });
    categorias.forEach((c) => {
      const chave = normalizarFamilia(c.familia);
      if (chave && !mapaFamilias.has(chave)) {
        mapaFamilias.set(chave, { value: chave, label: c.familia || chave, icon: "label", classe: "bg-surface-variant" });
      }
    });

    const mapaGrupos = new Map();
    Object.entries(tiposItem).forEach(([k, cfg]) => {
      const chave = normalizarTipoItem(k);
      const meta = GRUPO_META[chave] || {};
      if (!mapaGrupos.has(chave)) {
        mapaGrupos.set(chave, { value: chave, label: meta.label || cfg.label || chave, icon: meta.icon || "label", classe: cfg.classe });
      }
    });
    categorias.forEach((c) => {
      const chave = normalizarTipoItem(c.tipo);
      if (!chave || mapaGrupos.has(chave)) return;
      const meta = GRUPO_META[String(c.tipo).trim().toLowerCase()] || {};
      mapaGrupos.set(chave, { value: chave, label: meta.label || c.tipo || chave, icon: meta.icon || "label", classe: "bg-surface-variant" });
    });

    const dedupePorLabel = (opcoes) => {
      const mapa = new Map();
      opcoes.forEach((o) => { if (!mapa.has(o.label)) mapa.set(o.label, o); });
      return [...mapa.values()];
    };

    const familiasOpcoes = dedupePorLabel([...mapaFamilias.values()].sort((a, b) => a.label.localeCompare(b.label)));
    const gruposOpcoes = dedupePorLabel([...mapaGrupos.values()].sort((a, b) => a.label.localeCompare(b.label)));

    return { familias: familiasOpcoes, grupos: gruposOpcoes };
  }, [categorias]);
}