const path = require('path');
const bd = process.env.APPDATA ? path.join(process.env.APPDATA, 'sigraf-desktop') : 'C:\\Users\\PC\\AppData\\Roaming\\sigraf-desktop';
process.env.Lang = 'sqlite';
process.env.SECRET = 'x';
process.env.Sqlite_File = path.join(bd, 'sgg.sqlite');
process.env.SIGRAF_UPLOADS = path.join(bd, 'uploads');
process.env.SIGRAF_DADOS = bd;
const bdDir = path.join(__dirname, 'backend');
const { sequelize } = require(path.join(bdDir, 'models'));

async function test() {
  const [clientes] = await sequelize.query("SELECT id, nome, tipo, deleted, codigo FROM cliente ORDER BY id");
  console.log("=== CLIENTES LOCAIS ===");
  for (const c of clientes) {
    console.log(`  id=${c.id} | tipo=${c.tipo} | codigo=${c.codigo} | nome=${c.nome} | deleted=${c.deleted}`);
  }
  console.log(`Total: ${clientes.length}`);

  const [cats] = await sequelize.query("SELECT id, nome, familia, subfamilia, tipo, deleted FROM categoria ORDER BY id");
  console.log("\n=== CATEGORIAS LOCAIS ===");
  for (const c of cats) {
    console.log(`  id=${c.id} | nome=${c.nome} | familia=${c.familia} | tipo=${c.tipo} | deleted=${c.deleted}`);
  }
  console.log(`Total: ${cats.length}`);

  const [mats] = await sequelize.query("SELECT id, nome, codigo, deleted FROM material ORDER BY id");
  console.log("\n=== MATERIAIS LOCAIS ===");
  for (const m of mats) {
    console.log(`  id=${m.id} | codigo=${m.codigo} | nome=${m.nome} | deleted=${m.deleted}`);
  }
  console.log(`Total: ${mats.length}`);

  await sequelize.close();
}
test().catch(e => console.error(e));
