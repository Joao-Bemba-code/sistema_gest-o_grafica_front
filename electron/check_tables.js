const DB = require('better-sqlite3')('C:/Users/PC/AppData/Roaming/sigraf-desktop/sgg.sqlite', { readonly: true });
const tabs = DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tabs.forEach(t => console.log(t.name));
DB.close();
