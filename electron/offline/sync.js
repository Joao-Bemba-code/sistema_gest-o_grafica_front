const axios = require("axios");
const { agora, lerMeta, escreverMeta } = require("./db");
const { registarUtilizadorLocal, caminhoModelos } = require("./usuario");

const HTTP = axios.create({ timeout: 15000 });

const COLUNAS_ORG = [
  "nome", "sigla", "nif", "email", "telefone", "endereco",
  "website", "template_contrato", "logo_url",
];

const TABELAS_SINC = [
  "cliente", "fornecedor", "categoria", "material",
  "movimento_estoque", "orcamento", "orcamento_item",
  "orcamento_material", "ordem_producao", "pre_impressao",
  "impressao", "acabamento", "qualidade", "reserva_estoque",
  "faturacao", "pedido", "pedido_item",
];

function colunasReais(Model) {
  return Object.keys(Model.rawAttributes).filter(
    (a) => !["id", "createdAt", "updatedAt", "is_dirty"].includes(a)
  );
}

function normalizarValor(Model, coluna, valor) {
  if (valor === undefined || valor === null) return null;
  const tipo = Model.rawAttributes[coluna] && Model.rawAttributes[coluna].type;
  if (!tipo) return String(valor);
  const key = tipo.key;
  if (key === "json") {
    if (typeof valor === "string") {
      if (valor === "") return null;
      return valor;
    }
    return JSON.stringify(valor);
  }
  if (key === "dateonly") {
    if (valor instanceof Date) {
      const p = (n) => String(n).padStart(2, "0");
      return `${valor.getUTCFullYear()}-${p(valor.getUTCMonth() + 1)}-${p(valor.getUTCDate())}`;
    }
    return String(valor).slice(0, 10);
  }
  if (valor instanceof Date) return valor;
  return String(valor);
}

async function loginRemoto(url, email, senha) {
  const r = await HTTP.post(`${url.replace(/\/+$/, "")}/api/auth/login`, { email, senha });
  if (!r.data || !r.data.token) throw new Error("Credenciais inválidas");
  return r.data;
}

async function temLigacao(url) {
  try {
    await axios.get(`${url.replace(/\/+$/, "")}/api/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function enviarTabelas(sequelize, url, token, db) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const since = lerMeta(db, "last_push_time", "1970-01-01T00:00:00.000Z");
  const desde = new Date(since || "1970-01-01T00:00:00.000Z");
  const enviados = {};
  for (const tabela of TABELAS_SINC) {
    try {
      const Model = sequelize.models[tabela];
      if (!Model) continue;
      const colunas = colunasReais(Model);
      const [linhas] = await sequelize.query(
        `SELECT id, createdAt, \`${colunas.join("`, `")}\`, updatedAt FROM \`${tabela}\` WHERE \`updatedAt\` > ?`,
        { replacements: [desde] }
      );
      if (!linhas.length) continue;
      const registos = linhas.map((r) => ({
        ...r,
        updated_at: r.updatedAt,
      }));
      const resp = await HTTP.post(`${base}/api/sinc/tabela`, { tabela, registos }, cab);
      if (resp.data && resp.data.ok) enviados[tabela] = linhas.length;
    } catch (e) {
      console.log(`SIGRAF offline: tabela ${tabela} não enviada (${e.message || e})`);
    }
  }
  return enviados;
}

async function enviarOrganizacao(sequelize, url, token) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const { Organizacao } = require(caminhoModelos());
  const local = await Organizacao.findOne();
  if (!local || !local.nome) return { push: { ok: true, atualizado: false } };
  try {
    const r = await HTTP.post(
      `${base}/api/sinc/organizacao`,
      { organizacao: { ...local.toJSON(), updated_at: local.updatedAt } },
      cab
    );
    return { push: { ok: true, atualizado: r.data ? !!r.data.atualizado : false } };
  } catch (e) {
    return { push: { ok: false, erro: e.message } };
  }
}

async function sincronizar(db) {
  const url = lerMeta(db, "server_url", "");
  const email = lerMeta(db, "sync_email", "");
  const senha = lerMeta(db, "sync_senha", "");
  if (!url || !email || !senha) {
    return { ok: false, erro: "Servidor ainda não foi ligado." };
  }
  let login;
  try {
    login = await loginRemoto(url, email, senha);
  } catch (e) {
    return { ok: false, erro: e.message || String(e) };
  }
  const token = login.token;
  try {
    const { sequelize } = require(caminhoModelos());
    const enviados = await enviarTabelas(sequelize, url, token, db);
    const organizacao = await enviarOrganizacao(sequelize, url, token);
    const temDados = Object.values(enviados).some((n) => n > 0) || (organizacao.push && organizacao.push.atualizado);
    if (temDados) {
      const v = Number(lerMeta(db, "sync_version", "0")) + 1;
      escreverMeta(db, "sync_version", String(v));
    }
    escreverMeta(db, "last_push_time", agora());
    return { ok: true, enviados, organizacao };
  } catch (e) {
    return { ok: false, erro: e.message || String(e) };
  }
}

async function ligarServidor(db, { url, email, senha }) {
  const base = String(url || "").trim().replace(/\/+$/, "");
  if (!base || !email || !senha) {
    return { ok: false, erro: "URL, email e senha são obrigatórios." };
  }
  let login;
  try {
    login = await loginRemoto(base, email, senha);
  } catch (e) {
    return { ok: false, erro: "Não foi possível ligar ao servidor: " + (e.message || e) };
  }
  const org = login.usuario && login.usuario.organizacao ? login.usuario.organizacao : null;
  const novaOrgId = String(login.usuario.organizacao_id);
  const orgAntiga = lerMeta(db, "org_id", "");
  if (orgAntiga && orgAntiga !== novaOrgId) {
    console.log(`SIGRAF offline: isolamento de organização (${orgAntiga} -> ${novaOrgId}), limpando dados locais...`);
    const { sequelize, Organizacao, Usuario, Cliente, Fornecedor, Categoria, Material, Orcamento, Producao, Faturacao } = require(caminhoModelos());
    const tabelas = [Cliente, Fornecedor, Categoria, Material, Orcamento, Producao, Faturacao];
    for (const M of tabelas) {
      try { await M.destroy({ where: {} }); } catch (_) {}
    }
    const extras = [
      sequelize.models.movimento_estoque, sequelize.models.reserva_estoque,
      sequelize.models.orcamento_item, sequelize.models.orcamento_material,
      sequelize.models.ordem_producao, sequelize.models.pre_impressao,
      sequelize.models.impressao, sequelize.models.acabamento,
      sequelize.models.qualidade, sequelize.models.pedido, sequelize.models.pedido_item,
    ].filter(Boolean);
    for (const M of extras) {
      try { await M.destroy({ where: {} }); } catch (_) {}
    }
    try { await Usuario.destroy({ where: {} }); } catch (_) {}
    try { await Organizacao.destroy({ where: {} }); } catch (_) {}
  }
  escreverMeta(db, "server_url", base);
  escreverMeta(db, "sync_email", email);
  escreverMeta(db, "sync_senha", senha);
  escreverMeta(db, "org_id", novaOrgId);
  if (org) escreverMeta(db, "org_nome", org.nome || "");
  try {
    await registarUtilizadorLocal(login, senha);
  } catch (e) {
    console.log(`SIGRAF offline: não foi possível registar o utilizador localmente (${e.message || e})`);
  }
  const r = await sincronizar(db);
  return {
    ok: r.ok,
    erro: r.erro,
    usuario: login.usuario,
    sincronizacao: r,
  };
}

function iniciarSync(db, { intervaloMs = 60 * 1000 } = {}) {
  let aCorrer = false;
  const executar = async () => {
    if (aCorrer) return;
    aCorrer = true;
    try {
      const url = lerMeta(db, "server_url", "");
      if (url && (await temLigacao(url))) {
        const r = await sincronizar(db);
        if (r.ok) console.log(`SIGRAF offline: backup OK (${JSON.stringify(r.enviados)})`);
        else console.log(`SIGRAF offline: ${r.erro}`);
      }
    } catch (e) {
      console.log(`SIGRAF offline: sem ligação (${e.message || e})`);
    } finally {
      aCorrer = false;
    }
  };
  const timer = setInterval(executar, intervaloMs);
  setTimeout(executar, 5000);
  return () => clearInterval(timer);
}

module.exports = { sincronizar, ligarServidor, iniciarSync, temLigacao, loginRemoto, TABELAS_SINC };
