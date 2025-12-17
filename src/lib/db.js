import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Resolve to project root's data directory
// Get the actual project root from process.cwd() to avoid .next compilation issues
const projectRoot = process.cwd();
const dbPath = process.env.DB_PATH || path.join(projectRoot, 'data', 'jobs.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance = null;

/**
 * 初始化数据库并创建表
 */
function initializeDatabase() {
  try {
    const db = new Database(dbPath);

    // 禁用 WAL 模式，改为传统的 DELETE 日志模式，使用 IMMEDIATE 事务隔离
    db.pragma('journal_mode = DELETE');
    db.pragma('foreign_keys = ON');
    db.pragma('transaction_isolation = IMMEDIATE');

    console.log('✓ Database initialized successfully at:', dbPath);

    // 测试查询
    const testCount = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get();
    console.log('✓ Database has', testCount.cnt, 'jobs');

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

export function getJobNumbers() {
  const db = getDB();
  return db.prepare("SELECT job_number FROM jobs").all();
}

export default getDB;
export { closeDB };