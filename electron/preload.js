const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sigrafDesktop", {
  apiBase: "http://localhost:8000/api",
  getConfig: () => ipcRenderer.invoke("desktop:get-config"),
  setConfig: (cfg) => ipcRenderer.invoke("desktop:set-config", cfg),
  setSyncConfig: (cfg) => ipcRenderer.invoke("desktop:set-sync", cfg),
  syncNow: () => ipcRenderer.invoke("desktop:sync-now"),
});
