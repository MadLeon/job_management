#!/usr/bin/env node

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, 'data', 'jobs.db');
const migrationsDir = path.join(__dirname, 'migrations');
const migrationsRecordPath = path.join(projectRoot, 'data', 'migrations.json');

/**
 * 读取迁移记录
 */
function getMigrationsRecord() {
  if (!fs.existsSync(migrationsRecordPath)) {
    return { version: 1, migrations: [] };
  }
  return JSON.parse(fs.readFileSync(migrationsRecordPath, 'utf-8'));
}

/**
 * 保存迁移记录
 */
function saveMigrationsRecord(record) {
  fs.writeFileSync(migrationsRecordPath, JSON.stringify(record, null, 2));
}

/**
 * 获取所有迁移文件
 */
async function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();
  return files;
}

/**
 * 执行迁移（UP）
 */
async function migrateUp() {
  const db = new Database(dbPath);
  const record = getMigrationsRecord();
  const appliedNames = new Set(record.migrations.map(m => m.name));
  const files = await getMigrationFiles();

  let count = 0;
  for (const file of files) {
    const migrationName = file.replace('.js', '');

    if (appliedNames.has(migrationName)) {
      console.log(`⊘ ${migrationName} - 已应用`);
      continue;
    }

    try {
      const module = await import(pathToFileURL(path.join(migrationsDir, file)).href);

      if (!module.up) {
        console.error(`✗ ${migrationName} - 缺少 up 函数`);
        db.close();
        process.exit(1);
      }

      console.log(`⚙ 正在执行 ${migrationName}...`);
      module.up(db);

      record.migrations.push({
        name: migrationName,
        appliedAt: new Date().toISOString()
      });
      saveMigrationsRecord(record);

      console.log(`✓ ${migrationName} - 成功`);
      count++;
    } catch (error) {
      console.error(`✗ ${migrationName} - 失败:`, error.message);
      db.close();
      process.exit(1);
    }
  }

  db.close();
  console.log(`\n✓ 共执行 ${count} 个迁移`);
}

/**
 * 回滚迁移（DOWN）
 */
async function migrateDown() {
  const db = new Database(dbPath);
  const record = getMigrationsRecord();

  if (record.migrations.length === 0) {
    console.log('⊘ 没有要回滚的迁移');
    db.close();
    return;
  }

  const lastMigration = record.migrations[record.migrations.length - 1];
  const migrationName = lastMigration.name;
  const file = `${migrationName}.js`;
  const migrationPath = path.join(migrationsDir, file);

  if (!fs.existsSync(migrationPath)) {
    console.error(`✗ 迁移文件不存在: ${file}`);
    db.close();
    process.exit(1);
  }

  try {
    const module = await import(pathToFileURL(migrationPath).href);

    if (!module.down) {
      console.error(`✗ ${migrationName} - 缺少 down 函数`);
      db.close();
      process.exit(1);
    }

    console.log(`⚙ 正在回滚 ${migrationName}...`);
    module.down(db);

    record.migrations.pop();
    saveMigrationsRecord(record);

    console.log(`✓ ${migrationName} - 回滚成功`);
  } catch (error) {
    console.error(`✗ ${migrationName} - 回滚失败:`, error.message);
    db.close();
    process.exit(1);
  }

  db.close();
}

/**
 * 显示迁移状态
 */
async function migrateStatus() {
  const record = getMigrationsRecord();
  const files = await getMigrationFiles();
  const appliedNames = new Set(record.migrations.map(m => m.name));

  console.log('\n📊 迁移状态\n');
  console.log('已应用的迁移:');
  if (record.migrations.length === 0) {
    console.log('  (无)');
  } else {
    record.migrations.forEach(m => {
      const date = new Date(m.appliedAt).toLocaleString('zh-CN');
      console.log(`  ✓ ${m.name} - 应用于 ${date}`);
    });
  }

  const pending = files.filter(f => !appliedNames.has(f.replace('.js', '')));
  console.log('\n待应用的迁移:');
  if (pending.length === 0) {
    console.log('  (无)');
  } else {
    pending.forEach(f => {
      const name = f.replace('.js', '');
      console.log(`  ⚙ ${name}`);
    });
  }
  console.log();
}

/**
 * 主入口
 */
async function main() {
  const command = process.argv[2] || 'up';

  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;
      case 'down':
        await migrateDown();
        break;
      case 'status':
        await migrateStatus();
        break;
      default:
        console.log('用法: migrate.js [up|down|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();
