export const categoriasTipo = {
  consumiveis: { label: "Consumíveis", icon: "local_fire_department", classe: "text-orange-500 bg-orange-500/10" },
  materiais: { label: "Materiais", icon: "inventory", classe: "text-blue-500 bg-blue-500/10" },
  ferramentas: { label: "Ferramentas", icon: "handyman", classe: "text-gray-500 bg-gray-500/10" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing", classe: "text-indigo-500 bg-indigo-500/10" },
  produtos_quimicos: { label: "Produtos Químicos", icon: "science", classe: "text-yellow-600 bg-yellow-600/10" },
  pecas_sobressalentes: { label: "Peças e Sobressalentes", icon: "settings_suggest", classe: "text-cyan-500 bg-cyan-500/10" },
  servicos: { label: "Serviços", icon: "miscellaneous_services", classe: "text-violet-500 bg-violet-500/10" },
  produtos_acabados: { label: "Produtos Acabados", icon: "inventory_2", classe: "text-emerald-500 bg-emerald-500/10" },
};

export const familias = {
  papeis: { label: "Papéis", icon: "description", classe: "text-blue-500 bg-blue-500/10" },
  tintas: { label: "Tintas", icon: "water_drop", classe: "text-amber-500 bg-amber-500/10" },
  chapas: { label: "Chapas", icon: "square_foot", classe: "text-slate-500 bg-slate-500/10" },
  produto_quimico: { label: "Produto Químico", icon: "science", classe: "text-yellow-600 bg-yellow-600/10" },
  equipamentos: { label: "Equipamentos", icon: "precision_manufacturing", classe: "text-indigo-500 bg-indigo-500/10" },
  ferramentas: { label: "Ferramentas", icon: "construction", classe: "text-gray-500 bg-gray-500/10" },
  suporte_especial: { label: "Suporte Especial", icon: "view_carousel", classe: "text-pink-500 bg-pink-500/10" },
  material_acabamento: { label: "Material de Acabamento", icon: "palette", classe: "text-purple-500 bg-purple-500/10" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department", classe: "text-orange-500 bg-orange-500/10" },
};

export const tiposItem = {
  materia_prima: { label: "Matéria-Prima", classe: "text-blue-500" },
  produto_acabado: { label: "Produto Acabado", classe: "text-emerald-500" },
  servico: { label: "Serviço", classe: "text-violet-500" },
};

export function normalizarFamilia(f) {
  return f && familias[f] ? f : "papeis";
}

export const FAMILIA_PREFIXO = {
  papeis: "PAP", tintas: "TIN", chapas: "CHA", produto_quimico: "PQU",
  equipamentos: "EQU", ferramentas: "FER", suporte_especial: "SPE",
  material_acabamento: "MAC", consumiveis: "CON",
};

export function prefixoFamilia(familia) {
  return FAMILIA_PREFIXO[normalizarFamilia(familia)] || "MAT";
}

export function normalizarCategoriaTipo(t) {
  return t && categoriasTipo[t] ? t : "materiais";
}

export function normalizarTipoItem(t) {
  return t && tiposItem[t] ? t : "materia_prima";
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

export const camposPadraoPorFamilia = {
  papeis: [
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
    { chave: "largura", rotulo: "Largura", tipo: "numero", unidade: "cm" },
    { chave: "altura", rotulo: "Altura", tipo: "numero", unidade: "cm" },
  ],
  tintas: [
    { chave: "cor", rotulo: "Cor", tipo: "texto" },
    { chave: "base", rotulo: "Base", tipo: "selecao", opcoes: ["Solvente", "Aquosa", "UV", "Latex"] },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  chapas: [
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["CTP", "Film", "Digital"] },
  ],
  produto_quimico: [
    { chave: "composicao", rotulo: "Composição", tipo: "texto" },
    { chave: "perigo", rotulo: "Nível de Perigo", tipo: "selecao", opcoes: ["Baixo", "Médio", "Alto"] },
  ],
  equipamentos: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
    { chave: "modelo", rotulo: "Modelo", tipo: "texto" },
    { chave: "numero_serie", rotulo: "Nº de Série", tipo: "texto" },
  ],
  ferramentas: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
  ],
  suporte_especial: [
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
    { chave: "especificacoes", rotulo: "Especificações", tipo: "area" },
  ],
  material_acabamento: [
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Cola", "Fita", "Lona", "Vinil", "Cordão"] },
  ],
  consumiveis: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "texto" },
  ],
};

export function camposDeCategoria(categoria) {
  if (!categoria) return [];
  if (categoria.campos_especificacao && Array.isArray(categoria.campos_especificacao) && categoria.campos_especificacao.length) {
    return categoria.campos_especificacao;
  }
  return camposPadraoPorFamilia[normalizarFamilia(categoria.familia)] || [];
}

const CHAVES_LEGADO = new Set(["produto", "formato", "papel", "impressao", "impressão", "acabamento"]);
const CHAVES_BONITAS = { produto: "Produto", formato: "Formato", papel: "Papel", impressao: "Impressão", impressão: "Impressão", acabamento: "Acabamento" };

export function especificacoesObjeto(espec) {
  if (typeof espec === "string" && espec.trim()) {
    try {
      const parsed = JSON.parse(espec);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return espec && typeof espec === "object" ? espec : {};
}

export function entradasEspecificacao(espec) {
  espec = especificacoesObjeto(espec);
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
