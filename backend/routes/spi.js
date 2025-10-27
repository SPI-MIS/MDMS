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

const toAlnumUpper = s => String(s || '').toUpperCase();
router.get('/spi/:id', async (req, res) => {
  console.log('req =', req ,' ,res =', res);
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const raw = req.params.id ?? '';
    const id  = toAlnumUpper(raw);

    // 僅允許 A~Z / 0~9
    // if (!/^[A-Z0-9]+$/.test(id)) {
    //   return res.status(400).json({ error: 'invalid_id', message: '僅允許英數字' });
    // }
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`SELECT MA001, MA002 FROM SPI_20191231.dbo.PURMA WHERE MA001 = @id`);
      
    console.log('[SPI] using DB =', rs.recordset?.[0]?.dbname);
    if (!rs.recordset.length) {
      return res.status(404).json({ error: 'not found' });
    }
    

    res.json(rs.recordset[0]); // { VA001, VA002 }
  } catch (err) {
    console.error('[SPI /spi/:id]', { id, message: err.message, number: err.number, code: err.code });
    res.status(500).json({ error: 'db_error', message: err.message, number: err.number, code: err.code });
  }
});


module.exports = router;