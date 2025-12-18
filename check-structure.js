import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'data', 'jobs.db'));

// 获取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

tables.forEach(t => {
  console.log('TABLE: ' + t.name);
  const cols = db.pragma('table_info(' + t.name + ')');
  cols.forEach(col => {
    let typeStr = col.type || 'TEXT';
    let notNull = col.notnull ? ' NOT NULL' : '';
    let pk = col.pk ? ' PRIMARY KEY' : '';
    console.log('  - ' + col.name + ' (' + typeStr + ')' + notNull + pk);
  });
  console.log('');
});

db.close();
