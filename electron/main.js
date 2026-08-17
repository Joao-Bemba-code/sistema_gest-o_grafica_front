const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

process.env.SIGRAF_DADOS = app.getPath("userData");

const { iniciarServidor, leConfig, gravaConfig, PORTA } = require("./server");

let mainWindow = null;

function vigiarAtualizacoesWeb() {
  const indexHtml = path.join(__dirname, "web", "index.html");
  let ultimaModificacao = 0;
  setInterval(() => {
    try {
      const mtime = fs.statSync(indexHtml).mtimeMs;
      if (ultimaModificacao === 0) {
        ultimaModificacao = mtime;
        return;
      }
      if (mtime !== ultimaModificacao) {
        ultimaModificacao = mtime;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
      }
    } catch {}
  }, 2000);
}

function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    title: "SIGRAF",
    icon: path.join(__dirname, "recursos", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(`http://localhost:${PORTA}`);
}

ipcMain.handle("desktop:get-config", () => leConfig());

ipcMain.handle("desktop:set-config", (_event, cfg) => {
  const atual = leConfig();
  gravaConfig({
    ...atual,
    ...cfg,
    sync_ativo: cfg.sync_ativo !== undefined ? !!cfg.sync_ativo : !!atual.sync_ativo,
    sync_url: cfg.sync_url !== undefined ? cfg.sync_url : (atual.sync_url || ""),
    sync_email: cfg.sync_email !== undefined ? cfg.sync_email : (atual.sync_email || ""),
    sync_senha: cfg.sync_senha !== undefined ? cfg.sync_senha : (atual.sync_senha || ""),
  });
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 400);
  return true;
});

app.whenReady().then(async () => {
  try {
    await iniciarServidor(PORTA);
  } catch (e) {
    console.error("Erro ao iniciar o servidor local:", e);
  }
  criarJanela();
  vigiarAtualizacoesWeb();
});

app.on("window-all-closed", () => {
  app.quit();
});
