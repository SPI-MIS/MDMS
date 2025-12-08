const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SMS');

/** 查詢(清單) ?q=keyword&state=N/Y/V */
router.get('/vendor', async (req, res) => {
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
      SELECT MD001, MD002, MD003, MD004, MD005, MD006, MD007, MD008, MD009, IssueState, Creator, CreateDate
      FROM dbo.SMSMD
      ${where}
      ORDER BY MD001
    `);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取單筆 */
router.get('/vendor/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT MD001, MD002, MD003, MD004, MD005, MD006, MD007, MD008, MD009, IssueState, Creator, CreateDate
        FROM dbo.SMSMD WHERE MD001 = @id
      `);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rs.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 新增 - 修正版本 */
router.post('/vendor', async (req, res) => {
  console.log('=== 新增請求開始 ===');
  console.log('Request body:', req.body);
  
  const { MD001, MD002 = '', MD003 = '', MD004 = '', MD005 = '', MD006 = '', MD007 = '', MD008 = '', MD009 = '', Creator = '' } = req.body;
  
  // 基本驗證
  if (!MD001 || typeof MD001 !== 'string' || !MD001.trim()) {
    console.log('MD001 驗證失敗:', MD001);
    return res.status(400).json({ error: 'MD001 is required and must be a non-empty string' });
  }
  
  try {
    console.log('嘗試取得資料庫連線...');
    const pool = await getPool();
    console.log('資料庫連線成功');
    
    console.log('準備執行 SQL...');
    console.log('參數:', {
      MD001: MD001.trim(),
      MD002: MD002 || '',
      MD003: MD003 || '',
      MD004: MD004 || '',
      MD005: MD005 || '',
      MD006: MD006 || '',
      MD007: MD007 || '',
      MD008: MD008 || '',
      MD009: MD009 || '',
      Creator: Creator || 'SYSTEM'
    });
    
    const request = pool.request();
    request.input('MD001', sql.NVarChar, MD001.trim());
    request.input('MD002', sql.NVarChar, MD002);
    request.input('MD003', sql.NVarChar, MD003);
    request.input('MD004', sql.NVarChar, MD004);
    request.input('MD005', sql.NVarChar, MD005);
    request.input('MD006', sql.NVarChar, MD006);
    request.input('MD007', sql.NVarChar, MD007);
    request.input('MD008', sql.NVarChar, MD008);
    request.input('MD009', sql.NVarChar, MD009);
    request.input('Creator', sql.NVarChar, Creator || 'SYSTEM');
    
    const result = await request.query(`
      INSERT INTO dbo.SMSMD(MD001, MD002, MD003, MD004, MD005, MD006, MD007, MD008, MD009, IssueState, Creator, CreateDate)
      VALUES(@MD001, @MD002, @MD003, @MD004, @MD005, @MD006, @MD007, @MD008, @MD009, 'N', @Creator, GETDATE())
    `);
    
    console.log('SQL 執行成功:', result);
    console.log('=== 新增請求完成 ===');
    
    // 確保回應格式正確
    res.status(200).json({ 
      success: true,
      message: '新增成功',
      data: {
        MD001: MD001.trim(),
        MD002: MD002 || '',
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
        message: `模具種類 "${MD001}" 已存在`
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
router.put('/vendor/:id', async (req, res) => {
  console.log('收到修改請求:', { id: req.params.id, body: req.body });
  
  const { MD002 } = req.body;
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
      .query(`SELECT IssueState FROM dbo.SMSMD WHERE MD001=@id`);
    
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
      .input('id', sql.NVarChar, id.trim())
      .input('MD003', sql.NVarChar, MD003 || '')
      .input('MD004', sql.NVarChar, MD004 || '')
      .input('MD005', sql.NVarChar, MD005 || '')
      .input('MD006', sql.NVarChar, MD006 || '')
      .input('MD007', sql.NVarChar, MD007 || '')
      .input('MD008', sql.NVarChar, MD008 || '')
      .input('MD009', sql.NVarChar, MD009 || '')
      .input('MD010', sql.NVarChar, MD002 || '')
      .input('MD011', sql.NVarChar, MD003 || '')
      .input('MD012', sql.NVarChar, MD004 || '')
      .input('MD013', sql.NVarChar, MD005 || '')
      .input('MD014', sql.NVarChar, MD006 || '')
      .input('MD015', sql.NVarChar, MD007 || '')
      .input('MD016', sql.NVarChar, MD008 || '')
      .input('MD017', sql.NVarChar, MD009 || '')
      .input('MD018', sql.NVarChar, MD008 || '')
      .input('MD019', sql.NVarChar, MD009 || '')
      .query(`UPDATE dbo.SMSMD SET MD003=@MD003, MD004=@MD004, MD005=@MD005, 
                                   MD006=@MD006, MD007=@MD007, MD008=@MD008, 
                                   MD009=@MD009, MD010=@MD010, MD011=@MD011, 
                                   MD012=@MD012, MD013=@MD013, MD014=@MD014, 
                                   MD015=@MD015, MD016=@MD016, MD017=@MD017,
                                   MD018=@MD018, MD019=@MD019,
                                   IssueState=@IssueState WHERE MD001=@id`);
    
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
router.delete('/vendor/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMD WHERE MD001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    const state = rs.recordset[0].IssueState;
    if (state !== 'N') return res.status(400).json({ error: 'only N can delete' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`DELETE FROM dbo.SMSMD WHERE MD001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 複製：以既有鍵 + 後綴產生新鍵 */
router.post('/vendor/:id/copy', async (req, res) => {
  const { newId } = req.body; // 前端提供新 MD001
  try {
    const pool = await getPool();
    const src = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT * FROM dbo.SMSMD WHERE MD001=@id`);
    if (src.recordset.length === 0) return res.status(404).json({ error: 'source not found' });

    const r = src.recordset[0];
    await pool.request()
      .input('MD001', sql.NVarChar, newId)
      .input('MD002', sql.NVarChar, r.MD002)
      .input('MD006', sql.NVarChar, r.MD003)
      .input('MD004', sql.NVarChar, r.MD004)
      .input('MD005', sql.NVarChar, r.MD005)
      .input('MD006', sql.NVarChar, r.MD006)
      .input('MD007', sql.NVarChar, r.MD007)
      .input('MD008', sql.NVarChar, r.MD008)
      .input('MD009', sql.NVarChar, r.MD009)
      .input('Creator', sql.NVarChar, r.Creator)
      .query(`
        INSERT INTO dbo.SMSMD(MD001, MD002,MD003, MD004, MD005, MD006, MD007, MD008, MD009, IssueState, Creator, CreateDate)
        VALUES(@MD001, @MD002, 'N', @Creator, GETDATE())
      `);
    res.json({ success: true, newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 核准 → IssueState = 'Y'（僅 N 可核准） */
router.post('/vendor/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMD WHERE MD001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'N') return res.status(400).json({ error: 'only N can approve' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMD SET IssueState='Y' WHERE MD001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取消核准 → IssueState = 'N'（僅 Y 可取消） */
router.post('/vendor/:id/unapprove', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMD WHERE MD001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'Y') return res.status(400).json({ error: 'only Y can unapprove' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMD SET IssueState='N' WHERE MD001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 作廢 → IssueState = 'V'（N / Y 可作廢；作廢後不可再改） */
router.post('/vendor/:id/void', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSMD WHERE MD001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState === 'V') return res.status(400).json({ error: 'already void' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSMD SET IssueState='V' WHERE MD001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
