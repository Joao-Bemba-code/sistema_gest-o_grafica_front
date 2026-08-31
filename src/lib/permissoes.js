import { getUsuario } from "@/services/auth";

export const MODULOS = [
  { valor: "comercial", label: "Área Comercial" },
  { valor: "producao", label: "Produção" },
  { valor: "estoque", label: "Provisionamento" },
  { valor: "maquinas", label: "Maquinária" },
  { valor: "categorias", label: "Recursos" },
  { valor: "relatorios", label: "Relatórios" },
  { valor: "configuracao", label: "Configurações" },
  { valor: "utilizadores", label: "Utilizadores" },
];

export const ACOES = [
  { valor: "ver", label: "Ver" },
  { valor: "criar", label: "Criar" },
  { valor: "editar", label: "Editar" },
  { valor: "eliminar", label: "Eliminar" },
  { valor: "aprovar", label: "Aprovar" },
];

export const PERFIS = [
  { valor: "admin", label: "Administrador" },
  { valor: "gestao", label: "Gestão" },
  { valor: "producao", label: "Produção" },
  { valor: "leitura", label: "Consulta" },
];

function perfilAdminPerm() {
  const obj = {};
  MODULOS.forEach((m) => { obj[m.valor] = {}; ACOES.forEach((a) => { obj[m.valor][a.valor] = true; }); });
  return obj;
}

const PERMISSOES_PADRAO = {
  admin: perfilAdminPerm(),
  gestao: {
    comercial: { ver: true, criar: true, editar: true, eliminar: true, aprovar: true },
    faturacao: { ver: true, criar: true, editar: true, eliminar: true, aprovar: true },
    estoque: { ver: true, criar: true, editar: true, eliminar: true, aprovar: true },
    maquinas: { ver: true, criar: true, editar: true, eliminar: true, aprovar: true },
    categorias: { ver: true, criar: true, editar: true, eliminar: true, aprovar: true },
    producao: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    relatorios: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    configuracao: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    utilizadores: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
  },
  producao: {
    producao: { ver: true, criar: true, editar: true, eliminar: false, aprovar: false },
    maquinas: { ver: false, criar: false, editar: true, eliminar: false, aprovar: false },
    comercial: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    faturacao: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    estoque: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    categorias: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    relatorios: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    configuracao: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
    utilizadores: { ver: false, criar: false, editar: false, eliminar: false, aprovar: false },
  },
  leitura: {
    comercial: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    faturacao: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    producao: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    estoque: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    maquinas: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    categorias: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    relatorios: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    configuracao: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
    utilizadores: { ver: true, criar: false, editar: false, eliminar: false, aprovar: false },
  },
};

export function permissoesDoUsuario(usuario) {
  if (!usuario) return {};
  if (usuario.perfil === "admin") return PERMISSOES_PADRAO.admin;
  if (usuario.permissoes) return usuario.permissoes;
  return PERMISSOES_PADRAO[usuario.perfil] || PERMISSOES_PADRAO.producao;
}

// Verifica se o utilizador tem permissão para acao no modulo.
export function pode(usuario, modulo, acao) {
  if (!usuario) return false;
  if (usuario.perfil === "admin") return true;
  const p = permissoesDoUsuario(usuario);
  return !!(p && p[modulo] && p[modulo][acao]);
}

// Verifica a permissão para o utilizador atualmente autenticado.
export function podeAtual(modulo, acao) {
  return pode(getUsuario(), modulo, acao);
}

export const perfilLabel = (perfil) => {
  const p = PERFIS.find((x) => x.valor === perfil);
  return p ? p.label : perfil || "—";
};
