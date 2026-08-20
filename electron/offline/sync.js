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

// ── PUSH: Local → Cloud ──────────────────────────────────────────────
// Envia todos os registos locais alterados desde a última sincronização.
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
      const temDeleted = colunas.includes("deleted");
      const whereDeleted = temDeleted ? ` OR \`deleted\` = 1` : "";
      const [linhas] = await sequelize.query(
        `SELECT id, createdAt, \`${colunas.join("`, `")}\`, updatedAt FROM \`${tabela}\` WHERE \`updatedAt\` > ?${whereDeleted}`,
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
      console.log(`SIGRAF offline: push ${tabela} falhou (${e.message || e})`);
    }
  }
  return enviados;
}

// ── PUSH ORG ─────────────────────────────────────────────────────────
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

// ── PULL: Cloud → Local ──────────────────────────────────────────────
// Busca alterações na cloud desde a última sincronização e aplica no SQLite local.
// Usa Last-Write-Wins: só sobrescreve se o registo remoto for mais recente.
async function buscarAlteracoesTabelas(sequelize, url, token, db) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const since = lerMeta(db, "last_pull_time", "1970-01-01T00:00:00.000Z");
  const recebidos = {};

  for (const tabela of TABELAS_SINC) {
    try {
      const Model = sequelize.models[tabela];
      if (!Model) continue;
      const resp = await HTTP.get(`${base}/api/sinc/tabela`, {
        params: { tabela, since },
        ...cab,
      });
      const registos = resp.data && resp.data.registos;
      if (!Array.isArray(registos) || !registos.length) continue;

      let aplicados = 0;
      for (const reg of registos) {
        if (!reg || reg.id == null) continue;
        const novoT = Date.parse(reg.updated_at || reg.updatedAt) || 0;
        const existente = await Model.unscoped().findByPk(reg.id, { raw: true });
        const deletado = reg.deleted === 1 || reg.deleted === true;
        if (!existente) {
          const dados = {};
          const colunas = colunasReais(Model);
          for (const c of colunas) {
            if (reg[c] !== undefined && reg[c] !== null) dados[c] = reg[c];
          }
          dados.id = reg.id;
          dados.createdAt = reg.createdAt ? new Date(Date.parse(reg.createdAt) || Date.now()) : new Date();
          dados.updatedAt = novoT ? new Date(novoT) : new Date();
          if (deletado) dados.deleted = 1;
          try {
            await Model.create(dados);
            aplicados++;
          } catch (e) {
            console.log(`SIGRAF offline: pull insert ${tabela}#${reg.id} falhou: ${e.message}`);
          }
        } else {
          const atualT = Date.parse(existente.updatedAt) || 0;
          if (!novoT || novoT <= atualT) continue;
          const dados = {};
          const colunas = colunasReais(Model);
          for (const c of colunas) {
            if (reg[c] !== undefined) dados[c] = reg[c];
          }
          dados.updatedAt = new Date(novoT);
          if (deletado) dados.deleted = 1;
          try {
            await Model.update(dados, { where: { id: reg.id }, silent: true });
            aplicados++;
          } catch (e) {
            console.log(`SIGRAF offline: pull update ${tabela}#${reg.id} falhou: ${e.message}`);
          }
        }
      }
      if (aplicados > 0) recebidos[tabela] = aplicados;
    } catch (e) {
      console.log(`SIGRAF offline: pull ${tabela} falhou (${e.message || e})`);
    }
  }
  return recebidos;
}

// ── PULL ORG ─────────────────────────────────────────────────────────
async function buscarOrganizacaoRemota(sequelize, url, token, db) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  try {
    const resp = await HTTP.get(`${base}/api/sinc/organizacao`, cab);
    const remota = resp.data && resp.data.organizacao;
    if (!remota) return { pull: { ok: true, atualizado: false } };
    const { Organizacao } = require(caminhoModelos());
    const local = await Organizacao.findOne();
    const novoT = Date.parse(remota.updated_at || remota.updatedAt) || 0;
    const atualT = local ? Date.parse(local.updatedAt) || 0 : 0;
    if (novoT && novoT > atualT) {
      const campos = {};
      for (const c of COLUNAS_ORG) {
        if (remota[c] !== undefined && remota[c] !== null) campos[c] = String(remota[c]);
      }
      if (Object.keys(campos).length) {
        if (local) await local.update(campos);
        else await Organizacao.create({ ...campos, id: remota.id || undefined });
        return { pull: { ok: true, atualizado: true } };
      }
    }
    return { pull: { ok: true, atualizado: false } };
  } catch (e) {
    return { pull: { ok: false, erro: e.message } };
  }
}

// ── SINCRONIZAÇÃO COMPLETA (Push + Pull) ─────────────────────────────
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

    // 1. PUSH: enviar alterações locais para a cloud
    const enviados = await enviarTabelas(sequelize, url, token, db);
    const orgPush = await enviarOrganizacao(sequelize, url, token);

    // 2. PULL: receber alterações da cloud para o local
    const recebidos = await buscarAlteracoesTabelas(sequelize, url, token, db);
    const orgPull = await buscarOrganizacaoRemota(sequelize, url, token, db);

    // 3. Actualizar metadados
    const temDadosEnvio = Object.values(enviados).some((n) => n > 0) || (orgPush.push && orgPush.push.atualizado);
    const temDadosRecebidos = Object.values(recebidos).some((n) => n > 0) || (orgPull.pull && orgPull.pull.atualizado);
    if (temDadosEnvio || temDadosRecebidos) {
      const v = Number(lerMeta(db, "sync_version", "0")) + 1;
      escreverMeta(db, "sync_version", String(v));
    }
    escreverMeta(db, "last_push_time", agora());
    escreverMeta(db, "last_pull_time", agora());

    return { ok: true, enviados, recebidos, organizacao: { push: orgPush.push, pull: orgPull.pull } };
  } catch (e) {
    return { ok: false, erro: e.message || String(e) };
  }
}

// ── LIGAR SERVIDOR ───────────────────────────────────────────────────
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

// ── DESLIGAR SERVIDOR ────────────────────────────────────────────────
function desligarServidor(db) {
  escreverMeta(db, "server_url", "");
  escreverMeta(db, "sync_email", "");
  escreverMeta(db, "sync_senha", "");
  escreverMeta(db, "last_push_time", "");
  escreverMeta(db, "last_pull_time", "");
  return { ok: true };
}

// ── SYNC EM BACKGROUND ───────────────────────────────────────────────
// Push a cada 10 segundos, pull a cada 15 segundos, desfasados.
function iniciarSync(db) {
  let aCorrerPush = false;
  let aCorrerPull = false;

  const executarPush = async () => {
    if (aCorrerPush) return;
    aCorrerPush = true;
    try {
      const url = lerMeta(db, "server_url", "");
      if (!url || !(await temLigacao(url))) return;
      const { sequelize } = require(caminhoModelos());
      const email = lerMeta(db, "sync_email", "");
      const senha = lerMeta(db, "sync_senha", "");
      if (!email || !senha) return;
      const login = await loginRemoto(url, email, senha);
      const enviados = await enviarTabelas(sequelize, url, login.token, db);
      const orgPush = await enviarOrganizacao(sequelize, url, login.token);
      const temDados = Object.values(enviados).some((n) => n > 0) || (orgPush.push && orgPush.push.atualizado);
      if (temDados) {
        const v = Number(lerMeta(db, "sync_version", "0")) + 1;
        escreverMeta(db, "sync_version", String(v));
      }
      escreverMeta(db, "last_push_time", agora());
      if (Object.keys(enviados).length) {
        console.log(`SIGRAF sync [push]: ${JSON.stringify(enviados)}`);
      }
    } catch (e) {
      console.log(`SIGRAF sync [push]: falhou (${e.message || e})`);
    } finally {
      aCorrerPush = false;
    }
  };

  const executarPull = async () => {
    if (aCorrerPull) return;
    aCorrerPull = true;
    try {
      const url = lerMeta(db, "server_url", "");
      if (!url || !(await temLigacao(url))) return;
      const { sequelize } = require(caminhoModelos());
      const email = lerMeta(db, "sync_email", "");
      const senha = lerMeta(db, "sync_senha", "");
      if (!email || !senha) return;
      const login = await loginRemoto(url, email, senha);
      const recebidos = await buscarAlteracoesTabelas(sequelize, url, login.token, db);
      const orgPull = await buscarOrganizacaoRemota(sequelize, url, login.token, db);
      const temDados = Object.values(recebidos).some((n) => n > 0) || (orgPull.pull && orgPull.pull.atualizado);
      if (temDados) {
        const v = Number(lerMeta(db, "sync_version", "0")) + 1;
        escreverMeta(db, "sync_version", String(v));
      }
      escreverMeta(db, "last_pull_time", agora());
      if (Object.keys(recebidos).length) {
        console.log(`SIGRAF sync [pull]: ${JSON.stringify(recebidos)}`);
      }
    } catch (e) {
      console.log(`SIGRAF sync [pull]: falhou (${e.message || e})`);
    } finally {
      aCorrerPull = false;
    }
  };

  // Push a cada 10s
  const timerPush = setInterval(executarPush, 10 * 1000);
  // Pull a cada 15s, desfasado 5s do push
  const timerPull = setInterval(executarPull, 15 * 1000);
  setTimeout(executarPush, 5000);
  setTimeout(executarPull, 10000);

  return () => { clearInterval(timerPush); clearInterval(timerPull); };
}

module.exports = { sincronizar, ligarServidor, desligarServidor, iniciarSync, temLigacao, loginRemoto, TABELAS_SINC };
