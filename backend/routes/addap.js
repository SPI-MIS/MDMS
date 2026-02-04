const express = require('express');
const router = express.Router();
const pool = require('../db/db_addap');

router.get('/exNo', async (req, res) => {
  const { line } = req.query;
  console.log('[addap] /exNo called, line =', line);
  
  try {
    // 使用 CONCAT 組合 f07 和 f08
    let query = `
      SELECT 
        f07,
        f08,
        CONCAT(f07, '-', f08 ,'【', f19,'】') as label,
        f10
      FROM case007c 
      WHERE f22 = 0
    `;
    const params = [];
    
    if (line) {
      query += ` AND f07 LIKE ?`;
      params.push(`${line}%`);
    }
    
    console.log('[addap] Query:', query);
    console.log('[addap] Params:', params);
    
    const [rows] = await pool.query(query, params);
      
    console.log('[addap] exNo count =', rows.length);
    if (rows.length > 0) {
      console.log('[addap] first record =', rows[0]);
    }
    
    res.json(rows);
  } catch (err) {
    console.error('[addap /exNo] Error:', err.message);
    res.status(500).json({ 
      error: 'db_error', 
      message: err.message
    });
  }
});

router.post('/exclusion/save', async (req, res) => {
  const { records } = req.body;
  
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'no_data', message: '沒有要儲存的資料' });
  }
  
  console.log('[exclusion] saving records:', records.length);
  
  try {
    // 開始交易
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      for (const record of records) {
        await connection.query(
          `INSERT INTO your_table_name 
           (date, line, M_no, ex_no, duration, class_no, remark) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            record.date,
            record.line,
            record.M_no,
            record.ex_no,
            record.duration,
            record.class_no,
            record.remark || null
          ]
        );
      }
      
      // 提交交易
      await connection.commit();
      connection.release();
      
      console.log('[exclusion] saved successfully:', records.length);
      res.json({ success: true, count: records.length });
    } catch (err) {
      // 回滾交易
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    console.error('[exclusion] save error:', err);
    res.status(500).json({ 
      error: 'db_error', 
      message: err.message 
    });
  }
});

module.exports = router;