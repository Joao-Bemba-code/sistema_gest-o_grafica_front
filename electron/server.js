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

async function garantirDadosIniciais(backendDir) {
  const bcrypt = require("bcryptjs");
  const { Organizacao, Usuario, Categoria, Cliente } = require(path.join(backendDir, "models"));
  const count = await Organizacao.count();
  if (count > 0) return;

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

  const grupos = {
    "Papel": "papel",
    "Tintas": "insumo",
    "Lonas": "papel",
    "Vinil": "papel",
    "Cola": "insumo",
    "Chapas": "insumo",
    "Papéis e Mídias": "papel",
    "Insumos e Consumíveis": "insumo",
    "Acabamento e Logística": "acabamento",
    "Produtos Prontos": "produto",
  };
  const categorias = [
    "Papel",
    "Tintas",
    "Lonas",
    "Vinil",
    "Cola",
    "Chapas",
    "Papéis e Mídias",
    "Insumos e Consumíveis",
    "Acabamento e Logística",
    "Produtos Prontos",
  ];
  for (const nome of categorias) {
    await Categoria.create({
      organizacao_id: org.id,
      nome,
      tipo: "material",
      grupo: grupos[nome] || "outros",
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
  const adicionar = async (tabela, coluna, tipo) => {
    const [res] = await sequelize.query(`PRAGMA table_info(${tabela})`);
    if (!res.some((c) => c.name === coluna)) {
      await sequelize.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
      console.log(`SIGRAF: coluna ${tabela}.${coluna} adicionada`);
    }
  };
  await adicionar("categoria", "campos_especificacao", "TEXT");
  await adicionar("material", "especificacoes", "TEXT");
  await adicionar("material", "localizacao", "TEXT");
  await adicionar("orcamento", "especificacao_json", "TEXT");
  await adicionar("orcamento_item", "composto", "TINYINT(1) DEFAULT 0");
  await adicionar("orcamento_item", "margem", "DECIMAL(12,2) DEFAULT 0");
  await adicionar("pedido", "email", "TEXT");
}

async function iniciarServidor(porta) {
  const config = leConfig();
  const backendDir = caminhoBackend();
  const webDir = caminhoWeb();
  const app = express();

  if (config.modo === "servidor" && config.servidor_url) {
    const { criarApp } = require(path.join(backendDir, "app.js"));
    app.use(criarApp({ proxyUrl: config.servidor_url }));
  } else {
    process.env.Lang = "sqlite";
    process.env.Sqlite_File = path.join(DIR_DADOS, "sgg.sqlite");
    const { criarApp } = require(path.join(backendDir, "app.js"));
    const { sequelize } = require(path.join(backendDir, "models"));
    app.use(criarApp());
    await sequelize.sync();
    await aplicarMigracoes(sequelize);
    await garantirDadosIniciais(backendDir);
    await criarBackupAutomatico();
  }

  if (config.modo === "local") {
    const { sincronizar } = require("./sync");
    const INTERVALO_SYNC = 5 * 60 * 1000;
    let sincronizando = false;
    const executarSync = async () => {
      if (sincronizando) return;
      const cfg = leConfig();
      if (!cfg.sync_ativo) return;
      sincronizando = true;
      try {
        const r = await sincronizar(cfg);
        console.log(r.ok ? `SIGRAF: ${r.mensagem}` : `SIGRAF: ${r.erro}`);
      } catch (e) {
        console.log(`SIGRAF: sincronização falhou (sem internet?): ${e.message || e}`);
      } finally {
        sincronizando = false;
      }
    };
    setTimeout(executarSync, 5000);
    setInterval(executarSync, INTERVALO_SYNC);
    console.log("SIGRAF: sincronização automática ativa (a cada 5 minutos)");
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
