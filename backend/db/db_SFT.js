require('dotenv').config()
const sql = require('mssql')

const config = {
  user: process.env.MSDB_USER,
  password: process.env.MSDB_PASS,
  server: process.env.MSDB_HOST,
  port: parseInt(process.env.MSDB_PORT),
  database: process.env.DB_SFT,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
}

const pool = new sql.ConnectionPool(config)
module.exports = pool.connect()
