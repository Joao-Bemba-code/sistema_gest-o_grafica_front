const path = require('path');
const bd = path.join(process.env.APPDATA, 'sigraf-desktop');
process.env.Lang = 'sqlite';
process.env.SECRET = 'x';
process.env.Sqlite_File = path.join(bd, 'sgg.sqlite');
process.env.SIGRAF_UPLOADS = path.join(bd, 'uploads');
process.env.SIGRAF_DADOS = bd;
const Database = require('better-sqlite3');
const db = new Database(path.join(bd, 'sgg.sqlite'));

const row = db.prepare("SELECT * FROM _sync_meta WHERE key = 'last_push_time'").get();
console.log('last_push_time:', row);

const desde = row ? row.value : '1970-01-01T00:00:00.000Z';
console.log('desde:', desde);

const linhas = db.prepare("SELECT id, deleted, nome, updatedAt FROM cliente WHERE updatedAt > ? OR deleted = 1").all(desde);
console.log('Would send:', linhas.length, 'records');
linhas.forEach(l => console.log(' ', JSON.stringify(l)));

// Also check what the UPDATE would look like
const allDel = db.prepare("SELECT id, deleted, nome, updatedAt FROM cliente WHERE deleted = 1").all();
console.log('\nAll deleted records:', allDel.length);
allDel.forEach(l => console.log(' ', JSON.stringify(l)));

db.close();
