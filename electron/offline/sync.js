const axios = require("axios");
const { agora, lerMeta, escreverMeta } = require("./db");
const { registarUtilizadorLocal, caminhoModelos } = require("./usuario");

const HTTP = axios.create({ timeout: 15000 });

// Colunas de negócio da organização (registo único; sem UUID). Convenção
// partilhada com o servidor (services/sincronizacao.js -> COLUNAS_ORG).
const COLUNAS_ORG = [
  "nome",
  "sigla",
  "nif",
  "email",
  "telefone",
  "endereco",
  "website",
  "template_contrato",
  "logo_url",
];

// Tabelas reais sincronizadas (mesmo nome em sgg.sqlite e MySQL). Ordem
// respeita as dependências (pais antes dos filhos) para as FKs existirem.
const TABELAS_SINC = [
  "cliente",
  "fornecedor",
  "categoria",
  "material",
  "movimento_estoque",
  "orcamento",
  "orcamento_item",
  "orcamento_material",
  "ordem_producao",
  "pre_impressao",
  "impressao",
  "acabamento",
  "qualidade",
  "reserva_estoque",
  "faturacao",
  "pedido",
  "pedido_item",
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

// Envia todas as linhas de cada tabela real (o servidor faz LWW por updatedAt).
async function enviarTabelas(sequelize, url, token) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const enviados = {};
  for (const tabela of TABELAS_SINC) {
    try {
      const Model = sequelize.models[tabela];
      if (!Model) continue;
      const colunas = colunasReais(Model);
      const [linhas] = await sequelize.query(
        `SELECT id, createdAt, \`${colunas.join("`, `")}\`, updatedAt FROM \`${tabela}\``
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

// Puxa o que mudou nas tabelas reais desde o último sync e aplica com LWW.
async function puxarTabelas(sequelize, url, token, db) {
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const since = lerMeta(db, "last_sync_time", "1970-01-01T00:00:00.000Z");
  const puxados = {};
  for (const tabela of TABELAS_SINC) {
    try {
      const Model = sequelize.models[tabela];
      if (!Model) continue;
      const resp = await HTTP.get(`${base}/api/sinc/tabela`, {
        params: { tabela, since },
        ...cab,
      });
      const registos = (resp.data && resp.data.registos) || [];
      if (!registos.length) continue;
      const colunas = colunasReais(Model);
      let n = 0;
      for (const reg of registos) {
        const novoT = Date.parse(reg.updatedAt) || 0;
        const existente = await Model.unscoped().findByPk(reg.id, { raw: true });
        if (!existente) {
          const valores = { id: reg.id };
          for (const c of colunas) {
            const v = normalizarValor(Model, c, reg[c]);
            if (v !== null) valores[c] = v;
          }
          valores.createdAt = new Date(Date.parse(reg.createdAt) || Date.now());
          valores.updatedAt = new Date(novoT || Date.now());
          const chaves = Object.keys(valores);
          await sequelize.query(
            `INSERT INTO \`${tabela}\` (\`${chaves.join("`, `")}\`) VALUES (${chaves.map(() => "?").join(", ")})`,
            { replacements: chaves.map((k) => valores[k]) }
          );
          n++;
        } else {
          const atualT = Date.parse(existente.updatedAt) || 0;
          if (!novoT || novoT <= atualT) continue;
          const sets = [];
          const params = [];
          for (const c of colunas) {
            const v = normalizarValor(Model, c, reg[c]);
            if (v !== null) {
              sets.push(`\`${c}\` = ?`);
              params.push(v);
            }
          }
          sets.push("`updatedAt` = ?");
          params.push(new Date(novoT));
          params.push(reg.id);
          await sequelize.query(
            `UPDATE \`${tabela}\` SET ${sets.join(", ")} WHERE id = ?`,
            { replacements: params }
          );
          n++;
        }
      }
      if (n) puxados[tabela] = n;
    } catch (e) {
      console.log(`SIGRAF offline: tabela ${tabela} não puxada (${e.message || e})`);
    }
  }
  return puxados;
}

async function sincronizarOrganizacaoComServidor(db, url, token) {
  const { sequelize, Organizacao } = require(caminhoModelos());
  const base = url.replace(/\/+$/, "");
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const push = { ok: true, atualizado: false };
  const pull = { ok: true, atualizado: false };

  // Envia: dados da org local (sgg.sqlite) para o servidor, com LWW.
  const local = await Organizacao.findOne();
  if (local && local.nome) {
    try {
      const r = await HTTP.post(
        `${base}/api/sinc/organizacao`,
        { organizacao: { ...local.toJSON(), updated_at: local.updatedAt } },
        cab
      );
      if (r.data) push.atualizado = !!r.data.atualizado;
    } catch (e) {
      throw e;
    }
  }

  // Puxa: estado atual no servidor; aplica localmente se for mais recente.
  const r = await HTTP.get(`${base}/api/sinc/organizacao`, cab);
  const remota = r.data && r.data.organizacao;
  if (remota) {
    const novoT = Date.parse(remota.updated_at || remota.updatedAt) || 0;
    const atualT = local ? Date.parse(local.updatedAt) || 0 : 0;
    if (novoT && novoT > atualT) {
      const campos = {};
      for (const c of COLUNAS_ORG) {
        if (remota[c] !== undefined && remota[c] !== null) campos[c] = remota[c];
      }
      campos.updatedAt = new Date(novoT);
      if (local) {
        // Sequelize ignora updatedAt em update(): SQL direto para o LWW.
        const sets = Object.keys(campos)
          .map((c) => `"${c}" = ?`)
          .join(", ");
        await sequelize.query(`UPDATE "organizacao" SET ${sets} WHERE id = ?`, {
          replacements: [...Object.values(campos), local.id],
        });
      } else {
        await Organizacao.create(campos);
      }
      pull.atualizado = true;
    }
  }
  return { push, pull };
}

async function sincronizar(db) {
  const url = lerMeta(db, "server_url", "");
  const email = lerMeta(db, "sync_email", "");
  const senha = lerMeta(db, "sync_senha", "");
  const orgId = lerMeta(db, "org_id", "");
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
    const enviados = await enviarTabelas(sequelize, url, token);
    const puxados = await puxarTabelas(sequelize, url, token, db);
    const organizacao = await sincronizarOrganizacaoComServidor(db, url, token);
    escreverMeta(db, "last_sync_time", agora());
    return { ok: true, enviados, puxados, organizacao };
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
  const tabelas = ["cliente", "categoria", "fornecedor", "material", "orcamento", "producao", "faturacao"];
  if (orgAntiga !== novaOrgId) {
    console.log(`SIGRAF offline: isolamento de organização (${orgAntiga || "nenhuma"} -> ${novaOrgId}), limpando dados locais...`);
    for (const t of tabelas) {
      try { db.exec(`DELETE FROM ${t}`); } catch (_) {}
    }
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
        if (r.ok) console.log(`SIGRAF offline: sincronização OK (${JSON.stringify(r.enviados)}/${JSON.stringify(r.puxados)}/org${r.organizacao ? ":" + (r.organizacao.push.atualizado ? "push" : "") + (r.organizacao.pull.atualizado ? "pull" : "") : ""})`);
        else console.log(`SIGRAF offline: ${r.erro}`);
      }
    } catch (e) {
      console.log(`SIGRAF offline: sem ligação (${e.message || e})`);
    } finally {
      aCorrer = false;
    }
  };
  const timer = setInterval(executar, intervaloMs);
  setTimeout(executar, 2000);
  return () => clearInterval(timer);
}

module.exports = { sincronizar, ligarServidor, iniciarSync, temLigacao, loginRemoto, TABELAS_SINC };
