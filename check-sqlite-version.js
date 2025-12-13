import Database from 'better-sqlite3';
import path from 'path';

const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'data', 'jobs.db');

const db = new Database(dbPath);

// 获取 SQLite 版本
const versionResult = db.prepare('SELECT sqlite_version()').get();
const version = versionResult['sqlite_version()'];

console.log(`\n📊 SQLite 版本: ${version}\n`);

// SQLite 3.35.0+ 支持 DROP COLUMN
const majorMinorPatch = version.split(' ')[0].split('.').map(Number);
const [major, minor, patch] = majorMinorPatch;
const versionNumber = major * 10000 + minor * 100 + patch;
const supportsDropColumn = versionNumber >= 33500; // 3.35.0

console.log(`✓ DROP COLUMN 支持: ${supportsDropColumn ? '✅ YES' : '❌ NO'}`);

if (supportsDropColumn) {
  console.log(`\n你可以使用这行代码来删除列:\n`);
  console.log(`  db.exec(\`ALTER TABLE jobs DROP COLUMN priority\`);\n`);
} else {
  console.log(`\n你的 SQLite 版本太旧，不支持 DROP COLUMN。`);
  console.log(`需要升级到 3.35.0 或更高版本。\n`);
}

db.close();
