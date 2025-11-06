// backend/db/db_SMS.js
require('dotenv').config()
const sql = require('mssql')

const config = {
  user: process.env.MSDB_USER,
  password: process.env.MSDB_PASS,
  server: process.env.MSDB_HOST,
  port: process.env.MSDB_PORT ? parseInt(process.env.MSDB_PORT, 10) : 1433,
  database: process.env.MSDB_SMS,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 5000
  }
}

// ⚠️ 不使用全域 pool，確保每次查詢都建立新 session
async function getPool () {
  try {
    const pool = await sql.connect(config)
    return pool
  } catch (err) {
    console.error('❌ SQL Connect Error:', err)
    throw err
  }
}

module.exports = { sql, getPool }
