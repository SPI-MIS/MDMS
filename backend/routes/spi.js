const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SPI');

/** 查詢(清單) ?q=keyword&state=N/Y/V */
router.get('/spi', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('q', sql.NVarChar, `%${q}%`);
    let where = 'WHERE (MD001 LIKE @q)';
    if (state) {
      request.input('state', sql.NVarChar, state);
      where += ' AND IssueState = @state';
    }
    const rs = await request.query(`
      SELECT MA001, MD002 FROM dbo.PURMA
      ${where}
      ORDER BY MA001
    `);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⚠️ 重要：machine 路由必須在 :id 之前
router.get('/machine', async (req, res) => {
  const { line } = req.query;  // 接收 line 參數
  console.log('[SPI] /machine called, line =', line);
  
  try {
    const pool = await getPool();
    
    // 根據是否有 line 參數構建不同的查詢
    let query = `SELECT MX001, MX002, MX003, MX004, MX005, MX006 FROM CMSMX WHERE MX004 != '0' AND MX002 != 'D'`;
    let rs;
    
    // 如果有 line 參數，添加篩選條件
    if (line) {
      query += ` AND MX002 = @line`;  // 假設 MX002 是生產線別欄位
      rs = await pool.request()
        .input('line', sql.NVarChar, line)
        .query(query);
    } else {
      rs = await pool.request().query(query);
    }
      
    console.log('[SPI] machine count =', rs.recordset.length);
    if (rs.recordset.length > 0) {
      console.log('[SPI] first record =', rs.recordset[0]);
    }
    
    res.json(rs.recordset);  // 直接返回原始資料
  } catch (err) {
    console.error('[SPI /machine] Error:', err.message);
    res.status(500).json({ 
      error: 'db_error', 
      message: err.message
    });
  }
});

// 動態路徑必須在所有具體路徑之後
const toAlnumUpper = s => String(s || '').toUpperCase();

router.get('/spi/:id', async (req, res) => {
  const rawId = req.params.id;
  console.log('[SPI] /spi/:id called with id =', rawId);
  
  if (!rawId || rawId.trim() === '') {
    return res.status(400).json({ error: 'id required' });
  }

  try {
    const id = toAlnumUpper(rawId);

    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`SELECT MA001, MA002 FROM SPI_20191231.dbo.PURMA WHERE MA001 = @id`);
      
    console.log('[SPI] query result count =', rs.recordset.length);
    
    if (!rs.recordset.length) {
      return res.status(404).json({ error: 'not_found', message: `找不到 ID: ${id}` });
    }
    
    res.json(rs.recordset[0]);
  } catch (err) {
    console.error('[SPI /spi/:id]', { 
      id: rawId, 
      message: err.message, 
      number: err.number, 
      code: err.code 
    });
    res.status(500).json({ 
      error: 'db_error', 
      message: err.message, 
      number: err.number, 
      code: err.code 
    });
  }
});

module.exports = router;