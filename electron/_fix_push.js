const path = require('path');
const bd = path.join(process.env.APPDATA, 'sigraf-desktop');
process.env.Lang = 'sqlite';
process.env.SECRET = 'x';
process.env.Sqlite_File = path.join(bd, 'sgg.sqlite');
process.env.SIGRAF_UPLOADS = path.join(bd, 'uploads');
process.env.SIGRAF_DADOS = bd;
const { sequelize } = require(path.join(__dirname, 'backend', 'models'));

async function fix() {
  // Touch all deleted records so the push sends them
  const tables = ['cliente', 'fornecedor', 'categoria', 'material'];
  for (const t of tables) {
    const [res] = await sequelize.query(`UPDATE "${t}" SET updatedAt = datetime('now') WHERE deleted = 1`);
    console.log(`${t}: ${res} registros deleted marcados para reenvio`);
  }
  await sequelize.close();
}
fix().catch(e => console.error(e));
