export const grupos = {
  papel: { label: "Papéis e Mídias", icon: "description", classe: "text-blue-500 bg-blue-500/10" },
  insumo: { label: "Insumos e Consumíveis", icon: "water_drop", classe: "text-amber-500 bg-amber-500/10" },
  acabamento: { label: "Acabamento e Logística", icon: "handyman", classe: "text-purple-500 bg-purple-500/10" },
  produto: { label: "Produtos Prontos", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
  outros: { label: "Outros", icon: "category", classe: "text-muted-foreground bg-muted" },
};

export function normalizarGrupo(g) {
  return g && grupos[g] ? g : "outros";
}

export const statusCfg = {
  ok: { label: "OK", variant: "success" },
  repor: { label: "Repor", variant: "warning" },
  esgotado: { label: "Esgotado", variant: "destructive" },
};

export const unidades = ["folha", "resma", "rolo", "metro", "m²", "litro", "kg", "un", "pacote", "caixa"];
export const tiposEstoque = ["folha", "metro", "peso", "volume", "unidade"];

export const tiposCampoEspecificacao = [
  { valor: "texto", label: "Texto" },
  { valor: "area", label: "Texto longo" },
  { valor: "numero", label: "Número" },
  { valor: "selecao", label: "Lista de opções" },
];

export const camposPadraoPorGrupo = {
  papel: [
    { chave: "gramagem", rotulo: "Gramagem", tipo: "numero", unidade: "g/m²" },
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "formato", rotulo: "Formato", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
    { chave: "largura", rotulo: "Largura", tipo: "numero", unidade: "cm" },
    { chave: "altura", rotulo: "Altura", tipo: "numero", unidade: "cm" },
  ],
  insumo: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
  ],
  acabamento: [
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
  ],
  produto: [
    { chave: "descricao_tecnica", rotulo: "Descrição técnica", tipo: "area" },
  ],
  outros: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
};

export function camposDeCategoria(categoria) {
  if (categoria?.campos_especificacao && Array.isArray(categoria.campos_especificacao) && categoria.campos_especificacao.length) {
    return categoria.campos_especificacao;
  }
  return camposPadraoPorGrupo[categoria?.grupo || "outros"] || camposPadraoPorGrupo.outros;
}

const CHAVES_LEGADO = new Set(["produto", "formato", "papel", "impressao", "impressão", "acabamento"]);
const CHAVES_BONITAS = { produto: "Produto", formato: "Formato", papel: "Papel", impressao: "Impressão", impressão: "Impressão", acabamento: "Acabamento" };

export function entradasEspecificacao(espec) {
  if (!espec || typeof espec !== "object") return [];
  const keys = Object.keys(espec);
  return keys
    .filter((k) => {
      const v = espec[k];
      if (v === undefined || v === null || String(v).trim() === "") return false;
      if (CHAVES_LEGADO.has(k) && keys.includes(CHAVES_BONITAS[k])) return false;
      return true;
    })
    .map((k) => ({ rotulo: k, valor: String(espec[k]) }));
}

export const blankItem = {
  codigo: "", nome: "", nome_tecnico: "", categoria_id: "", fornecedor: "",
  unidade: "un", formato: "", gramagem: "", tipo_estoque: "unidade",
  largura: "", altura: "", controla_lote: false, percentual_quebra: "",
  estoque_min: "", estoque_max: "", ponto_ressuprimento: "", custo_unit: "", margem: "",
  descricao: "", especificidade: "", condicao_armazenagem: "", localizacao: "", especificacoes: {},
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
