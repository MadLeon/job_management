import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve('./data/jobs.db');

async function initializeDatabase() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

let dbInstance;

async function getDB() {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}

export async function getJobNumbers() {
  const db = await getDB();
  return db.all("SELECT job_number FROM jobs");
}

export default getDB;