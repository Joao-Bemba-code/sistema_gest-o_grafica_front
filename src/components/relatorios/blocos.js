// Registo dos blocos de cada relatório.
// padrao: true → visível na primeira visita; false → começa oculto.

export const GRUPOS = [
  { id: "indicadores", label: "Indicadores" },
  { id: "graficos", label: "Gráficos" },
  { id: "tabelas", label: "Tabelas" },
];

export const BLOCOS = {
  "comercial:resumo": [
    { id: "com.kpis", titulo: "Indicadores de faturação", grupo: "indicadores", padrao: true },
    { id: "com.fluxo", titulo: "Faturação e recebimentos", grupo: "graficos", padrao: true },
    { id: "com.top", titulo: "Top 5 clientes", grupo: "graficos", padrao: true },
    { id: "com.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  "comercial:clientes": [
    { id: "cli.kpis", titulo: "Indicadores de clientes", grupo: "indicadores", padrao: true },
    { id: "cli.distribuicoes", titulo: "Clientes por tipo e província", grupo: "graficos", padrao: true },
    { id: "cli.cadastros", titulo: "Tabela de cadastros", grupo: "tabelas", padrao: false },
    { id: "cli.qualidade", titulo: "Cadastros incompletos", grupo: "tabelas", padrao: false },
    { id: "cli.detalhado", titulo: "Relatório detalhado de clientes", grupo: "tabelas", padrao: false },
  ],
  producao: [
    { id: "prod.kpis", titulo: "Ordens por estado", grupo: "indicadores", padrao: true },
    { id: "prod.distribuicao", titulo: "Distribuição por estado", grupo: "graficos", padrao: true },
    { id: "prod.desempenho", titulo: "Desempenho por período", grupo: "graficos", padrao: true },
    { id: "prod.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  "stocks:materiais": [
    { id: "mat.kpis", titulo: "Indicadores de stock", grupo: "indicadores", padrao: true },
    { id: "mat.valor", titulo: "Valor por categoria", grupo: "graficos", padrao: true },
    { id: "mat.criticos", titulo: "Tabela de itens críticos", grupo: "tabelas", padrao: false },
    { id: "mat.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  "stocks:catalogo": [
    { id: "cat.kpis", titulo: "Indicadores do catálogo", grupo: "indicadores", padrao: true },
    { id: "cat.distribuicoes", titulo: "Grupo, família e subfamília", grupo: "graficos", padrao: true },
    { id: "cat.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  compras: [
    { id: "comp.kpis", titulo: "Indicadores de compras", grupo: "indicadores", padrao: true },
    { id: "comp.meses", titulo: "Compras por mês", grupo: "graficos", padrao: true },
    { id: "comp.estado", titulo: "Pedidos por estado", grupo: "graficos", padrao: true },
    { id: "comp.tabela", titulo: "Tabela de pedidos", grupo: "tabelas", padrao: false },
    { id: "comp.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  financeiro: [
    { id: "fin.kpis", titulo: "Indicadores financeiros", grupo: "indicadores", padrao: true },
    { id: "fin.fluxo", titulo: "Faturação e recebimentos", grupo: "graficos", padrao: true },
    { id: "fin.estado", titulo: "Documentos por estado", grupo: "graficos", padrao: true },
    { id: "fin.despesas", titulo: "Despesas da tesouraria", grupo: "graficos", padrao: false },
    { id: "fin.tabela", titulo: "Resumo mensal", grupo: "tabelas", padrao: false },
    { id: "fin.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  tesouraria: [
    { id: "tes.kpis", titulo: "Indicadores de tesouraria", grupo: "indicadores", padrao: true },
    { id: "tes.fluxo", titulo: "Entradas e saídas", grupo: "graficos", padrao: true },
    { id: "tes.contas", titulo: "Saldo por conta", grupo: "graficos", padrao: true },
    { id: "tes.tabela", titulo: "Movimentos", grupo: "tabelas", padrao: false },
    { id: "tes.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  patrimonio: [
    { id: "pat.kpis", titulo: "Indicadores de património", grupo: "indicadores", padrao: true },
    { id: "pat.categoria", titulo: "Bens por categoria", grupo: "graficos", padrao: true },
    { id: "pat.estado", titulo: "Bens por estado", grupo: "graficos", padrao: true },
    { id: "pat.tabela", titulo: "Tabela de bens", grupo: "tabelas", padrao: false },
    { id: "pat.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
  rh: [
    { id: "rh.kpis", titulo: "Indicadores de utilizadores", grupo: "indicadores", padrao: true },
    { id: "rh.perfis", titulo: "Utilizadores por perfil", grupo: "graficos", padrao: true },
    { id: "rh.estado", titulo: "Ativos e inativos", grupo: "graficos", padrao: true },
    { id: "rh.tabela", titulo: "Tabela de utilizadores", grupo: "tabelas", padrao: false },
    { id: "rh.relatorio", titulo: "Relatório do módulo", grupo: "graficos", padrao: true },
  ],
};

export function itensDe(escopo) {
  return BLOCOS[escopo] || [];
}
