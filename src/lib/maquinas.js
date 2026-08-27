export const estadoMaquinaOptions = [
  { valor: "operacional", label: "Operacional", classe: "text-emerald-500" },
  { valor: "manutencao", label: "Em Manutenção", classe: "text-amber-500" },
  { valor: "avariada", label: "Avariada", classe: "text-error" },
  { valor: "desativada", label: "Desativada", classe: "text-muted-foreground" },
];

export const estadoMaquinaCfg = Object.fromEntries(
  estadoMaquinaOptions.map((o) => [o.valor, o])
);

export const blankMaquina = {
  codigo: "", nome_comum: "", nome_tecnico: "", descricao: "",
  categoria_id: "", subfamilia: "", fornecedor: "", unidade: "un",

  marca: "", modelo: "", numero_serie: "", fabricante: "",
  ano_fabrico: "", numero_patrimonial: "", estado: "operacional",

  capacidade_nominal: "", capacidade_pratica: "", tempo_medio_setup: "",
  horas_disponiveis_dia: "", horas_produtivas_dia: "",
  producao_media: "", eficiencia_media: "",

  materiais_consumiveis: [],

  manutencao_tipo: "", manutencao_periodicidade: "",
  ultima_manutencao: "", proxima_manutencao: "", manutencoes: [],

  estoque_min: "", estoque_max: "", custo_unit: "", margem: "", localizacao: "",
};

export function toNumMaq(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const camposNumericosMaquina = [
  "capacidade_nominal", "capacidade_pratica", "tempo_medio_setup",
  "horas_disponiveis_dia", "horas_produtivas_dia", "producao_media",
  "eficiencia_media", "estoque_min", "estoque_max", "custo_unit", "margem",
  "ano_fabrico",
];
