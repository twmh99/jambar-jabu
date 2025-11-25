require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'db-init.sql'), 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query(sql);
  await pool.end();
  console.log('DB init done');
}
main().catch(e => { console.error(e); process.exit(1); });
