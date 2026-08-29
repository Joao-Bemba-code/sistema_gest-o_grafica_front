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
  ferramentas: { label: "Ferramentas", icon: "construction", classe: "text-gray-500 bg-gray-500/10" },
  suporte_especial: { label: "Suporte Especial", icon: "view_carousel", classe: "text-pink-500 bg-pink-500/10" },
  material_acabamento: { label: "Material de Acabamento", icon: "palette", classe: "text-purple-500 bg-purple-500/10" },
  consumiveis: { label: "Consumíveis", icon: "local_fire_department", classe: "text-orange-500 bg-orange-500/10" },
};

export const familiasServico = {
  impressao: { label: "Impressão", icon: "print", classe: "text-blue-500 bg-blue-500/10" },
  acabamento: { label: "Acabamento", icon: "palette", classe: "text-purple-500 bg-purple-500/10" },
  pre_impressao: { label: "Pré-Impressão", icon: "settings", classe: "text-amber-500 bg-amber-500/10" },
  design: { label: "Design / Arte", icon: "brush", classe: "text-pink-500 bg-pink-500/10" },
  montagem: { label: "Montagem", icon: "build", classe: "text-indigo-500 bg-indigo-500/10" },
  logistica: { label: "Logística / Entrega", icon: "local_shipping", classe: "text-emerald-500 bg-emerald-500/10" },
  consultoria: { label: "Consultoria", icon: "support_agent", classe: "text-cyan-500 bg-cyan-500/10" },
  manutencao: { label: "Manutenção", icon: "handyman", classe: "text-orange-500 bg-orange-500/10" },
  servicos_gerais: { label: "Serviços Gerais", icon: "home_repair_service", classe: "text-gray-500 bg-gray-500/10" },
};

export const tiposItem = {
  materia_prima: { label: "Matéria-Prima", classe: "text-blue-500" },
  artigo: { label: "Artigo / Produto", classe: "text-emerald-500" },
  produto_acabado: { label: "Produto Acabado", classe: "text-emerald-500" },
  servico: { label: "Serviço", classe: "text-violet-500" },
  servicos: { label: "Serviço", classe: "text-violet-500" },
  maquina: { label: "Maquinaria", classe: "text-slate-500" },
  funcionario: { label: "Funcionário", classe: "text-amber-500" },
  colaborador: { label: "Colaborador", classe: "text-cyan-500" },
};

export const tipoRecursoOptions = [
  { valor: "servico", label: "Serviço" },
  { valor: "artigo", label: "Artigo / Produto" },
  { valor: "maquina", label: "Maquinaria" },
  { valor: "funcionario", label: "Funcionário" },
  { valor: "colaborador", label: "Colaborador" },
];

export function normalizarFamilia(f) {
  if (f && familias[f]) return f;
  if (f && familiasServico[f]) return f;
  return f || "";
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
  if (!t) return "materia_prima";
  const v = String(t).trim();
  if (tiposItem[v]) return v;
  if (v === "servicos") return "servico";
  if (v === "materia_prima" || v === "produto_acabado") return v;
  return "materia_prima";
}

export function normalizarUnidade(u) {
  return typeof u === "string" && u.trim() ? u.trim().toLowerCase() : "";
}

export const camposPadraoPorUnidade = {
  folha: [
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "tipo", rotulo: "Tipo de Papel", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
  ],
  resma: [
    { chave: "folhas_por_resma", rotulo: "Folhas por Resma", tipo: "numero" },
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "tipo", rotulo: "Tipo de Papel", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
  ],
  rolo: [
    { chave: "largura", rotulo: "Largura do Rolo", tipo: "numero", unidade: "mm" },
    { chave: "comprimento", rotulo: "Comprimento", tipo: "numero", unidade: "mm" },
  ],
  metro: [
    { chave: "largura", rotulo: "Largura (bobina/fita)", tipo: "numero", unidade: "mm" },
  ],
  "m²": [
    { chave: "tipo", rotulo: "Tipo de Material", tipo: "selecao", opcoes: ["Lona", "Vinil", "Adesivo", "Tela"] },
  ],
  litro: [
    { chave: "cor", rotulo: "Cor", tipo: "texto" },
    { chave: "base", rotulo: "Base", tipo: "selecao", opcoes: ["Solvente", "Aquosa", "UV", "Latex"] },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  kg: [
    { chave: "cor", rotulo: "Cor", tipo: "texto" },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  un: [
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
    { chave: "modelo", rotulo: "Modelo", tipo: "texto" },
  ],
  pacote: [
    { chave: "conteudo", rotulo: "Conteúdo do Pacote", tipo: "texto" },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  caixa: [
    { chave: "conteudo", rotulo: "Conteúdo da Caixa", tipo: "texto" },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
};

export const statusCfg = {
  ok: { label: "OK", variant: "success" },
  repor: { label: "Repor", variant: "warning" },
  esgotado: { label: "Esgotado", variant: "destructive" },
  imobilizado: { label: "Sem stock", variant: "outline" },
};

export const unidades = ["folha", "resma", "rolo", "metro", "m²", "litro", "kg", "un", "pacote", "caixa", "ml", "g", "mg"];

export const unidadesPorFamilia = {
  papeis: ["folha", "resma", "rolo", "metro", "m²", "kg", "un", "pacote", "caixa"],
  tintas: ["litro", "ml", "kg", "g", "mg", "un", "caixa"],
  chapas: ["folha", "metro", "m²", "kg", "un", "caixa"],
  produto_quimico: ["litro", "ml", "kg", "g", "mg", "un", "caixa"],
  equipamentos: ["un", "caixa"],
  ferramentas: ["un", "caixa", "pacote"],
  suporte_especial: ["folha", "rolo", "metro", "m²", "kg", "un"],
  material_acabamento: ["folha", "rolo", "metro", "m²", "kg", "un", "caixa", "pacote"],
  consumiveis: ["un", "caixa", "pacote", "folha"],
};

export function unidadesParaFamilia(familia) {
  const fam = normalizarFamilia(familia);
  return unidadesPorFamilia[fam] || unidades;
}
export const tiposEstoque = ["folha", "metro", "peso", "volume", "unidade"];

export const formatoPadraoMM = {
  A0: { largura: 841, altura: 1189 },
  A1: { largura: 594, altura: 841 },
  A2: { largura: 420, altura: 594 },
  A3: { largura: 297, altura: 420 },
  A4: { largura: 210, altura: 297 },
  A5: { largura: 148, altura: 210 },
  A6: { largura: 105, altura: 148 },
  A7: { largura: 74, altura: 105 },
  A8: { largura: 52, altura: 74 },
  A9: { largura: 37, altura: 52 },
  A10: { largura: 26, altura: 37 },
  B4: { largura: 250, altura: 353 },
  B5: { largura: 176, altura: 250 },
  "66x96": { largura: 660, altura: 960 },
  "70x100": { largura: 700, altura: 1000 },
  "76x112": { largura: 760, altura: 1120 },
  "64x90": { largura: 640, altura: 900 },
};

export function dimensaoPadrao(formato, largura, altura) {
  const l = Number(largura);
  const a = Number(altura);
  if (l > 0 && a > 0) return { largura: l, altura: a };
  if (!formato) return null;
  const normalizado = String(formato).toLowerCase().replace(/\s/g, "");
  const chave = Object.keys(formatoPadraoMM).find(
    (k) => k.toLowerCase().replace(/\s/g, "") === normalizado
  );
  return chave ? { ...formatoPadraoMM[chave] } : null;
}

export function encaixeGuilhotina(folhaL, folhaA, pecaL, pecaA) {
  const fl = Number(folhaL);
  const fa = Number(folhaA);
  const pl = Number(pecaL);
  const pa = Number(pecaA);
  if (!(fl > 0 && fa > 0 && pl > 0 && pa > 0)) return null;
  if (pl > fl || pa > fa) return null;
  const orientacoes = [
    [Math.floor(fl / pl) * Math.floor(fa / pa), pl, pa],
    [Math.floor(fl / pa) * Math.floor(fa / pl), pa, pl],
  ];
  orientacoes.sort((a, b) => b[0] - a[0]);
  const [pecas, pl_uso, pa_uso] = orientacoes[0];
  if (pecas <= 0) return null;
  return {
    pecas_por_folha: pecas,
    largura_uso: pl_uso,
    altura_uso: pa_uso,
    folhas_por_1000: Math.ceil(1000 / pecas),
  };
}

export function dimensoesFolhaMaterial(m) {
  if (!m) return null;
  const esp = especificacoesObjeto(m?.especificacoes);
  const mmL = Number(m?.largura_mm) || Number(m?.largura) || Number(esp.largura) || 0;
  const mmA = Number(m?.altura_mm) || Number(m?.altura) || Number(esp.altura) || 0;
  const dims = dimensaoPadrao(m?.formato, mmL, mmA);
  if (dims) return { largura: dims.largura, altura: dims.altura };
  return null;
}

export function dimensoesFormatoFinal(formato, largura, altura) {
  if (formato) {
    const dims = dimensaoPadrao(formato, 0, 0);
    if (dims) return dims;
  }
  const l = Number(largura);
  const a = Number(altura);
  if (l > 0 && a > 0) return { largura: l, altura: a };
  return null;
}

export function calcCustoParcialFolha(m, formatoFinal, larguraFinal, alturaFinal) {
  const folhaDims = dimensoesFolhaMaterial(m);
  const pecaDims = dimensoesFormatoFinal(formatoFinal, larguraFinal, alturaFinal);
  if (!folhaDims || !pecaDims) return null;
  const encaixe = encaixeGuilhotina(folhaDims.largura, folhaDims.altura, pecaDims.largura, pecaDims.altura);
  if (!encaixe || encaixe.pecas_por_folha <= 1) return null;
  const precoFolha = Number(m.preco_venda) || Number(m.custo_unit) || 0;
  const precoPeca = precoFolha / encaixe.pecas_por_folha;
  return {
    ...encaixe,
    preco_folha: Number(precoFolha.toFixed(2)),
    preco_peca: Number(precoPeca.toFixed(4)),
    formato_original: m.formato || "",
  };
}

export const tiposCampoEspecificacao = [
  { valor: "texto", label: "Texto" },
  { valor: "area", label: "Texto longo" },
  { valor: "numero", label: "Número" },
  { valor: "selecao", label: "Lista de opções" },
  { valor: "data", label: "Data" },
];

export const camposPadraoPorFamilia = {
  papeis: [
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
    { chave: "largura", rotulo: "Largura", tipo: "numero", unidade: "mm" },
    { chave: "altura", rotulo: "Altura", tipo: "numero", unidade: "mm" },
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
    { chave: "data_validade", rotulo: "Data de Validade", tipo: "data" },
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

const CHAVES_DEDICADAS = new Set(["formato", "gramagem"]);

export function camposDeCategoria(categoria, unidade) {
  if (!categoria) return [];
  const porChave = new Map();
  for (const c of camposPadraoPorUnidade[normalizarUnidade(unidade)] || []) {
    porChave.set(c.chave, c);
  }
  for (const c of camposPadraoPorFamilia[normalizarFamilia(categoria.familia)] || []) {
    if (!porChave.has(c.chave)) porChave.set(c.chave, c);
  }
  const personalizadas = Array.isArray(categoria.campos_especificacao) ? categoria.campos_especificacao : [];
  for (const c of personalizadas) {
    if (!c || !c.chave || CHAVES_DEDICADAS.has(c.chave)) continue;
    porChave.set(c.chave, c);
  }
  return [...porChave.values()];
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

const ROTULOS_ESPEC = {
  subfamilia: "Subfamília",
  composicao: "Composição",
  perigo: "Nível de Perigo",
  data_validade: "Data de Validade",
  cor: "Cor",
  tipo: "Tipo",
  folhas_por_resma: "Folhas por Resma",
  largura: "Largura",
  comprimento: "Comprimento",
  marca: "Marca",
  modelo: "Modelo",
  conteudo: "Conteúdo",
};

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
    .map((k) => ({ rotulo: ROTULOS_ESPEC[k] || k, valor: String(espec[k]) }));
}

export const blankItem = {
  codigo: "", nome: "", nome_tecnico: "", categoria_id: "", fornecedor: "",
  unidade: "un", formato: "", gramagem: "", tipo_estoque: "unidade",
  largura: "", altura: "", controla_lote: false, percentual_quebra: "",
  estoque_min: "", estoque_max: "", ponto_ressuprimento: "", custo_unit: "", lucro: "",
  descricao: "", especificidade: "", condicao_armazenagem: "", localizacao: "", especificacoes: {},
};

export function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function ehEquipamento(categoria) {
  if (!categoria) return false;
  const tipo = String(categoria.tipo || "").toLowerCase();
  const familia = String(categoria.familia || "").toLowerCase();
  return tipo === "equipamentos" || familia === "equipamentos";
}

export function moverEstoqueDe(categoria) {
  return ehEquipamento(categoria) ? false : true;
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
  if (item.mover_estoque === false) return "imobilizado";
  const disp = toNum(item.estoque_disponivel);
  if (disp <= 0) return "esgotado";
  const ponto = toNum(item.ponto_ressuprimento) || toNum(item.estoque_min);
  if (ponto > 0 && disp < ponto) return "repor";
  return "ok";
}

export const inputCls =
  "w-full px-3 py-2.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all";
