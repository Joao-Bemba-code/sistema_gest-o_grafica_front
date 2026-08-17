const { abrirBase } = require("./db");
const { criarApi } = require("./api");
const { iniciarSync, sincronizar } = require("./sync");

function iniciarOffline(diretorio) {
  const db = abrirBase(diretorio);
  const router = criarApi(db);
  return {
    router,
    db,
    iniciarSync: () => iniciarSync(db),
    sincronizarAgora: () => sincronizar(db),
  };
}

module.exports = { iniciarOffline };
