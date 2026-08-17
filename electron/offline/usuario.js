const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Regista no SQLite local (sgg.sqlite, o backend embebido) a organização e o
// utilizador reais vindos do servidor, para que o login continue a funcionar
// offline depois do primeiro acesso. O primeiro login exige internet; quem
// nunca fez login online neste computador não consegue entrar offline.
function caminhoModelos() {
  const embebido = path.join(__dirname, "..", "backend", "models");
  if (fs.existsSync(embebido)) return embebido;
  return path.join(__dirname, "..", "..", "backend_sg_grafica", "models");
}

async function registarUtilizadorLocal(login, senha) {
  const modelos = require(caminhoModelos());
  const { Organizacao, Usuario, Cliente, Fornecedor, Categoria, Material, Orcamento, Producao, Faturacao } = modelos;
  const real = login.usuario || {};
  const orgRemota = real.organizacao || {};
  const novaOrgId = real.organizacao_id;

  const orgLocal = await Organizacao.findOne();

  if (orgLocal && String(orgLocal.id) !== String(novaOrgId)) {
    console.log(`SIGRAF: organização local (${orgLocal.id}) ≠ cloud (${novaOrgId}), substituindo...`);
    const tabelas = [Cliente, Fornecedor, Categoria, Material, Orcamento, Producao, Faturacao];
    for (const M of tabelas) {
      try { await M.destroy({ where: {} }); } catch (_) {}
    }
    try { await Usuario.destroy({ where: {} }); } catch (_) {}
    try { await Organizacao.destroy({ where: {} }); } catch (_) {}
  }

  let org = novaOrgId ? await Organizacao.findByPk(novaOrgId) : null;
  if (!org && orgRemota) {
    org = await Organizacao.create({
      id: novaOrgId || undefined,
      nome: orgRemota.nome || orgRemota.name || "Organização",
      sigla: orgRemota.sigla || "",
      nif: orgRemota.nif || "",
      email: orgRemota.email || "",
      telefone: orgRemota.telefone || "",
      endereco: orgRemota.endereco || "",
      website: orgRemota.website || "",
    });
  } else if (org && (orgRemota.nome || orgRemota.email)) {
    const mudancas = {};
    if (orgRemota.nome && org.nome !== orgRemota.nome) mudancas.nome = orgRemota.nome;
    if (orgRemota.sigla && org.sigla !== orgRemota.sigla) mudancas.sigla = orgRemota.sigla;
    if (orgRemota.nif && org.nif !== orgRemota.nif) mudancas.nif = orgRemota.nif;
    if (orgRemota.email && org.email !== orgRemota.email) mudancas.email = orgRemota.email;
    if (orgRemota.telefone && org.telefone !== orgRemota.telefone) mudancas.telefone = orgRemota.telefone;
    if (orgRemota.endereco && org.endereco !== orgRemota.endereco) mudancas.endereco = orgRemota.endereco;
    if (Object.keys(mudancas).length) await org.update(mudancas);
  }

  const hash = await bcrypt.hash(senha || "", 10);
  const [usuario, criado] = await Usuario.findOrCreate({
    where: { email: real.email },
    defaults: {
      organizacao_id: novaOrgId || (org ? org.id : null),
      nome: real.nome || real.email || "Utilizador",
      email: real.email,
      senha: hash,
      funcao: real.funcao || "Utilizador",
    },
  });
  if (!criado && usuario.senha !== hash) {
    await usuario.update({
      organizacao_id: novaOrgId || usuario.organizacao_id,
      senha: hash,
      nome: real.nome || usuario.nome,
      funcao: real.funcao || usuario.funcao,
    });
  }
  return usuario;
}

module.exports = { registarUtilizadorLocal, caminhoModelos };
