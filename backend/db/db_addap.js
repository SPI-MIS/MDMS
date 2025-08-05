// ✅ 共用資料庫連線模組（供 API 使用）
require('dotenv').config()
const mysql = require('mysql2/promise')

// 使用 connection pool，比單次連線更穩定
const pool = mysql.createPool({
  host: process.env.MYDB_HOST,
  user: process.env.MYDB_USER,
  password: process.env.MYDB_PASS,
  database: process.env.MYDB_NAME,
  waitForConnections: true,
  connectionLimit: 10
})

module.exports = pool
