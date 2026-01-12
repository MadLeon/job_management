import Database from 'better-sqlite3';

const db = new Database('./data/record.db');

// 查找drawing_number=052PLNAY01的part
const part = db.prepare(`
  SELECT id, drawing_number FROM part WHERE drawing_number = '052PLNAY01' LIMIT 1
`).get();

console.log('🔍 Part信息:', part);

// 查找file_name中包含这个drawing_number的drawing_file
if (part) {
  const dfs = db.prepare(`
    SELECT id, file_name, file_path FROM drawing_file WHERE file_name LIKE ? LIMIT 5
  `).all(`%${part.drawing_number}%`);
  console.log(`找到的drawing_file: ${dfs.length} 个`);
  if (dfs.length > 0) {
    console.log('示例:', dfs);
  }
}

db.close();
