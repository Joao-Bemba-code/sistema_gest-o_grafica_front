const path = require("path");
const fs = require("fs");

function caminhoBackend() {
  const pack = path.join(__dirname, "backend", "models", "index.js");
  if (fs.existsSync(pack)) return path.join(__dirname, "backend");
  return path.join(__dirname, "..", "backend_sg_grafica");
}

function pedirJson(baseUrl, caminho, method, corpo, token) {
  return new Promise((resolve, reject) => {
    const lib = baseUrl.startsWith("https") ? require("https") : require("http");
    let u;
    try {
      u = new URL(baseUrl.replace(/\/+$/, "") + caminho);
    } catch (e) {
      return reject(new Error("URL de sincronização inválida"));
    }
    const payload = corpo ? JSON.stringify(corpo) : null;
    const options = {
      method,
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
      timeout: 120000,
    };
    const req = lib.request(options, (res) => {
      let dados = "";
      res.on("data", (c) => (dados += c));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(dados);
        } catch (e) {
          json = dados;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
        else reject(new Error((json && json.erro) || "HTTP " + res.statusCode));
      });
    });
    req.on("timeout", () => req.destroy(new Error("tempo limite excedido")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function novo(r) {
  const t = Date.parse(r && r.updatedAt);
  return isNaN(t) ? 0 : t;
}

function limparDados(r) {
  const dados = { ...r };
  delete dados.id;
  delete dados.organizacao_id;
  delete dados.createdAt;
  delete dados.updatedAt;
  return dados;
}

async function mesclarOrgLocal(Model, remotos, localOrgId) {
  let n = 0;
  for (const r of remotos || []) {
    if (!r || r.id == null) continue;
    const local = await Model.findOne({
      where: { id: r.id, organizacao_id: localOrgId },
      raw: true,
    });
    if (!local) {
      await Model.create({
        ...limparDados(r),
        id: r.id,
        organizacao_id: localOrgId,
        ...(r.createdAt ? { createdAt: r.createdAt } : {}),
        ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
      });
      n++;
    } else if (novo(r) > novo(local)) {
      await Model.update(
        {
          ...limparDados(r),
          organizacao_id: localOrgId,
          ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
        },
        { where: { id: r.id, organizacao_id: localOrgId } }
      );
      n++;
    }
  }
  return n;
}

async function mesclarFilhosLocal(Model, remotos, localOrgId) {
  let n = 0;
  for (const r of remotos || []) {
    if (!r || r.id == null) continue;
    const local = await Model.findByPk(r.id, { raw: true });
    if (!local) {
      await Model.create({
        ...limparDados(r),
        id: r.id,
        ...(localOrgId != null ? { organizacao_id: localOrgId } : {}),
        ...(r.createdAt ? { createdAt: r.createdAt } : {}),
        ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
      });
      n++;
    } else if (novo(r) > novo(local)) {
      await Model.update(
        {
          ...limparDados(r),
          ...(r.updatedAt ? { updatedAt: r.updatedAt } : {}),
        },
        { where: { id: r.id } }
      );
      n++;
    }
  }
  return n;
}

async function mesclarSequenciaLocal(Sequencia, remotos, localOrgId) {
  const r = (remotos || [])[0];
  if (!r) return 0;
  const [seq] = await Sequencia.findOrCreate({
    where: { organizacao_id: localOrgId },
    defaults: { numero: 0 },
  });
  const novoNum = Math.max(Number(seq.numero) || 0, Number(r.numero) || 0);
  if (novoNum > Number(seq.numero) || 0) {
    await seq.update({ numero: novoNum });
    return 1;
  }
  return 0;
}

async function sincronizar(config) {
  const baseUrl = String(config.sync_url || "").trim();
  if (!baseUrl) return { ok: false, erro: "URL de sincronização não configurada" };
  if (!config.sync_email || !config.sync_senha) {
    return { ok: false, erro: "Email e senha de sincronização não configurados" };
  }

  const models = require(path.join(caminhoBackend(), "models"));
  const d = (m) => m.findAll({ raw: true });

  const [
    categorias,
    fornecedores,
    clientes,
    materiais,
    movimentos,
    orcamentos,
    orcamento_itens,
    orcamento_materiais,
    ordens,
    pre_impressaos,
    impressaos,
    acabamentos,
    qualidades,
    reservas,
    faturacaoes,
    sequencias,
  ] = await Promise.all([
    d(models.Categoria),
    d(models.Fornecedor),
    d(models.Cliente),
    d(models.Material),
    d(models.MovimentoEstoque),
    d(models.Orcamento),
    d(models.OrcamentoItem),
    d(models.OrcamentoMaterial),
    d(models.OrdemProducao),
    d(models.PreImpressao),
    d(models.Impressao),
    d(models.Acabamento),
    d(models.Qualidade),
    d(models.ReservaEstoque),
    d(models.Faturacao),
    d(models.Sequencia),
  ]);

  const login = await pedirJson(baseUrl, "/api/auth/login", "POST", {
    email: config.sync_email,
    senha: config.sync_senha,
  });
  if (!login || !login.token) {
    return { ok: false, erro: "Credenciais de sincronização inválidas" };
  }

  await pedirJson(
    baseUrl,
    "/api/sync",
    "POST",
    {
      categorias,
      fornecedores,
      clientes,
      materiais,
      movimentos,
      orcamentos,
      orcamento_itens,
      orcamento_materiais,
      ordens,
      pre_impressaos,
      impressaos,
      acabamentos,
      qualidades,
      reservas,
      faturacaoes,
      sequencias,
    },
    login.token
  );

  const remoto = await pedirJson(baseUrl, "/api/sync", "GET", null, login.token);
  if (!remoto) return { ok: true, mensagem: "Sincronização concluída (sem dados online)" };

  const orgLocal = await models.Organizacao.findOne({ raw: true });
  const localOrgId = orgLocal ? orgLocal.id : null;

  await mesclarOrgLocal(models.Categoria, remoto.categorias, localOrgId);
  await mesclarOrgLocal(models.Fornecedor, remoto.fornecedores, localOrgId);
  await mesclarOrgLocal(models.Cliente, remoto.clientes, localOrgId);
  await mesclarOrgLocal(models.Material, remoto.materiais, localOrgId);
  await mesclarOrgLocal(models.MovimentoEstoque, remoto.movimentos, localOrgId);
  await mesclarOrgLocal(models.Orcamento, remoto.orcamentos, localOrgId);
  await mesclarFilhosLocal(models.OrcamentoItem, remoto.orcamento_itens);
  await mesclarFilhosLocal(models.OrcamentoMaterial, remoto.orcamento_materiais);
  await mesclarOrgLocal(models.OrdemProducao, remoto.ordens, localOrgId);
  await mesclarFilhosLocal(models.PreImpressao, remoto.pre_impressaos, localOrgId);
  await mesclarFilhosLocal(models.Impressao, remoto.impressaos, localOrgId);
  await mesclarFilhosLocal(models.Acabamento, remoto.acabamentos, localOrgId);
  await mesclarFilhosLocal(models.Qualidade, remoto.qualidades, localOrgId);
  await mesclarOrgLocal(models.ReservaEstoque, remoto.reservas, localOrgId);
  await mesclarOrgLocal(models.Faturacao, remoto.faturacaoes, localOrgId);
  await mesclarSequenciaLocal(models.Sequencia, remoto.sequencias, localOrgId);

  return { ok: true, mensagem: "Sincronização concluída (ida e volta)" };
}

module.exports = { sincronizar };
