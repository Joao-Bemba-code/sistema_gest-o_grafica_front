import {
  LuHouse,
  LuShoppingCart,
  LuCog,
  LuBox,
  LuShoppingBag,
  LuChartColumn,
  LuLandmark,
  LuBuilding,
  LuUsers,
  LuFileText,
  LuSettings,
  LuClipboardList,
  LuUser,
} from "react-icons/lu";

// Submenus por módulo — substituem o menu principal enquanto o módulo está aberto.
export const SUBITENS_COMERCIAL = [
  { nome: "Clientes", tab: "clientes", icone: "groups" },
  { nome: "Propostas", tab: "propostas", icone: "description" },
  { nome: "Orçamentos", tab: "orcamentos", icone: "request_quote" },
  { nome: "Encomendas", tab: "pedidos", icone: "pending_actions" },
  { nome: "Facturação", tab: "vendas", icone: "receipt_long" },
  { nome: "Entregas", tab: "entregas", icone: "local_shipping" },
  { nome: "Acompanhamento", tab: "acompanhamento", icone: "history" },
];

// Itens do menu lateral (com permissão associada)
export const ITENS_NAVEGACAO = [
  { icone: LuHouse, nome: "Visão Geral", para: "/", perm: ["comercial", "ver"] },
  {
    icone: LuShoppingCart,
    nome: "Comercial",
    para: "/vendas",
    perm: ["comercial", "ver"],
    subitens: SUBITENS_COMERCIAL,
    tabPadrao: "orcamentos",
  },
  { icone: LuCog, nome: "Produção", para: "/producao", perm: ["producao", "ver"] },
  { icone: LuBox, nome: "Stocks", para: "/estoque", perm: ["estoque", "ver"] },
  { icone: LuShoppingBag, nome: "Compras", para: "/compras", perm: ["estoque", "ver"] },
  { icone: LuChartColumn, nome: "Financeiro", para: "/faturacao", perm: ["faturacao", "ver"] },
  { icone: LuLandmark, nome: "Tesouraria", para: "/tesouraria", perm: ["tesouraria", "ver"] },
  { icone: LuBuilding, nome: "Património", para: "/patrimonio", perm: ["patrimonio", "ver"] },
  { icone: LuUsers, nome: "Recursos Humanos", para: "/utilizadores", perm: ["utilizadores", "ver"] },
  { icone: LuFileText, nome: "Relatórios", para: "/relatorios", perm: ["relatorios", "ver"] },
  { icone: LuSettings, nome: "Configurações", para: "/configuracoes", perm: ["configuracao", "ver"] },
];

// Rotas extra para a busca global (páginas fora do menu principal)
export const PAGINAS_BUSCA = [
  ...ITENS_NAVEGACAO.map((i) => ({ icone: i.icone, nome: i.nome, para: i.para, perm: i.perm })),
  { icone: LuClipboardList, nome: "Orçamentos", para: "/orcamentos", perm: ["comercial", "ver"] },
  { icone: LuUser, nome: "Clientes", para: "/clientes", perm: ["comercial", "ver"] },
  { icone: LuBox, nome: "Ordens de Produção", para: "/producao/ordens", perm: ["producao", "ver"] },
  { icone: LuFileText, nome: "Design System", para: "/design-system", perm: ["configuracao", "ver"] },
];

// Melhor correspondência para o caminho atual (breadcrumb / estado ativo do menu)
export function itemAtivo(caminho, itens = ITENS_NAVEGACAO) {
  let melhor = null;
  itens.forEach((it) => {
    const casa = it.para === "/" ? caminho === "/" : caminho.startsWith(it.para);
    if (casa && (!melhor || it.para.length > melhor.para.length)) melhor = it;
  });
  return melhor;
}
