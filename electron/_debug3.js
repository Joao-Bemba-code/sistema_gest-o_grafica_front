const path = require('path');
const bd = path.join(process.env.APPDATA, 'sigraf-desktop');
process.env.Lang = 'sqlite';
process.env.SECRET = 'x';
process.env.Sqlite_File = path.join(bd, 'sgg.sqlite');
process.env.SIGRAF_UPLOADS = path.join(bd, 'uploads');
process.env.SIGRAF_DADOS = bd;

const Database = require('better-sqlite3');
const meta = new Database(path.join(bd, 'sigraf_sync.sqlite'));
const row = meta.prepare("SELECT valor FROM sync_meta WHERE chave = 'last_push_time'").get();
console.log('last_push_time:', row ? row.valor : 'N/A');
meta.close();

const { sequelize } = require(path.join(__dirname, 'backend', 'models'));

async function test() {
  const desde = row ? new Date(row.valor) : new Date('1970-01-01');
  console.log('desde:', desde.toISOString());

  const Model = sequelize.models.cliente;
  const cols = Object.keys(Model.rawAttributes).filter(a => !['id','createdAt','updatedAt','is_dirty'].includes(a));
  const temDel = cols.includes('deleted');
  const whereDel = temDel ? " OR `deleted` = 1" : "";
  const sql = "SELECT id, createdAt, `" + cols.join("`, `") + "`, updatedAt FROM `cliente` WHERE `updatedAt` > ?" + whereDel;
  console.log('\nSQL:', sql);
  console.log('Params:', [desde]);

  const [linhas] = await sequelize.query(sql, { replacements: [desde] });
  console.log('Results:', linhas.length);
  linhas.forEach(l => console.log(' ', l.id, 'del=' + l.deleted, l.nome, 'upd=' + l.updatedAt));
  
  await sequelize.close();
}
test().catch(e => console.error(e));
