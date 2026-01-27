import Database from 'better-sqlite3';

const db = new Database('data/record.db');

console.log('=== Order Item Constraints ===\n');

const indices = db.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE type='index' AND tbl_name='order_item'
`).all();

console.log('Indices:');
indices.forEach(idx => {
  console.log(`  ${idx.sql || '(no definition)'}`);
});

console.log('\n=== Table Definition ===\n');
const tabledef = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='order_item'`).get();
console.log(tabledef.sql);

db.close();
