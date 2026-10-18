import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

let Database = null;
try {
  const sqliteMod = await import('better-sqlite3');
  Database = sqliteMod.default || sqliteMod;
} catch (e) {
  // SQLite is optional fallback if MySQL is configured
}

const dbType = process.env.DB_TYPE || 'mysql';
let mysqlPool = null;
let sqliteDb = null;

// Normalizes SQL between dialects (SQLite <-> MySQL)
export function normalizeSql(sql) {
  if (!sql) return '';
  return sql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/datetime\('now',\s*'\+30 days'\)/gi, 'DATE_ADD(NOW(), INTERVAL 30 DAY)')
    .replace(/datetime\('now',\s*'-2 days'\)/gi, 'DATE_SUB(NOW(), INTERVAL 2 DAY)')
    .replace(/datetime\('now',\s*'\+1 hours'\)/gi, 'DATE_ADD(NOW(), INTERVAL 1 HOUR)')
    .replace(/datetime\('now',\s*'\+24 hours'\)/gi, 'DATE_ADD(NOW(), INTERVAL 24 HOUR)');
}

const isProd = process.env.NODE_ENV === 'production';
const allowSqliteFallback = !isProd || process.env.DB_FALLBACK_SQLITE === 'true';

const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);
const dbUser = process.env.DB_USER || process.env.MYSQL_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD || '');
const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'sack';
const dbSocketPath = process.env.DB_SOCKET_PATH || null;
const dbConnectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);

// 1. Initialize MySQL Connection Pool if DB_TYPE is mysql
if (dbType === 'mysql') {
  try {
    const poolConfig = {
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: dbConnectionLimit,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true
    };

    if (dbSocketPath) {
      poolConfig.socketPath = dbSocketPath;
    } else {
      poolConfig.host = dbHost;
      poolConfig.port = dbPort;
    }

    mysqlPool = mysql.createPool(poolConfig);
    console.log(`[Database] Initialized MySQL pool for \`${dbName}\` (${dbSocketPath ? `socket: ${dbSocketPath}` : `${dbHost}:${dbPort}`})`);
  } catch (err) {
    console.error('[Database] Failed to initialize MySQL pool:', err.message);
  }
}

// 2. Initialize SQLite as fallback if needed
function getSqliteDb() {
  if (!sqliteDb) {
    if (!Database) {
      throw new Error('[Database] SQLite is not available. Please ensure MySQL credentials are provided in .env');
    }
    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dbPath = process.env.DB_PATH || path.join(dataDir, 'modelar.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.pragma('journal_mode = WAL');
  }
  return sqliteDb;
}

export async function queryOne(sql, params = []) {
  if (mysqlPool) {
    try {
      const normalized = normalizeSql(sql);
      const [rows] = await mysqlPool.query(normalized, params);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      if (allowSqliteFallback && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR')) {
        console.warn(`[Database] MySQL unavailable (${err.code}), falling back to SQLite`);
        mysqlPool = null;
        return queryOne(sql, params);
      }
      throw err;
    }
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    return stmt.get(params);
  }
}

export async function queryAll(sql, params = []) {
  if (mysqlPool) {
    try {
      const normalized = normalizeSql(sql);
      const [rows] = await mysqlPool.query(normalized, params);
      return rows || [];
    } catch (err) {
      if (allowSqliteFallback && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR')) {
        console.warn(`[Database] MySQL unavailable (${err.code}), falling back to SQLite`);
        mysqlPool = null;
        return queryAll(sql, params);
      }
      throw err;
    }
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    return stmt.all(params);
  }
}

export async function execute(sql, params = []) {
  if (mysqlPool) {
    try {
      const normalized = normalizeSql(sql);
      const [result] = await mysqlPool.query(normalized, params);
      return {
        changes: result.affectedRows,
        affectedRows: result.affectedRows,
        insertId: result.insertId,
        lastInsertRowid: result.insertId
      };
    } catch (err) {
      if (allowSqliteFallback && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR')) {
        console.warn(`[Database] MySQL unavailable (${err.code}), falling back to SQLite`);
        mysqlPool = null;
        return execute(sql, params);
      }
      throw err;
    }
  } else {
    const db = getSqliteDb();
    const stmt = db.prepare(sql);
    const result = stmt.run(params);
    return {
      changes: result.changes,
      affectedRows: result.changes,
      insertId: result.lastInsertRowid,
      lastInsertRowid: result.lastInsertRowid
    };
  }
}

export async function transaction(callback) {
  if (mysqlPool) {
    try {
      const conn = await mysqlPool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      if (allowSqliteFallback && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR')) {
        console.warn(`[Database] MySQL unavailable (${err.code}), falling back to SQLite transaction`);
        mysqlPool = null;
        return transaction(callback);
      }
      throw err;
    }
  } else {
    const db = getSqliteDb();
    const runTx = db.transaction(callback);
    return runTx();
  }
}

export default {
  queryOne,
  queryAll,
  execute,
  transaction,
  prepare: (sql) => getSqliteDb().prepare(sql),
  getSqliteDb,
  pool: mysqlPool
};
