import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importToMysql() {
  const sqlFilePath = path.resolve(__dirname, '../../sack.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('Connecting to MySQL on localhost:3306...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sack',
    multipleStatements: true
  });

  console.log('Connected! Splitting statements and executing...');
  
  // Split statements by semicolon while ignoring comments
  const lines = sqlContent.split('\n');
  const statements = [];
  let currentStmt = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.length === 0) continue;
    currentStmt += line + '\n';
    if (trimmed.endsWith(';')) {
      statements.push(currentStmt.trim());
      currentStmt = '';
    }
  }

  console.log(`Found ${statements.length} SQL statements to execute.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
    } catch (err) {
      console.error(`Error at statement #${i + 1}:`, err.message);
      console.error('Failed statement snippet:\n', stmt.slice(0, 300));
      await conn.end();
      process.exit(1);
    }
  }

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`\nSUCCESS! Created and verified ${tables.length} tables in \`sack\` database!`);
  for (const t of tables) {
    const name = Object.values(t)[0];
    const [countRow] = await conn.query(`SELECT count(*) as c FROM \`${name}\``);
    console.log(` - ${name}: ${countRow[0].c} records`);
  }

  await conn.end();
}

importToMysql().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
