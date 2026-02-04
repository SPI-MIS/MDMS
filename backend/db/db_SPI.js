require('dotenv').config()
const sql = require('mssql')

const config = {
  user: process.env.MSDB_USER,
  password: process.env.MSDB_PASS,
  server: process.env.MSDB_HOST,
  port: parseInt(process.env.MSDB_PORT, 10),
  database: process.env.MSDB_SPI,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
}

let pool // 單例

async function getPool () {
  if (pool?.connected) return pool
  if (pool) { try { await pool.close() } catch (_) {} }
  // Create a dedicated ConnectionPool instance to avoid mssql global pool conflicts
  pool = await new sql.ConnectionPool(config).connect()
  return pool
}

module.exports = { sql, getPool }