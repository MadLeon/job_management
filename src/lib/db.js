import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve to project root's data directory
// Get the actual project root from process.cwd() to avoid .next compilation issues
const projectRoot = process.cwd();
const dbPath = process.env.DB_PATH || path.join(projectRoot, 'data', 'record.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

/**
 * 初始化数据库连接
 * 注意：表结构由迁移系统创建（scripts/migrate.js）
 */
function initializeDatabase() {
  try {
    const db = new Database(dbPath);

    // 禁用 WAL 模式，改为传统的 DELETE 日志模式，使用 IMMEDIATE 事务隔离
    db.pragma('journal_mode = DELETE');
    db.pragma('foreign_keys = ON');
    db.pragma('transaction_isolation = IMMEDIATE');

    console.log('✓ Database connection established at:', dbPath);

    return db;
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    throw error;
  }
}

/**
 * 获取数据库实例（单例模式）
 */
function getDB() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

/**
 * 关闭数据库连接
 */
function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// 导出查询方法

/**
 * 获取所有作业编号（示例方法）
 * 注意：依赖于迁移系统创建的表结构
 */
export function getJobNumbers() {
  try {
    const db = getDB();
    return db.prepare("SELECT job_number FROM job").all();
  } catch (error) {
    console.warn('⚠ Could not fetch job numbers. Database may not be initialized:', error.message);
    return [];
  }
}

export default getDB;
export { closeDB };