const express = require("express");
const { novoUuid, listar, obter, salvarLocal, pendentes, lerMeta } = require("./db");
const { sincronizar, ligarServidor, loginRemoto } = require("./sync");
const { registarUtilizadorLocal } = require("./usuario");

function criarApi(db) {
  const router = express.Router();

  // Exemplo: guardar um registo de cliente localmente (UUID + is_dirty = 1).
  router.get("/clientes", (req, res) => {
    return res.json(listar(db, "clientes"));
  });

  router.get("/clientes/:id", (req, res) => {
    const cliente = obter(db, "clientes", req.params.id);
    if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
    return res.json(cliente);
  });

  router.post("/clientes", (req, res) => {
    const { nome, nif, telefone, email } = req.body || {};
    if (!nome) return res.status(422).json({ erro: "O nome é obrigatório" });
    const registo = salvarLocal(db, "clientes", { id: novoUuid(), nome, nif, telefone, email });
    return res.status(201).json(registo);
  });

  router.put("/clientes/:id", (req, res) => {
    const existente = obter(db, "clientes", req.params.id);
    if (!existente) return res.status(404).json({ erro: "Cliente não encontrado" });
    const { nome, nif, telefone, email } = req.body || {};
    const registo = salvarLocal(db, "clientes", {
      id: existente.id,
      nome: nome != null ? nome : existente.nome,
      nif: nif != null ? nif : existente.nif,
      telefone: telefone != null ? telefone : existente.telefone,
      email: email != null ? email : existente.email,
    });
    return res.json(registo);
  });

  router.get("/sync/estado", (req, res) => {
    return res.json({
      server_url: lerMeta(db, "server_url", ""),
      org_id: lerMeta(db, "org_id", ""),
      org_nome: lerMeta(db, "org_nome", ""),
      last_sync_time: lerMeta(db, "last_sync_time", ""),
      pendentes: pendentes(db),
    });
  });

  // Primeiro acesso: liga este computador ao servidor e faz a 1.ª sincronização.
  router.post("/sync/ligar", async (req, res) => {
    const { url, email, senha } = req.body || {};
    const r = await ligarServidor(db, { url, email, senha });
    if (!r.ok) return res.status(400).json({ erro: r.erro || "Falha ao ligar" });
    return res.json({ ok: true, usuario: r.usuario, sincronizacao: r.sincronizacao });
  });

  router.post("/sync/agora", async (req, res) => {
    const r = await sincronizar(db);
    if (!r.ok) return res.status(502).json({ erro: r.erro || "Falha ao sincronizar" });
    return res.json(r);
  });

  // Login de um utilizador que ainda não fez o primeiro acesso neste
  // computador: valida sempre contra o servidor real (exige internet) e,
  // se válido, regista o utilizador localmente para os acessos seguintes.
  router.post("/auth/login", async (req, res) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(422).json({ erro: "Email e senha são obrigatórios" });
    const url = lerMeta(db, "server_url", "");
    if (!url) return res.status(409).json({ erro: "Este computador ainda não está ligado a nenhuma organização." });
    try {
      const login = await loginRemoto(url, email, senha);
      await registarUtilizadorLocal(login, senha);
      return res.json({ ok: true, online: true, usuario: login.usuario });
    } catch (e) {
      return res.status(401).json({
        erro: "Sem ligação ao servidor ou credenciais inválidas. O primeiro acesso neste computador precisa de internet.",
      });
    }
  });

  return router;
}

module.exports = { criarApi };
