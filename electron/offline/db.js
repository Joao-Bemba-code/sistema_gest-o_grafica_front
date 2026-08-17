const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Banco de dados local (offline) gerido com better-sqlite3.
// Cada tabela sincronizavel usa UUID (id), updated_at (ISO 8601) e is_dirty
// (1 = alterado localmente e ainda nao enviado ao servidor; so existe aqui).
const NOME_FICHEIRO = "sigraf_sync.sqlite";

// Colunas de negocio por tabela (as comuns sao id/org_id/updated_at/is_dirty).
const TABELAS = {
  clientes: ["nome", "nif", "telefone", "email"],
};

function novoUuid() {
  return crypto.randomUUID();
}

function agora() {
  return new Date().toISOString();
}

function criarConexao(caminhoFicheiro) {
  fs.mkdirSync(path.dirname(caminhoFicheiro), { recursive: true });
  const db = new Database(caminhoFicheiro);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function criarTabela(db, nome, colunas) {
  const colunasSql = colunas.map((c) => `${c} TEXT`).join(", ");
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${nome} (
      id TEXT PRIMARY KEY,
      ${colunasSql}${colunasSql ? "," : ""}
      org_id TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 1
    );
  `);
}

function inicializar(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      chave TEXT PRIMARY KEY,
      valor TEXT
    );
  `);
  for (const [nome, colunas] of Object.entries(TABELAS)) {
    criarTabela(db, nome, colunas);
  }
}

function lerMeta(db, chave, valorPadrao = null) {
  const r = db.prepare("SELECT valor FROM sync_meta WHERE chave = ?").get(chave);
  return r ? r.valor : valorPadrao;
}

function escreverMeta(db, chave, valor) {
  db.prepare(
    "INSERT INTO sync_meta (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor"
  ).run(chave, String(valor));
}

function organizacaoAtual(db) {
  const orgId = lerMeta(db, "org_id", "");
  const url = lerMeta(db, "server_url", "");
  return { org_id: orgId, server_url: url };
}

function listar(db, nome, { soDirty = false } = {}) {
  const sql = `SELECT * FROM ${nome} ${soDirty ? "WHERE is_dirty = 1" : ""} ORDER BY updated_at DESC`;
  return db.prepare(sql).all();
}

// Guarda/atualiza um registo vindo da aplicacao: marca is_dirty = 1
// (a alteracao ainda nao foi enviada ao servidor).
function salvarLocal(db, nome, dados) {
  const orgId = organizacaoAtual(db).org_id;
  const registo = {
    id: dados.id || novoUuid(),
    updated_at: agora(),
    is_dirty: 1,
    org_id: orgId,
  };
  for (const coluna of TABELAS[nome] || []) {
    registo[coluna] = dados[coluna] != null ? String(dados[coluna]) : null;
  }
  const colunas = Object.keys(registo);
  const marcadores = colunas.map(() => "?").join(", ");
  const atualizar = colunas.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO ${nome} (${colunas.join(", ")})
     VALUES (${marcadores})
     ON CONFLICT(id) DO UPDATE SET ${atualizar}`
  ).run(...colunas.map((c) => registo[c]));
  return registo;
}

function obter(db, nome, id) {
  return db.prepare(`SELECT * FROM ${nome} WHERE id = ?`).get(id);
}

// Aplica registos vindos do servidor com Last-Write-Wins:
// so sobrepoe o local se o servidor estiver mais recente.
function aplicarRemotos(db, nome, registos) {
  const colunasNegocio = TABELAS[nome] || [];
  const colunasInserir = ["id", ...colunasNegocio, "org_id", "updated_at", "is_dirty"];
  const marcadores = colunasInserir.map(() => "?").join(", ");
  const inserir = db.prepare(`
    INSERT INTO ${nome} (${colunasInserir.join(", ")})
    VALUES (${marcadores})
  `);
  const atualizar = db.prepare(`
    UPDATE ${nome} SET
      ${colunasNegocio.map((c) => `${c} = ?`).join(", ")},
      org_id = ?,
      updated_at = ?,
      is_dirty = 0
    WHERE id = ?
  `);
  const valoresNegocio = (reg) => colunasNegocio.map((c) => (reg[c] != null ? String(reg[c]) : null));
  const transacao = db.transaction((lista) => {
    for (const reg of lista) {
      if (!reg || reg.id == null) continue;
      const local = db.prepare(`SELECT updated_at FROM ${nome} WHERE id = ?`).get(reg.id);
      const remotoT = Date.parse(reg.updated_at) || 0;
      if (!local) {
        inserir.run(reg.id, ...valoresNegocio(reg), reg.org_id || "", reg.updated_at || agora(), 0);
      } else if (remotoT > Date.parse(local.updated_at) || 0) {
        atualizar.run(...valoresNegocio(reg), reg.org_id || "", reg.updated_at || agora(), reg.id);
      }
      // Se o local for mais recente (e/ou estiver sujo), mantem-se para ser enviado.
    }
  });
  return transacao(registos || []);
}

function marcarLimpos(db, nome, ids) {
  if (!ids || !ids.length) return 0;
  const transacao = db.transaction((lista) => {
    for (const id of lista) {
      db.prepare(`UPDATE ${nome} SET is_dirty = 0 WHERE id = ?`).run(id);
    }
  });
  transacao(ids);
  return ids.length;
}

function pendentes(db) {
  const resultado = {};
  for (const nome of Object.keys(TABELAS)) {
    const r = db.prepare(`SELECT COUNT(*) AS n FROM ${nome} WHERE is_dirty = 1`).get();
    resultado[nome] = r ? r.n : 0;
  }
  return resultado;
}

function abrirBase(diretorio) {
  const db = criarConexao(path.join(diretorio, NOME_FICHEIRO));
  inicializar(db);
  return db;
}

module.exports = {
  abrirBase,
  novoUuid,
  agora,
  lerMeta,
  escreverMeta,
  organizacaoAtual,
  listar,
  obter,
  salvarLocal,
  aplicarRemotos,
  marcarLimpos,
  pendentes,
  TABELAS,
};
