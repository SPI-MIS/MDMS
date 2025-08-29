// backend/routes/smssa.js
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SMS');

router.get('/user', async (req, res) => {
  const { q = '', state = '', role = '' } = req.query;
  try {
    const pool = await getPool();
    const r = pool.request();
    r.input('q', sql.NVarChar, `%${q}%`);

    let where = `WHERE (SA001 LIKE @q OR SA002 LIKE @q OR SA003 LIKE @q)`;
    if (state) {
      r.input('state', sql.NVarChar, state);
      where += ' AND IssueState = @state';
    }
    if (role) {
      r.input('role', sql.NVarChar, role);
      where += ' AND SA003 = @role';
    }

    const rs = await r.query(`
      SELECT SA001, SA002, SA003, SA004, IssueState, Creator, CreateDate
      FROM dbo.SMSSA
      ${where}
      ORDER BY SA001
    `);
    res.json(rs.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取單筆
router.get('/user/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query(`
        SELECT SA001, SA002, SA003, SA004, IssueState, Creator, CreateDate
        FROM dbo.SMSSA WHERE SA001 = @id
      `);
    if (!rs.recordset.length) return res.status(404).json({ error: 'not found' });
    res.json(rs.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增
router.post('/user', async (req, res) => {
  const {
    SA001, SA002 = '', SA003 = 'user', SA004 = 'N', SA005, SA006, SA007 = 'N',
    SA008 = 'N', SA009 = 'Y', SA0010 = 'N', SA0011 = 'N', SA0012 = 'N', SA0013 = 'N',
    Creator = 'SYSTEM'
  } = req.body;
  // console.log('payload:', payload);
  if (!SA001 || !String(SA001).trim()) {
    return res.status(400).json({ error: 'SA001 (帳號) 不可為空' });
  }
  try {
    const pool = await getPool();
    const r = pool.request();
    r.input('SA001', sql.NVarChar, SA001.trim());
    r.input('SA002', sql.NVarChar, SA002);
    r.input('SA003', sql.NVarChar, SA003);
    r.input('SA004', sql.NVarChar, SA004 === 'Y' ? 'Y' : 'N');
    r.input('SA005', sql.NVarChar, SA005);
    r.input('SA006', sql.NVarChar, SA006);
    // 若是管理者，權限全 Y；否則採用傳入值（預設 R=Y 其餘 N）
    const isMgr = SA004 === 'Y';
    r.input('SA008', sql.NVarChar, isMgr ? 'Y' : (SA008 === 'Y' ? 'Y' : 'N')); // C
    r.input('SA009', sql.NVarChar, isMgr ? 'Y' : (SA009 === 'Y' ? 'Y' : 'N')); // R
    r.input('SA0010', sql.NVarChar, isMgr ? 'Y' : (SA0010 === 'Y' ? 'Y' : 'N')); // U
    r.input('SA0011', sql.NVarChar, isMgr ? 'Y' : (SA0011 === 'Y' ? 'Y' : 'N')); // D
    r.input('SA0012', sql.NVarChar, isMgr ? 'Y' : (SA0012 === 'Y' ? 'Y' : 'N')); // A
    r.input('SA0013', sql.NVarChar, isMgr ? 'Y' : (SA0013 === 'Y' ? 'Y' : 'N')); // CA
    r.input('Creator', sql.NVarChar, Creator || 'SYSTEM');

    const result = await r.query(`
      INSERT INTO dbo.SMSSA (SA001, SA002, SA003, SA004, SA005, SA006, SA008, SA009, SA0010, SA0011, SA0012, SA0013, IssueState, Creator, CreateDate)
      VALUES (@SA001, @SA002, @SA003, @SA004, @SA005, @SA006, @SA008, @SA009, @SA0010, @SA0011, @SA0012, @SA0013, 'N', @Creator, GETDATE())
    `);

    res.json({
      success: true,
      message: '新增成功',
      data: {
        SA001, SA002, SA003, SA004: isMgr ? 'Y' : 'N', SA005, SA006,
        SA008: isMgr ? 'Y' : (SA008 || 'N'),
        SA009: isMgr ? 'Y' : (SA009 || 'Y'),
        SA0010: isMgr ? 'Y' : (SA0010 || 'N'),
        SA0011: isMgr ? 'Y' : (SA0011 || 'N'),
        SA0012: isMgr ? 'Y' : (SA0012 || 'N'),
        SA0013: isMgr ? 'Y' : (SA0013 || 'N'),
        IssueState: 'N', Creator
      }
    });
  } catch (err) {
    if (err.number === 2627) {
      return res.status(400).json({ error: 'duplicate key', message: `帳號 "${SA001}" 已存在` });
    }
    res.status(500).json({ error: err.message });
  }
});

// 修改（僅 N 可改）
router.put('/user/:id', async (req, res) => {
  const id = req.params.id?.trim();
  if (!id) return res.status(400).json({ error: 'ID is required' });
  const { SA002 = '', SA003 = 'user', SA004 = 'N' } = req.body;

  try {
    const pool = await getPool();
    const stateRs = await pool.request().input('id', sql.NVarChar, id)
      .query(`SELECT IssueState FROM dbo.SMSSA WHERE SA001=@id`);
    if (!stateRs.recordset.length) return res.status(404).json({ error: 'not found' });
    if (stateRs.recordset[0].IssueState !== 'N') {
      return res.status(400).json({ error: '僅 N(未確認) 可修改' });
    }

    const r = pool.request();
    r.input('SA002', sql.NVarChar, SA002);
    r.input('SA003', sql.NVarChar, SA003);
    r.input('SA004', sql.NVarChar, SA004 === 'Y' ? 'Y' : 'N');
    r.input('id', sql.NVarChar, id);

    const result = await r.query(`
      UPDATE dbo.SMSSA SET SA002=@SA002, SA003=@SA003, SA004=@SA004 WHERE SA001=@id
    `);
    res.json({ success: true, message: '修改成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 刪除（僅 N 可刪）
// routes/user.js 中的刪除改成這版
router.delete('/user/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const pool = await getPool();

    // 先檢查狀態
    const rs = await pool.request().input('id', sql.NVarChar, id)
      .query(`SELECT IssueState FROM dbo.SMSSA WHERE SA001=@id`);
    if (!rs.recordset.length) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'N') {
      return res.status(400).json({ error: '僅 N(未確認) 可刪除' });
    }

    // 嘗試刪除
    await pool.request().input('id', sql.NVarChar, id)
      .query(`DELETE FROM dbo.SMSSA WHERE SA001=@id`);

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /user/:id] id=', req.params.id, 'error=', err); // 👈 看後端 log
    // 外鍵衝突
    if (err.number === 547) {
      return res.status(409).json({
        error: 'fk_conflict',
        message: '此帳號已被其它資料參照，無法刪除（請先移除關聯資料或改為作廢）'
      });
    }
    res.status(500).json({ error: 'internal', message: err.message });
  }
});


// 核准 / 取消核准 / 作廢
router.post('/user/:id/approve', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSSA WHERE SA001=@id`);
    if (!rs.recordset.length) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'N') return res.status(400).json({ error: 'only N can approve' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSSA SET IssueState='Y' WHERE SA001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/:id/unapprove', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSSA WHERE SA001=@id`);
    if (!rs.recordset.length) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState !== 'Y') return res.status(400).json({ error: 'only Y can unapprove' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.user SET IssueState='N' WHERE SA001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/user/:id/void', async (req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`SELECT IssueState FROM dbo.SMSSA WHERE SA001=@id`);
    if (!rs.recordset.length) return res.status(404).json({ error: 'not found' });
    if (rs.recordset[0].IssueState === 'V') return res.status(400).json({ error: 'already void' });

    await pool.request().input('id', sql.NVarChar, req.params.id)
      .query(`UPDATE dbo.SMSSA SET IssueState='V' WHERE SA001=@id`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
