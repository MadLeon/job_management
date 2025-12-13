#!/usr/bin/env node

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve to project root's data directory
// Get the actual project root from process.cwd() to avoid .next compilation issues
const projectRoot = process.cwd();
const dbPath = process.env.DB_PATH || path.join(projectRoot, 'data', 'jobs.db');
const migrationsDir = path.join(__dirname, 'migrations');

/**
 * 获取表的完整 CREATE TABLE 语句
 */
function getCreateTableSQL(db, tableName) {
  const result = db.prepare(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName);

  return result ? result.sql : null;
}

/**
 * 从现有数据库生成迁移文件
 */
function generateMigrationsFromDB() {
  if (!fs.existsSync(dbPath)) {
    console.error(`✗ 数据库文件不存在: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  // 获取所有表（排除 sqlite_sequence）
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();

  if (tables.length === 0) {
    console.log('⊘ 数据库中没有表');
    db.close();
    return;
  }

  console.log(`\n📊 找到 ${tables.length} 个表\n`);

  // 为每个表创建迁移文件
  tables.forEach((table, index) => {
    const tableName = table.name;
    const createSQL = getCreateTableSQL(db, tableName);

    if (!createSQL) {
      console.error(`✗ 无法获取 ${tableName} 的 CREATE TABLE 语句`);
      return;
    }

    // 生成迁移文件名和编号
    const migrationNum = String(index + 1).padStart(3, '0');
    const migrationName = `${migrationNum}_create_${tableName}_table`;
    const migrationFile = path.join(migrationsDir, `${migrationName}.js`);

    // 如果文件已存在，跳过
    if (fs.existsSync(migrationFile)) {
      console.log(`⊘ ${migrationName}.js - 已存在，跳过`);
      return;
    }

    // 生成迁移文件内容
    const content = `/**
 * 迁移: ${migrationName}
 * 创建 ${tableName} 表
 */

export const name = '${migrationName}';

export function up(db) {
  db.exec(\`
    ${createSQL}
  \`);
  console.log('✓ 创建表: ${tableName}');
}

export function down(db) {
  db.exec(\`DROP TABLE IF EXISTS ${tableName}\`);
  console.log('✓ 删除表: ${tableName}');
}
`;

    fs.writeFileSync(migrationFile, content);
    console.log(`✓ 生成迁移: ${migrationName}.js`);
  });

  db.close();
  console.log(`\n✓ 迁移文件生成完成\n运行 npm run db:migrate 来应用迁移\n`);
}

/**
 * 主入口
 */
function main() {
  console.log('🔧 初始化数据库迁移系统...\n');
  generateMigrationsFromDB();
}

main();
