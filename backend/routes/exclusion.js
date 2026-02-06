const express = require('express');
const router = express.Router();
const pool = require('../db/db_addap');

/**
 * 將 ISO 8601 日期轉換為 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTimeForMySQL(dateValue) {
  if (!dateValue) return null;
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


router.get('/exclusion', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    let query = `SELECT * FROM case007d WHERE f07 >='2025-01-01'`;
    const params = [`%${q}%`, `%${q}%`];

    // if (state) {
    //   query += ' AND voteStatus = ?';
    //   params.push(state);
    // }

    // query += ' ORDER BY createdAt DESC';

    const [results] = await pool.query(query, params);
    
    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString())
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
