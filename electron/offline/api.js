const express = require("express");
const bcrypt = require("bcryptjs");
const { novoUuid, listar, obter, salvarLocal, pendentes, lerMeta } = require("./db");
const { sincronizar, ligarServidor, loginRemoto, temLigacao } = require("./sync");
const { registarUtilizadorLocal, caminhoModelos } = require("./usuario");

function criarApi(db) {
  const router = express.Router();

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
      last_push_time: lerMeta(db, "last_push_time", ""),
      sync_version: Number(lerMeta(db, "sync_version", "0")),
      pendentes: pendentes(db),
    });
  });

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

  router.post("/auth/login", async (req, res) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) return res.status(422).json({ erro: "Email e senha são obrigatórios" });

    try {
      const modelos = require(caminhoModelos());
      const { Usuario, Organizacao } = modelos;
      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) return res.status(401).json({ erro: "Credenciais inválidas" });
      const hash = await bcrypt.hash(senha, 10);
      const valido = await bcrypt.compare(senha, usuario.senha);
      if (!valido) return res.status(401).json({ erro: "Credenciais inválidas" });
      const org = await Organizacao.findByPk(usuario.organizacao_id);
      return res.json({
        ok: true,
        online: false,
        usuario: { ...usuario.toJSON(), organizacao: org ? org.toJSON() : null },
      });
    } catch (e) {
      return res.status(500).json({ erro: "Erro ao fazer login: " + (e.message || e) });
    }
  });

  router.post("/auth/login-online", async (req, res) => {
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
        erro: "Sem ligação ao servidor ou credenciais inválidas.",
      });
    }
  });

  return router;
}

module.exports = { criarApi };
