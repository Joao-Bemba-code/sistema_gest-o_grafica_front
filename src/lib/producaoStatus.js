// Situação operacional de uma ordem de produção.
//
// O estado guardado na BD (`estado`) só diz em que fase do ciclo de vida a OP
// está. A verdade sobre "pode ou não avançar" está no par
// `estado` + `requisicao_estado` + reservas de material. Antes essa regra
// estava repetida em 4 ficheiros com condições ligeiramente diferentes, o que
// fazia a mesma OP aparecer como "Aguardando" num ecrã e bloqueada noutro.
//
// Fonte da verdade: `podeAvancar` no backend (ProducaoController) — uma OP com
// reservas de material fica parada até `requisicao_estado === "libertada"`.

export const ESTADO_OP = {
  aguardando: { label: "Aguardando", variant: "warning" },
  em_producao: { label: "Em Produção", variant: "info" },
  finalizado: { label: "Finalizado", variant: "success" },
  entregue: { label: "Entregue", variant: "secondary" },
};

// Situações do material. A ordem de arranque é a prioridade de exibição.
export const SITUACAO_MATERIAL = {
  sem_material: { label: "Sem material", variant: "secondary", bloqueia: false },
  aguardando_requisicao: { label: "Aguardando requisição de material", variant: "destructive", bloqueia: true },
  aguardando_liberacao: { label: "Aguardando libertação de material", variant: "warning", bloqueia: true },
  material_liberado: { label: "Material libertado", variant: "success", bloqueia: false },
};

export function temReservas(op) {
  return Array.isArray(op?.reserva_estoques) && op.reserva_estoques.length > 0;
}

export function emCurso(op) {
  const estado = op?.estado || op?.status || "aguardando";
  return estado === "aguardando" || estado === "em_producao";
}

// Situacao do material da OP. Só tem valor enquanto a OP está em curso.
export function situacaoMaterial(op) {
  if (!emCurso(op)) return null;
  if (!temReservas(op)) return SITUACAO_MATERIAL.sem_material;
  const req = op.requisicao_estado || "pendente";
  if (req === "libertada") return SITUACAO_MATERIAL.material_liberado;
  if (req === "requisitada") return SITUACAO_MATERIAL.aguardando_liberacao;
  return SITUACAO_MATERIAL.aguardando_requisicao;
}

// Bloqueia a OP? É o espelho de `podeAvancar` no backend.
export function bloqueadaPorMaterial(op) {
  const s = situacaoMaterial(op);
  return !!(s && s.bloqueia);
}

// Rótulo principal a mostrar no cabeçalho da OP. Uma OP parada à espera de
// material tem de dizer isso — e não o genérico "Aguardando", que não diz nada.
export function situacaoOP(op) {
  const mat = situacaoMaterial(op);
  if (mat && mat.bloqueia) return mat;
  return ESTADO_OP[op?.estado || op?.status || "aguardando"] || ESTADO_OP.aguardando;
}

export const ordemSituacoes = Object.keys(SITUACAO_MATERIAL);
