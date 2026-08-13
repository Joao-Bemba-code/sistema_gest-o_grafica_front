const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..", "..", "..");
const destinoBackend = path.join(__dirname, "..", "backend");
const destinoWeb = path.join(__dirname, "..", "web");

function apagar(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copiar(src, dest, excluir) {
  if (!fs.existsSync(src)) {
    console.log("AVISO: não existe", src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excluir.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copiar(s, d, excluir);
    else fs.copyFileSync(s, d);
  }
}

function preservar(dir, backup) {
  if (fs.existsSync(dir)) {
    fs.mkdirSync(backup, { recursive: true });
    fs.renameSync(dir, path.join(backup, "uploads"));
  }
}

function restaurar(backup, dir) {
  const alvo = path.join(backup, "uploads");
  if (fs.existsSync(alvo)) {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    fs.renameSync(alvo, dir);
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.rmSync(backup, { recursive: true, force: true });
}

const EXCLUIR_BACKEND = [
  "node_modules",
  ".env",
  "uploads",
  ".git",
  "sgg.sqlite",
  "package-lock.json",
  "migrate.js",
];

const backupDir = path.join(__dirname, "..", ".sync-backup");
preservar(path.join(destinoBackend, "uploads"), backupDir);
apagar(destinoBackend);
apagar(destinoWeb);
copiar(path.join(raiz, "backend_sg_grafica"), destinoBackend, EXCLUIR_BACKEND);
copiar(path.join(raiz, "sigraf", "out"), destinoWeb, []);
restaurar(backupDir, path.join(destinoBackend, "uploads"));

console.log("SIGRAF desktop: backend/ e web/ sincronizados (uploads preservados).");
