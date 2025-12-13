import Database from 'better-sqlite3';

const db = new Database('./data/jobs.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

if (tables.length > 0) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get();
  console.log('Jobs count:', count);

  const cols = db.pragma('table_info(jobs)');
  console.log('Jobs schema:');
  cols.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });

  const sample = db.prepare('SELECT * FROM jobs LIMIT 1').get();
  console.log('Sample data:', sample);
}

db.close();
