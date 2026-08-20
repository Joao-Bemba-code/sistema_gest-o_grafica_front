const path = require('path');
const bd = path.join(process.env.APPDATA, 'sigraf-desktop');
process.env.Lang = 'sqlite';
process.env.SECRET = 'x';
process.env.Sqlite_File = path.join(bd, 'sgg.sqlite');
process.env.SIGRAF_UPLOADS = path.join(bd, 'uploads');
process.env.SIGRAF_DADOS = bd;
const { sequelize } = require(path.join(__dirname, 'backend', 'models'));

async function test() {
  const desde = new Date('1970-01-01T00:00:00.000Z');
  
  const [linhas] = await sequelize.query(
    "SELECT id, deleted, nome, updatedAt FROM `cliente` WHERE `updatedAt` > ? OR `deleted` = 1",
    { replacements: [desde] }
  );
  console.log('Query com OR deleted=1:', linhas.length, 'registos');
  for (const l of linhas) {
    console.log(`  id=${l.id} deleted=${l.deleted} nome=${l.nome} updatedAt=${l.updatedAt}`);
  }
  
  const [linhas2] = await sequelize.query(
    "SELECT id, deleted, nome, updatedAt FROM `cliente` WHERE `updatedAt` > ?",
    { replacements: [desde] }
  );
  console.log('\nQuery so updatedAt:', linhas2.length, 'registos');
  for (const l of linhas2) {
    console.log(`  id=${l.id} deleted=${l.deleted} nome=${l.nome} updatedAt=${l.updatedAt}`);
  }
  
  await sequelize.close();
}
test().catch(e => console.error(e));
