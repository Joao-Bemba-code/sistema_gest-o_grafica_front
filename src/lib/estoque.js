export const grupos = {
  papel: { label: "Papéis e Mídias", icon: "description", classe: "text-blue-500 bg-blue-500/10" },
  insumo: { label: "Insumos e Consumíveis", icon: "water_drop", classe: "text-amber-500 bg-amber-500/10" },
  acabamento: { label: "Acabamento e Logística", icon: "handyman", classe: "text-purple-500 bg-purple-500/10" },
  produto: { label: "Produtos Prontos", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  outros: { label: "Outros", icon: "category", classe: "text-muted-foreground bg-muted" },
};

export const statusCfg = {
  ok: { label: "OK", variant: "success" },
  repor: { label: "Repor", variant: "warning" },
  esgotado: { label: "Esgotado", variant: "destructive" },
};

export const unidades = ["folha", "resma", "rolo", "metro", "m²", "litro", "kg", "un", "pacote", "caixa"];
export const tiposEstoque = ["folha", "metro", "peso", "volume", "unidade"];

export const blankItem = {
  codigo: "", nome: "", nome_tecnico: "", categoria_id: "", fornecedor: "",
  unidade: "un", formato: "", gramagem: "", tipo_estoque: "unidade",
  largura: "", altura: "", controla_lote: false, percentual_quebra: "",
  estoque_min: "", estoque_max: "", ponto_ressuprimento: "", custo_unit: "", margem: "",
  descricao: "", especificidade: "", condicao_armazenagem: "",
};

export function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatKz(v) {
  return `Kz ${Number(v || 0).toLocaleString("pt-AO")}`;
}

export function formatHora(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

export function statusDe(item) {
  const disp = toNum(item.estoque_disponivel);
  if (disp <= 0) return "esgotado";
  const ponto = toNum(item.ponto_ressuprimento) || toNum(item.estoque_min);
  if (ponto > 0 && disp < ponto) return "repor";
  return "ok";
}

export const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all";
