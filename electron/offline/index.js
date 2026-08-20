const { abrirBase } = require("./db");
const { criarApi } = require("./api");
const { iniciarSync, sincronizar, desligarServidor } = require("./sync");

function iniciarOffline(diretorio) {
  const db = abrirBase(diretorio);
  const router = criarApi(db);
  return {
    router,
    db,
    iniciarSync: () => iniciarSync(db),
    sincronizarAgora: () => sincronizar(db),
    desligarServidor: () => desligarServidor(db),
  };
}

module.exports = { iniciarOffline };
