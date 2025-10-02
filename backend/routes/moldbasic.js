const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SMS');

/** 查詢(清單) ?q=keyword&state=N/Y/V */
router.get('/moldbasic', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('q', sql.NVarChar, `%${q}%`);
    let where = 'WHERE (ME001 LIKE @q)';
    if (state) {
      request.input('state', sql.NVarChar, state);
      where += ' AND IssueState = @state';
    }
    const rs = await request.query(`
      SELECT ME001, ME002, ME003, ME004, ME005, ME006, ME007, ME008, ME009, ME010, ME011, ME012, ME013, ME014, ME015, IssueState, Creator, CreateDate
      FROM dbo.SMSME
      ${where}
      ORDER BY ME001
    `);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取單筆 */
router.get('/moldbasic/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT ME001, ME002, ME003, ME004, ME005, ME006, ME007, ME008, ME009, ME010, ME011, ME012, ME013, ME014, ME015, IssueState, Creator, CreateDate
        FROM dbo.SMSME WHERE ME001 = @id
      `);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rs.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 新增 - 修正版本 */
router.post('/moldbasic', async (req, res) => {
  console.log('=== 新增請求開始 ===');
  console.log('Request body:', req.body);
  
  const { ME001, ME002 = '', ME003 = '', ME004 = '', ME005 = '', ME006 = '', ME007 = '', ME008 = '', ME009 = '', 
          ME010 = '', ME011 = '', ME012 = '', ME013 = '', ME014 = '', ME015 = '', Creator = '' } = req.body;
  
  // 基本驗證
  if (!ME001 || typeof ME001 !== 'string' || !ME001.trim()) {
    console.log('ME001 驗證失敗:', ME001);
    return res.status(400).json({ error: 'ME001 is required and must be a non-empty string' });
  }
  
  try {
    console.log('嘗試取得資料庫連線...');
    const pool = await getPool();
    console.log('資料庫連線成功');
    
    console.log('準備執行 SQL...');
    console.log('參數:', {
      ME001: ME001.trim(),
      ME002: ME002 || '',
      ME003: ME003 || '',
      ME004: ME004 || '',
      ME005: ME005 || '',
      ME006: ME006 || '',
      ME007: ME007 || '',
      ME008: ME008 || '',
      ME009: ME009 || '',
      ME010: ME010 || '',
      ME011: ME011 || '',
      ME012: ME012 || '',
      ME013: ME013 || '',
      ME014: ME014 || '',
      ME015: ME015 || '',
      Creator: Creator || 'SYSTEM'
    });
    
    const request = pool.request();
    request.input('ME001', sql.NVarChar, ME001.trim());
    request.input('ME002', sql.NVarChar, ME002);
    request.input('ME003', sql.NVarChar, ME003);
    request.input('ME004', sql.NVarChar, ME004);
    request.input('ME005', sql.NVarChar, ME005);
    request.input('ME006', sql.NVarChar, ME006);
    request.input('ME007', sql.NVarChar, ME007);
    request.input('ME008', sql.NVarChar, ME008);
    request.input('ME009', sql.NVarChar, ME009);
    request.input('ME010', sql.NVarChar, ME010);
    request.input('ME011', sql.NVarChar, ME011);
    request.input('ME012', sql.NVarChar, ME012);
    request.input('ME013', sql.NVarChar, ME013);
    request.input('ME014', sql.NVarChar, ME014);
    request.input('ME015', sql.NVarChar, ME015);
    request.input('Creator', sql.NVarChar, Creator || 'SYSTEM');
    
    const result = await request.query(`
      INSERT INTO dbo.SMSME(ME001, ME002, ME003, ME004, ME005, ME006, ME007, ME008, ME009, ME010, ME011, ME012, ME013, ME014, ME015, IssueState, Creator, CreateDate)
      VALUES(@ME001, @ME002, @ME003, @ME004, @ME005, @ME006, @ME007, @ME008, @ME009, @ME010, @ME011, @ME012, @ME013, @ME014, @ME015, 'N', @Creator, GETDATE())
    `);
    
    console.log('SQL 執行成功:', result);
    console.log('=== 新增請求完成 ===');
    
    // 確保回應格式正確
    res.status(200).json({ 
      success: true,
      message: '新增成功',
      data: {
        ME001: ME001.trim(),
        ME002: ME002 || '',
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
        message: `模具種類 "${ME001}" 已存在`
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
const toIntOrNull = v => (v === '' || v == null) ? null : parseInt(String(v), 10);
const trimOrNull = v => (v == null ? null : String(v).trim());
const toDateOrNull = v => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

router.put('/moldbasic/:id', async (req, res) => {
  const id = (req.params.id || '').trim();
  const b  = req.body;

  console.log('收到修改請求:', { id, body: b });

  if (!id) return res.status(400).json({ error: 'ID is required' });

  try {
    const pool = await getPool();
    console.log('資料庫連線成功');

    // 1) 先確認記錄存在與狀態
    const rs = await pool.request()
      .input('id', sql.NVarChar(50), id)
      .query(`SELECT IssueState FROM dbo.SMSME WHERE ME001=@id`);

    if (rs.recordset.length === 0) {
      return res.status(404).json({ error: '記錄不存在' });
    }

    const curState = rs.recordset[0].IssueState;
    console.log('目前狀態:', curState);
    if (curState === 'Y' || curState === 'V') {
      return res.status(400).json({ error: '已核准或作廢的記錄不可修改' });
    }

    // 2) 正規化 payload（依照資料型態）
    const data = {
      ME002: trimOrNull(b.ME002),
      ME003: trimOrNull(b.ME003),
      ME004: trimOrNull(b.ME004),
      ME005: trimOrNull(b.ME005),
      ME006: toDateOrNull(b.ME006),          // DATE
      ME007: trimOrNull(b.ME007),
      ME008: toIntOrNull(b.ME008),           // NUMERIC(2,0)
      ME009: toIntOrNull(b.ME009),           // NUMERIC(2,0)
      ME010: toIntOrNull(b.ME010),           // NUMERIC(2,0)
      ME011: trimOrNull(b.ME011),
      ME012: toIntOrNull(b.ME012),           // NUMERIC(10,0)
      ME013: toIntOrNull(b.ME013),           // NUMERIC(10,0)
      ME014: toIntOrNull(b.ME014),           // NUMERIC(10,0)
      ME015: trimOrNull(b.ME015),            // NVARCHAR(1)
      IssueState: trimOrNull(b.IssueState) ?? curState,
      // 更新者/更新時間若有需要再加；Creator/CreateDate 一般僅 INSERT 時填
    };

    // 3) 參數化 + 正確型別
    const reqSql = pool.request()
      .input('ME001', sql.NVarChar(50), id)
      .input('ME002', sql.NVarChar(100), data.ME002)
      .input('ME003', sql.NVarChar(50),  data.ME003)
      .input('ME004', sql.NVarChar(50),  data.ME004)
      .input('ME005', sql.NVarChar(10),  data.ME005)
      .input('ME006', sql.Date,          data.ME006)
      .input('ME007', sql.NVarChar(50),  data.ME007)
      .input('ME008', sql.Int,           data.ME008)  // NUMERIC(2,0) 可用 Int 綁
      .input('ME009', sql.Int,           data.ME009)
      .input('ME010', sql.Int,           data.ME010)
      .input('ME011', sql.NVarChar(255), data.ME011)
      .input('ME012', sql.Int,           data.ME012)
      .input('ME013', sql.Int,           data.ME013)
      .input('ME014', sql.Int,           data.ME014)
      .input('ME015', sql.NVarChar(1),   data.ME015)
      .input('IssueState', sql.NVarChar(1), data.IssueState);

    // 4) 真正更新所有欄位
    const result = await reqSql.query(`
      UPDATE dbo.SMSME SET
        ME002=@ME002, ME003=@ME003, ME004=@ME004, ME005=@ME005, ME006=@ME006,
        ME007=@ME007, ME008=@ME008, ME009=@ME009, ME010=@ME010, ME011=@ME011,
        ME012=@ME012, ME013=@ME013, ME014=@ME014, ME015=@ME015,
        IssueState=@IssueState
      WHERE ME001=@ME001;
    `);

    console.log('修改成功:', result.rowsAffected);
    return res.json({ success: true, message: '修改成功' });

  } catch (err) {
    console.error('修改錯誤:', err);
    return res.status(500).json({
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
});

/** 刪除（僅未核准/未作廢可刪） */
router.delete('/moldbasic/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSME WHERE ME001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    const state = rs.recordset[0].IssueState;
    if (state !== 'N') return res.status(400).json({ error: 'only N can delete' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`DELETE FROM dbo.SMSME WHERE ME001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 複製：以既有鍵 + 後綴產生新鍵 */
router.post('/moldbasic/:id/copy', async (req, res) => {
  const { newId } = req.body; // 前端提供新 ME001
  try {
    const pool = await getPool();
    const src = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT * FROM dbo.SMSME WHERE ME001=@id`);
    if (src.recordset.length === 0) return res.status(404).json({ error: 'source not found' });

    const r = src.recordset[0];
    await pool.request()
      .input('ME001', sql.NVarChar, newId)
      .input('ME002', sql.NVarChar, r.ME002)
      .input('ME003', sql.NVarChar, r.ME003)
      .input('ME004', sql.NVarChar, r.ME004)
      .input('ME005', sql.NVarChar, r.ME005)
      .input('ME006', sql.NVarChar, r.ME006)
      .input('ME007', sql.NVarChar, r.ME007)
      .input('ME008', sql.NVarChar, r.ME008)
      .input('ME009', sql.NVarChar, r.ME009)
      .input('ME010', sql.NVarChar, r.ME010)
      .input('ME011', sql.NVarChar, r.ME011)
      .input('ME012', sql.NVarChar, r.ME012)
      .input('ME013', sql.NVarChar, r.ME013)
      .input('ME014', sql.NVarChar, r.ME014)
      .input('ME015', sql.NVarChar, r.ME015)
      .input('Creator', sql.NVarChar, r.Creator)
      .query(`
        INSERT INTO dbo.SMSME(ME001, ME002, ME003, ME004, ME005, ME006, ME007, ME008, ME009, ME010, ME011, ME012, ME013, ME014, ME015, IssueState, Creator, CreateDate)
        VALUES(@ME001, @ME002, @ME003, @ME004, @ME005, @ME006, @ME007, @ME008, @ME009, @ME010, @ME011, @ME012, @ME013, @ME014, @ME015, 'N', @Creator, GETDATE())
      `);
    res.json({ success: true, newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 核准 → IssueState = 'Y'（僅 N 可核准） */
router.post('/moldbasic/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSME WHERE ME001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'N') return res.status(400).json({ error: 'only N can approve' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSME SET IssueState='Y' WHERE ME001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 取消核准 → IssueState = 'N'（僅 Y 可取消） */
router.post('/moldbasic/:id/unapprove', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSME WHERE ME001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'Y') return res.status(400).json({ error: 'only Y can unapprove' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSME SET IssueState='N' WHERE ME001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 作廢 → IssueState = 'V'（N / Y 可作廢；作廢後不可再改） */
router.post('/moldbasic/:id/void', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSME WHERE ME001=@id`);
    if (rs.recordset.length === 0) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState === 'V') return res.status(400).json({ error: 'already void' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSME SET IssueState='V' WHERE ME001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
