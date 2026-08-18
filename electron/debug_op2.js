process.env.Lang = "sqlite";
process.env.Sqlite_File = "C:/Users/PC/AppData/Roaming/sigraf-desktop/sgg.sqlite";
process.env.SECRET = "test";
const path = require("path");
const backendDir = path.join(__dirname, "backend");
const sequelize = require(path.join(backendDir, "config"));
const { OrdemProducao, PreImpressao, Cliente, Orcamento, Impressao, Acabamento, Qualidade, ReservaEstoque } = require(path.join(backendDir, "models"));

// Temporarily enable SQL logging
const origLog = sequelize.options.logging;
sequelize.options.logging = (sql) => console.log("SQL:", sql);

(async () => {
  try {
    const id = 1438953698;
    console.log("\n--- COM INCLUDES (defaultScope nos modelos) ---");
    const r1 = await OrdemProducao.findByPk(id, {
      include: [Cliente, Orcamento, PreImpressao, Impressao, Acabamento, Qualidade, ReservaEstoque],
    });
    console.log("RESULT:", r1 ? "FOUND" : "NULL");

    console.log("\n--- COM INCLUDES (unscoped nos incluidos) ---");
    const r2 = await OrdemProducao.findByPk(id, {
      include: [
        Cliente.unscoped(),
        Orcamento.unscoped(),
        PreImpressao.unscoped(),
        Impressao.unscoped(),
        Acabamento.unscoped(),
        Qualidade.unscoped(),
        ReservaEstoque.unscoped(),
      ],
    });
    console.log("RESULT:", r2 ? "FOUND" : "NULL");

    console.log("\n--- COM INCLUDES (required:false) ---");
    const r3 = await OrdemProducao.findByPk(id, {
      include: [
        { model: Cliente, required: false },
        { model: Orcamento, required: false },
        { model: PreImpressao, required: false },
        { model: Impressao, required: false },
        { model: Acabamento, required: false },
        { model: Qualidade, required: false },
        { model: ReservaEstoque, required: false },
      ],
    });
    console.log("RESULT:", r3 ? "FOUND" : "NULL");
  } catch (e) {
    console.log("ERRO:", e.message);
  } finally {
    sequelize.options.logging = origLog;
    await sequelize.close();
  }
})();
