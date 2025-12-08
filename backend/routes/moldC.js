const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SMS');

/** 查詢(清單) ?q=keyword&state=N/Y/V */
router.get('/moldC', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('q', sql.NVarChar, `%${q}%`);
    let where = 'WHERE (MB001 LIKE @q OR MB003 LIKE @q)';
    if (state) {
      request.input('state', sql.NVarChar, state);
      where += ' AND IssueState = @state';
    }
    const rs = await request.query(`
      SELECT MB001, MB002, MB003, IssueState, Creator, CreateDate
      FROM dbo.SMSMB
      ${where}
      ORDER BY MB001
    `);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取單筆 */
router.get('/moldC/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT MB001, MB002, MB003, IssueState, Creator, CreateDate
        FROM dbo.SMSMB WHERE MB001 = @id
      `);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rs.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 新增 - 修正版本 */
router.post('/moldC', async (req, res) => {
  console.log('=== 新增請求開始 ===');
  console.log('Request body:', req.body);
  
  const { MB001, MB002 = 'N', MB003 = '', Creator = '' } = req.body;
  
  // 基本驗證
  if (!MB001 || typeof MB001 !== 'string' || !MB001.trim()) {
    console.log('MB001 驗證失敗:', MB001);
    return res.status(400).json({ error: 'MB001 is required and must be a non-empty string' });
  }
  
  try {
    console.log('嘗試取得資料庫連線...');
    const pool = await getPool();
    console.log('資料庫連線成功');
    
    console.log('準備執行 SQL...');
    console.log('參數:', {
      MB001: MB001.trim(),
      MB002: MB002,
      MB003: MB003 || '',
      Creator: Creator || 'SYSTEM'
    });
    
    const request = pool.request();
    request.input('MB001', sql.NVarChar, MB001.trim());
    request.input('MB002', sql.NVarChar, MB002);
    request.input('MB003', sql.NVarChar, MB003 || '');
    request.input('Creator', sql.NVarChar, Creator || 'SYSTEM');
    
    const result = await request.query(`
      INSERT INTO dbo.SMSMB(MB001, MB002, MB003, IssueState, Creator, CreateDate)
      VALUES(@MB001, @MB002, @MB003, 'N', @Creator, GETDATE())
    `);
    
    console.log('SQL 執行成功:', result);
    console.log('=== 新增請求完成 ===');
    
    // 確保回應格式正確
    res.status(200).json({ 
      success: true,
      message: '新增成功',
      data: {
        MB001: MB001.trim(),
        MB002: MB002,
        MB003: MB003 || '',
        Creator: Creator || 'SYSTEM'
      }
    });
    
  } catch (err) {
    console.error('=== 新增請求錯誤 ===');
    console.error('錯誤詳情:', err);
    console.error('錯誤號碼:', err.number);
    console.error('錯誤訊息:', err.message);
    
    // 處理特定錯誤
    if (err.number === 2627) {
      console.log('重複鍵值錯誤');
      return res.status(400).json({ 
        success: false,
        error: 'duplicate key',
        message: `模具種類 "${MB001}" 已存在`
      });
    }
    
    if (err.number === 515) {
      console.log('必要欄位為空錯誤');
      return res.status(400).json({ 
        success: false,
        error: 'required field missing',
        message: '必要欄位不能為空'
      });
    }
    
    // 一般錯誤
    console.log('一般伺服器錯誤');
    res.status(500).json({ 
      success: false,
      error: 'internal server error',
      message: err.message || '伺服器內部錯誤'
    });
  }
});

/** 修改 - 加強錯誤處理 */
router.put('/moldC/:id', async (req, res) => {
  console.log('收到修改請求:', { id: req.params.id, body: req.body });
  
  const { MB002, MB003 } = req.body;
  const id = req.params.id;
  
  if (!id || !id.trim()) {
    return res.status(400).json({ error: 'ID is required' });
  }
  
  try {
    const pool = await getPool();
    console.log('資料庫連線成功');
    
    // 檢查記錄是否存在及狀態
    const rs = await pool.request()
      .input('id', sql.NVarChar, id.trim())
      .query(`SELECT IssueState FROM dbo.SMSMB WHERE MB001=@id`);
    
    if (rs.recordset.length === 0) {
      console.error('記錄不存在:', id);
      return res.status(404).json({ error: '記錄不存在' });
    }
    
    const state = rs.recordset[0].IssueState;
    console.log('目前狀態:', state);
    
    if (state === 'Y' || state === 'V') {
      return res.status(400).json({ error: '已核准或作廢的記錄不可修改' });
    }

    // 執行更新
    const result = await pool.request()
      .input('MB002', sql.NVarChar, MB002 || 'N')
      .input('MB003', sql.NVarChar, MB003 || '')
      .input('id', sql.NVarChar, id.trim())
      .query(`UPDATE dbo.SMSMB SET MB002=@MB002, MB003=@MB003, IssueState=@IssueState WHERE MB001=@id`);
    
    console.log('修改成功:', result);
    res.json({ success: true, message: '修改成功' });
    
  } catch (err) {
    console.error('修改錯誤:', err);
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
});

/** 刪除（僅未核准/未作廢可刪） */
router.delete('/moldC/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMB WHERE MB001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    const state = rs.recordset[0].IssueState;
    if (state !== 'N') return res.status(400).json({ error: 'only N can delete' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`DELETE FROM dbo.SMSMB WHERE MB001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 複製：以既有鍵 + 後綴產生新鍵 */
router.post('/moldC/:id/copy', async (req, res) => {
  const { newId } = req.body; // 前端提供新 MB001
  try {
    const pool = await getPool();
    const src = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT * FROM dbo.SMSMB WHERE MB001=@id`);
    if (src.recordset.length === 0) return res.status(404).json({ error: 'source not found' });

    const r = src.recordset[0];
    await pool.request()
      .input('MB001', sql.NVarChar, newId)
      .input('MB002', sql.NVarChar, r.MB002)
      .input('MB003', sql.NVarChar, r.MB003)
      .input('Creator', sql.NVarChar, r.Creator)
      .query(`
        INSERT INTO dbo.SMSMB(MB001, MB002, MB003, IssueState, Creator, CreateDate)
        VALUES(@MB001, @MB002, @MB003, 'N', @Creator, GETDATE())
      `);
    res.json({ success: true, newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 核准 → IssueState = 'Y'（僅 N 可核准） */
router.post('/moldC/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMB WHERE MB001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'N') return res.status(400).json({ error: 'only N can approve' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMB SET IssueState='Y' WHERE MB001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取消核准 → IssueState = 'N'（僅 Y 可取消） */
router.post('/moldC/:id/unapprove', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMB WHERE MB001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'Y') return res.status(400).json({ error: 'only Y can unapprove' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMB SET IssueState='N' WHERE MB001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 作廢 → IssueState = 'V'（N / Y 可作廢；作廢後不可再改） */
router.post('/moldC/:id/void', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMB WHERE MB001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState === 'V') return res.status(400).json({ error: 'already void' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMB SET IssueState='V' WHERE MB001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
