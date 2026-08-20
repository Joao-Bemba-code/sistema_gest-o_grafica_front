const express = require("express");
const path = require("path");
const fs = require("fs");

const DIR_DADOS = process.env.SIGRAF_DADOS || __dirname;
fs.mkdirSync(DIR_DADOS, { recursive: true });

const CONFIG_PATH = path.join(DIR_DADOS, "config.json");
const PORTA = 8000;

process.env.SECRET = process.env.SECRET || "sigraf-desktop-local-secret";
process.env.SIGRAF_UPLOADS = path.join(DIR_DADOS, "uploads");

function leConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { modo: "local", servidor_url: "" };
  }
}

function gravaConfig(cfg) {
  const dados = {
    modo: cfg.modo === "servidor" ? "servidor" : "local",
    servidor_url: cfg.servidor_url || "",
    sync_ativo: !!cfg.sync_ativo,
    sync_url: cfg.sync_url || "",
    sync_email: cfg.sync_email || "",
    sync_senha: cfg.sync_senha || "",
    id_base: cfg.id_base || 0,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(dados, null, 2), "utf8");
  return dados;
}

function caminhoBackend() {
  const pack = path.join(__dirname, "backend", "app.js");
  if (fs.existsSync(pack)) return path.join(__dirname, "backend");
  return path.join(__dirname, "..", "..", "backend_sg_grafica");
}

function caminhoWeb() {
  const pack = path.join(__dirname, "web");
  if (fs.existsSync(pack)) return pack;
  return path.join(__dirname, "..", "sigraf", "out");
}

async function corrigirFamiliasCategorias(backendDir) {
  const { Categoria } = require(path.join(backendDir, "models"));
  const cats = await Categoria.findAll();
  const mapa = {
    tintas: /tinta|tintas/i,
    chapas: /chapa|chapas/i,
    material_acabamento: /cola|acabamento|vinil|vinis/i,
    suporte_especial: /lona|lonas|suporte/i,
    consumiveis: /consum[ií]vei|insumo|produto.?pronto|produtos.?prontos/i,
    equipamentos: /equipamento/i,
    ferramentas: /ferramenta/i,
    produto_quimico: /qu[ií]mico|solvente/i,
  };
  let corrigidas = 0;
  for (const c of cats) {
    const atual = (c.familia || "").toLowerCase();
    if (atual !== "papeis") continue;
    for (const [fam, regex] of Object.entries(mapa)) {
      if (regex.test(c.nome)) {
        await c.update({ familia: fam });
        corrigidas++;
        break;
      }
    }
  }
  if (corrigidas > 0) console.log(`SIGRAF: ${corrigidas} categorias tiveram a família corrigida`);
}

async function garantirDadosIniciais(backendDir) {
  const bcrypt = require("bcryptjs");
  const { Organizacao, Usuario, Categoria, Cliente } = require(path.join(backendDir, "models"));
  const count = await Organizacao.count();
  if (count > 0) {
    await corrigirFamiliasCategorias(backendDir);
    return;
  }

  const org = await Organizacao.create({
    nome: "Minha Gráfica",
    sigla: "MG",
    nif: "5000000000",
    email: "geral@minhagrafica.com",
    telefone: "+244 900 000 000",
    endereco: "",
    website: "",
  });

  const hash = await bcrypt.hash("admin123", 10);
  await Usuario.create({
    organizacao_id: org.id,
    nome: "Administrador do Sistema",
    email: "admin@minhagrafica.com",
    senha: hash,
    funcao: "Administrador",
  });

  const categoriasSeed = [
    { nome: "Papel Couché", familia: "papeis", subfamilia: "Couché", tipo: "materia_prima" },
    { nome: "Papel Offset", familia: "papeis", subfamilia: "Offset", tipo: "materia_prima" },
    { nome: "Tinta Solvente", familia: "tintas", subfamilia: "Solvente", tipo: "materia_prima" },
    { nome: "Tinta UV", familia: "tintas", subfamilia: "UV", tipo: "materia_prima" },
    { nome: "Chapa CTP", familia: "chapas", subfamilia: "CTP", tipo: "materia_prima" },
    { nome: "Cola", familia: "material_acabamento", subfamilia: "", tipo: "materia_prima" },
    { nome: "Lona", familia: "suporte_especial", subfamilia: "", tipo: "materia_prima" },
    { nome: "Vinil", familia: "suporte_especial", subfamilia: "", tipo: "materia_prima" },
    { nome: "Produto Pronto", familia: "consumiveis", subfamilia: "", tipo: "produto_acabado" },
  ];
  for (const cat of categoriasSeed) {
    await Categoria.create({
      organizacao_id: org.id,
      nome: cat.nome,
      familia: cat.familia,
      subfamilia: cat.subfamilia,
      tipo: cat.tipo,
    });
  }

  await Cliente.create({
    organizacao_id: org.id,
    nome: "Cliente Exemplo",
    empresa: "Empresa Exemplo Lda",
    nif: "5400000000",
    telefone: "+244 911 111 111",
    email: "cliente@exemplo.com",
    tipo: "cliente",
  });

  console.log("SIGRAF: dados de demonstração criados (admin@minhagrafica.com / admin123)");
}

const BACKUP_MAX = 10;

function formatoDataBackup(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function copiarDiretorio(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copiarDiretorio(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function criarBackupAutomatico() {
  const dbFile = path.join(DIR_DADOS, "sgg.sqlite");
  if (!fs.existsSync(dbFile)) return;
  const backupsDir = path.join(DIR_DADOS, "backups");
  const destino = path.join(backupsDir, formatoDataBackup(new Date()));
  fs.mkdirSync(destino, { recursive: true });
  for (const f of fs.readdirSync(DIR_DADOS)) {
    if (f.startsWith("sgg.sqlite")) {
      fs.copyFileSync(path.join(DIR_DADOS, f), path.join(destino, f));
    }
  }
  const uploadsDir = path.join(DIR_DADOS, "uploads");
  if (fs.existsSync(uploadsDir)) {
    copiarDiretorio(uploadsDir, path.join(destino, "uploads"));
  }
  const backups = fs
    .readdirSync(backupsDir)
    .filter((n) => /^\d{8}-\d{6}$/.test(n))
    .sort()
    .reverse();
  for (const antigo of backups.slice(BACKUP_MAX)) {
    fs.rmSync(path.join(backupsDir, antigo), { recursive: true, force: true });
  }
  console.log(`SIGRAF: backup automático criado em ${destino} (guarda os ${BACKUP_MAX} mais recentes)`);
}

async function aplicarMigracoes(sequelize) {
  const dialect = sequelize.getDialect();
  const adicionar = async (tabela, coluna, tipo) => {
    let existe = false;
    if (dialect === "sqlite") {
      const [res] = await sequelize.query(`PRAGMA table_info(${tabela})`);
      existe = res.some((c) => c.name === coluna);
    } else {
      const [res] = await sequelize.query(`SHOW COLUMNS FROM \`${tabela}\` LIKE '${coluna}'`);
      existe = Array.isArray(res) ? res.length > 0 : false;
    }
    if (!existe) {
      await sequelize.query(`ALTER TABLE \`${tabela}\` ADD COLUMN \`${coluna}\` ${tipo}`);
      console.log(`SIGRAF: coluna ${tabela}.${coluna} adicionada`);
    }
  };
  await adicionar("categoria", "campos_especificacao", "TEXT");
  await adicionar("categoria", "familia", "VARCHAR(50) DEFAULT 'papeis'");
  await adicionar("categoria", "subfamilia", "VARCHAR(100)");
  await adicionar("categoria", "tipo", "VARCHAR(50) DEFAULT 'materia_prima'");
  await adicionar("material", "especificacoes", "TEXT");
  await adicionar("material", "localizacao", "VARCHAR(200)");
  await adicionar("orcamento", "especificacao_json", "TEXT");
  await adicionar("orcamento_item", "composto", "TINYINT(1) DEFAULT 0");
  await adicionar("orcamento_item", "margem", "DECIMAL(12,2) DEFAULT 0");

  // Tombstones (soft-delete) para sincronizar eliminações entre computadores.
  const tabelasTomb = [
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
  for (const t of tabelasTomb) {
    await adicionar(t, "deleted", "TINYINT(1) NOT NULL DEFAULT 0");
    await adicionar(t, "deletedAt", "DATETIME NULL");
  }
}

// Faixa de IDs própria deste computador: os novos registos usam IDs altos,
// para nunca colidirem com os IDs de outro PC nem com os existentes na nuvem.
// O SQLite AUTOINCREMENT guarda o próximo ID em sqlite_sequence; semeá-lo com
// a base garante que os próximos inserts tenham IDs na faixa deste PC.
async function garantirFaixaIds(sequelize) {
  const { TABELAS_SINC } = require("./offline/sync");
  const cfg = leConfig();
  let base = cfg.id_base;
  if (!base) {
    base = 1000000000 + Math.floor(Math.random() * 1000000000);
    gravaConfig({ ...cfg, id_base: base });
  }
  for (const tabela of TABELAS_SINC) {
    await sequelize.query(`DELETE FROM sqlite_sequence WHERE name = ?`, { replacements: [tabela] });
    await sequelize.query(`INSERT INTO sqlite_sequence(name, seq) VALUES(?, ?)`, { replacements: [tabela, base] });
  }
  console.log(`SIGRAF offline: faixa de IDs deste PC = ${base}`);
}

async function iniciarServidor(porta) {
  const config = leConfig();
  const backendDir = caminhoBackend();
  const webDir = caminhoWeb();
  const app = express();

  if (config.modo === "servidor" && config.servidor_url) {
    const { criarApp } = require(path.join(backendDir, "app.js"));
    app.use(criarApp({ proxyUrl: config.servidor_url, semRotaRaiz: true }));
  } else {
    process.env.Lang = "sqlite";
    process.env.Sqlite_File = path.join(DIR_DADOS, "sgg.sqlite");
    const { criarApp } = require(path.join(backendDir, "app.js"));
    const { sequelize } = require(path.join(backendDir, "models"));
    app.use(criarApp({ semRotaRaiz: true }));
    await sequelize.sync();
    await aplicarMigracoes(sequelize);
    await garantirDadosIniciais(backendDir);
    await criarBackupAutomatico();
  }

  // Camada offline (better-sqlite3 + UUID + is_dirty): dados locais com
  // sincronização bidirecional para o servidor quando há ligação.
  if (config.modo === "local") {
    try {
      const { iniciarOffline } = require("./offline");
      const offline = iniciarOffline(DIR_DADOS);
      app.use(express.json());
      app.use("/api/offline", offline.router);
      offline.iniciarSync();
      console.log("SIGRAF offline: camada local com better-sqlite3 ativa");
    } catch (e) {
      console.error("SIGRAF offline: erro ao iniciar camada offline:", e);
    }
  }

  app.use(express.static(webDir));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });

  return new Promise((resolve, reject) => {
    app.listen(porta, "127.0.0.1", () => {
      console.log(`SIGRAF: servidor local na porta ${porta} (${config.modo})`);
      resolve(porta);
    });
  });
}

module.exports = { iniciarServidor, leConfig, gravaConfig, PORTA };
