const path = require("path");
const fs = require("fs");

const DIR_DADOS = process.env.SIGRAF_DADOS || __dirname;
process.env.Lang = "sqlite";
process.env.Sqlite_File = path.join(DIR_DADOS, "sgg.sqlite");

const {
  sequelize,
  Organizacao,
  Categoria,
  Material,
  MovimentoEstoque,
  Fornecedor,
  Cliente,
  Orcamento,
  OrcamentoItem,
} = require(path.join(__dirname, "..", "backend", "models"));

const CAMPOS_POR_CATEGORIA = {
  Papel: [
    { chave: "gramagem", rotulo: "Gramagem", tipo: "numero", unidade: "g/m²" },
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Branco", "Creme", "Off-white", "Colorido"] },
    { chave: "formato", rotulo: "Formato", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Couché", "Offset", "Autocopiativo", "Cartolina", "Etiqueta"] },
  ],
  Tintas: [
    { chave: "cor", rotulo: "Cor", tipo: "selecao", opcoes: ["Preto", "Ciano", "Magenta", "Amarelo", "Pantone"] },
    { chave: "base", rotulo: "Base", tipo: "selecao", opcoes: ["Água", "Solvente", "Óleo"] },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  Lonas: [
    { chave: "gramagem", rotulo: "Gramagem", tipo: "numero", unidade: "g/m²" },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Frontlit", "Backlit", "Mesh"] },
    { chave: "marca", rotulo: "Marca", tipo: "texto" },
  ],
  Vinil: [
    { chave: "espessura", rotulo: "Espessura", tipo: "numero", unidade: "µ" },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["Auto-adesivo", "Impressão", "Monomérico"] },
  ],
  Cola: [
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["PU", "Hidrossolúvel", "Instantânea"] },
    { chave: "secagem", rotulo: "Secagem", tipo: "texto" },
  ],
  Chapas: [
    { chave: "formato", rotulo: "Formato", tipo: "texto" },
    { chave: "tipo", rotulo: "Tipo", tipo: "selecao", opcoes: ["PS", "CTP", "Aglomerada"] },
  ],
};

const MATERIAIS = [
  { nome: "Papel Couché 150g", codigo: "PAP-001", categoria: "Papel", unidade: "resma", tipo_estoque: "unidade", quantidade: 120, estoque_min: 20, estoque_max: 200, ponto_ressuprimento: 40, custo_unit: 8500, margem: 30, especificacoes: { gramagem: 150, cor: "Branco", formato: "70x100", tipo: "Couché" } },
  { nome: "Papel Couché 250g", codigo: "PAP-002", categoria: "Papel", unidade: "resma", tipo_estoque: "unidade", quantidade: 65, estoque_min: 15, estoque_max: 120, ponto_ressuprimento: 30, custo_unit: 12300, margem: 30, especificacoes: { gramagem: 250, cor: "Branco", formato: "70x100", tipo: "Couché" } },
  { nome: "Papel Offset 80g", codigo: "PAP-003", categoria: "Papel", unidade: "resma", tipo_estoque: "unidade", quantidade: 20, estoque_min: 20, estoque_max: 150, ponto_ressuprimento: 30, custo_unit: 4200, margem: 25, especificacoes: { gramagem: 80, cor: "Branco", formato: "A4", tipo: "Offset" } },
  { nome: "Tinta Preto Offset", codigo: "TIN-001", categoria: "Tintas", unidade: "kg", tipo_estoque: "peso", quantidade: 50, estoque_min: 10, estoque_max: 100, ponto_ressuprimento: 20, custo_unit: 9800, margem: 40, especificacoes: { cor: "Preto", base: "Óleo", marca: "Huber Group" } },
  { nome: "Tinta Cyan Couché", codigo: "TIN-002", categoria: "Tintas", unidade: "kg", tipo_estoque: "peso", quantidade: 18, estoque_min: 10, estoque_max: 80, ponto_ressuprimento: 15, custo_unit: 12400, margem: 40, especificacoes: { cor: "Ciano", base: "Óleo", marca: "Huber Group" } },
  { nome: "Lona Frontlit 440g", codigo: "LON-001", categoria: "Lonas", unidade: "m²", tipo_estoque: "metro", quantidade: 300, estoque_min: 50, estoque_max: 600, ponto_ressuprimento: 100, custo_unit: 2100, margem: 35, especificacoes: { gramagem: 440, tipo: "Frontlit", marca: "Sihl" } },
  { nome: "Lona Backlit 240g", codigo: "LON-002", categoria: "Lonas", unidade: "m²", tipo_estoque: "metro", quantidade: 140, estoque_min: 40, estoque_max: 400, ponto_ressuprimento: 80, custo_unit: 1750, margem: 35, especificacoes: { gramagem: 240, tipo: "Backlit", marca: "Sihl" } },
  { nome: "Vinil Auto-Adesivo 100µ", codigo: "VIN-001", categoria: "Vinil", unidade: "m²", tipo_estoque: "metro", quantidade: 220, estoque_min: 30, estoque_max: 400, ponto_ressuprimento: 60, custo_unit: 1650, margem: 40, especificacoes: { espessura: 100, tipo: "Auto-adesivo" } },
  { nome: "Vinil Impressão 80µ", codigo: "VIN-002", categoria: "Vinil", unidade: "m²", tipo_estoque: "metro", quantidade: 95, estoque_min: 30, estoque_max: 350, ponto_ressuprimento: 50, custo_unit: 980, margem: 40, especificacoes: { espessura: 80, tipo: "Impressão" } },
  { nome: "Cola PU Líquida", codigo: "COL-001", categoria: "Cola", unidade: "litro", tipo_estoque: "volume", quantidade: 0, estoque_min: 10, estoque_max: 80, ponto_ressuprimento: 20, custo_unit: 7600, margem: 45, especificacoes: { tipo: "PU", secagem: "10 min" } },
  { nome: "Cola Instantânea Cianoacrilato", codigo: "COL-002", categoria: "Cola", unidade: "un", tipo_estoque: "unidade", quantidade: 32, estoque_min: 8, estoque_max: 60, ponto_ressuprimento: 15, custo_unit: 2400, margem: 45, especificacoes: { tipo: "Instantânea", secagem: "5 s" } },
  { nome: "Chapa PS 1030x790", codigo: "CHA-001", categoria: "Chapas", unidade: "un", tipo_estoque: "unidade", quantidade: 40, estoque_min: 10, estoque_max: 80, ponto_ressuprimento: 20, custo_unit: 3450, margem: 20, especificacoes: { formato: "1030x790", tipo: "PS" } },
];

const FORNECEDORES = ["Papelaria Angola Lda", "Distribuidora Sintra", "Tintas e Cia"];

async function main() {
  try {
    await sequelize.sync();
    const org = await Organizacao.findOne();
    if (!org) {
      console.log("Sem organização. Abre o SIGRAF uma vez (login) e volta a correr este script.");
      return;
    }

    const totalMateriais = await Material.count();
    const jaSemeado = await Material.count({ where: { codigo: "PAP-001" } });
    if (jaSemeado > 0) {
      console.log("Dados de demonstração já semeados — nada a fazer.");
      return;
    }
    if (totalMateriais > 0) {
      console.log(`Existem ${totalMateriais} materiais criados manualmente — vou adicionar os dados de demonstração ao lado.`);
    }

    const cats = {};
    for (const c of await Categoria.findAll()) cats[c.nome] = c;

    for (const [nome, campos] of Object.entries(CAMPOS_POR_CATEGORIA)) {
      const c = cats[nome];
      if (c && (!c.campos_especificacao || c.campos_especificacao.length === 0)) {
        await c.update({ campos_especificacao: campos });
        console.log("Campos definidos para:", nome);
      }
    }

    for (const f of FORNECEDORES) {
      await Fornecedor.create({ organizacao_id: org.id, nome: f });
    }

    let clienteExemplo = await Cliente.findOne();
    if (!clienteExemplo) {
      clienteExemplo = await Cliente.create({
        organizacao_id: org.id,
        nome: "Cliente Exemplo",
        empresa: "Empresa Exemplo Lda",
        nif: "5400000000",
        telefone: "+244 911 111 111",
        email: "cliente@exemplo.com",
        tipo: "cliente",
      });
    }
    const clientes = await Cliente.findAll();
    const extras = [
      { nome: "Gráfica Kibuia", empresa: "Kibuia Publicidade", nif: "5410000000", telefone: "+244 912 222 222", email: "geral@kibuia.co.ao", tipo: "cliente" },
      { nome: "Supermercado Nova Vida", empresa: "Nova Vida SA", nif: "5420000000", telefone: "+244 913 333 333", email: "compras@novavida.co.ao", tipo: "cliente" },
    ];
    for (const e of extras) {
      if (!clientes.some((c) => c.nif === e.nif)) await Cliente.create({ organizacao_id: org.id, ...e });
    }

    const materiaisCriados = [];
    for (const m of MATERIAIS) {
      const cat = cats[m.categoria];
      const material = await Material.create({
        organizacao_id: org.id,
        categoria_id: cat ? cat.id : null,
        codigo: m.codigo,
        nome: m.nome,
        unidade: m.unidade,
        tipo_estoque: m.tipo_estoque,
        quantidade: m.quantidade,
        estoque_reservado: 0,
        estoque_min: m.estoque_min,
        estoque_max: m.estoque_max,
        ponto_ressuprimento: m.ponto_ressuprimento,
        custo_unit: m.custo_unit,
        margem: m.margem,
        especificacoes: m.especificacoes,
        fornecedor: FORNECEDORES[materiaisCriados.length % FORNECEDORES.length],
      });
      materiaisCriados.push(material);

      if (m.quantidade > 0) {
        await MovimentoEstoque.create({
          organizacao_id: org.id,
          material_id: material.id,
          tipo: "entrada",
          quantidade: m.quantidade,
          referencia_tipo: "manual",
          motivo: "Stock inicial (dados de demonstração)",
          fornecedor_nome: material.fornecedor,
        });
      }
    }

    const offset = materiaisCriados.find((m) => m.codigo === "PAP-003");
    if (offset) {
      await MovimentoEstoque.create({
        organizacao_id: org.id,
        material_id: offset.id,
        tipo: "saida",
        quantidade: 12,
        referencia_tipo: "manual",
        motivo: "Saída para ordem de produção",
        cliente_nome: "Gráfica Kibuia",
      });
    }

    const orcamento = await Orcamento.create({
      organizacao_id: org.id,
      cliente_id: clienteExemplo.id,
      numero: "ORC-0001",
      validade: 30,
      estado: "pendente",
      produto: "Cartazes 1x2m em lona",
      formato: "1x2m",
      papel: "Lona Frontlit 440g",
      impressao: "Digital 1440dpi",
      acabamento: "Ilhós e bainha",
      especificacao_json: {
        Produto: "Cartazes 1x2m em lona",
        Material: "Lona Frontlit 440g",
        Impressão: "Digital 1440dpi",
        Acabamento: "Ilhós e bainha",
      },
      prazo_execucao: "5 dias úteis",
      condicoes_pagamento: "50% de sinal, restante na entrega",
      iva: 14,
      total_sem_iva: 90000,
      total_iva: 12600,
      total_com_iva: 102600,
      observacoes: "Orçamento de demonstração.",
    });
    await OrcamentoItem.create({ orcamento_id: orcamento.id, descricao: "Cartazes 1x2m em lona com ilhós", quantidade: 50, preco_unit: 1800, total: 90000 });

    console.log("Dados de demonstração criados com sucesso.");
    console.log(`- ${materiaisCriados.length} materiais`);
    console.log(`- ${clientes.length + extras.length} clientes`);
    console.log(`- ${FORNECEDORES.length} fornecedores`);
    console.log("- 1 orçamento (ORC-0001)");
  } catch (e) {
    console.error("ERRO:", e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
