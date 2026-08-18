process.env.Lang = "sqlite";
process.env.Sqlite_File = "C:/Users/PC/AppData/Roaming/sigraf-desktop/sgg.sqlite";
process.env.SECRET = "test";
const path = require("path");
const backendDir = path.join(__dirname, "backend");
const { sequelize, OrdemProducao, PreImpressao, Cliente, Orcamento, Impressao, Acabamento, Qualidade, ReservaEstoque } = require(path.join(backendDir, "models"));

(async () => {
  try {
    await sequelize.sync();
    const t = await sequelize.transaction();
    try {
      const ordem = await OrdemProducao.create({
        organizacao_id: 1,
        usuario_id: 1,
        numero: "DEBUG-TEST",
        produto: "Teste debug",
        quantidade: 5,
        estado: "aguardando",
      }, { transaction: t });
      console.log("CRIADA id:", ordem.id, "deleted:", ordem.deleted);
      await PreImpressao.create({ organizacao_id: 1, ordem_producao_id: ordem.id }, { transaction: t });
      await t.commit();

      const completa = await OrdemProducao.findByPk(ordem.id, {
        include: [Cliente, Orcamento, PreImpressao, Impressao, Acabamento, Qualidade, ReservaEstoque],
      });
      console.log("findByPk result:", completa ? "FOUND" : "NULL");
      if (completa) console.log("numero:", completa.numero);

      // Try without includes
      const simples = await OrdemProducao.findByPk(ordem.id);
      console.log("findByPk simples:", simples ? "FOUND id=" + simples.id + " deleted=" + simples.deleted : "NULL");

      // Try with unscoped
      const unscoped = await OrdemProducao.unscoped().findByPk(ordem.id);
      console.log("findByPk unscoped:", unscoped ? "FOUND id=" + unscoped.id + " deleted=" + unscoped.deleted : "NULL");

      // Cleanup
      await OrdemProducao.destroy({ where: { id: ordem.id } });
      await PreImpressao.destroy({ where: { ordem_producao_id: ordem.id } });
    } catch (e) {
      await t.rollback();
      console.log("TRANSACAO ERRO:", e.message);
      if (e.sql) console.log("SQL:", e.sql);
    }
  } catch (e) {
    console.log("ERRO:", e.message);
  } finally {
    await sequelize.close();
  }
})();
