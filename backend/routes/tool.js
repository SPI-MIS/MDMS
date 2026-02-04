require('dotenv').config()
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db/db_SPI');  // 使用 getPool
const multer = require('multer');
const xlsx = require('xlsx');
console.log('✅ multer 載入成功');

// ✅ multer 設定
const upload = multer({ storage: multer.memoryStorage() });

// ✅ 主鍵欄位
const KEY_COLUMNS = ['南化ERP品號', 'TDF原物料編號'];

router.post('/tool/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到 Excel 檔案' });

    // 1. 讀取 Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'Excel 無資料' });

    // 2. 整理 Excel 資料成 Map
    const excelMap = new Map();
    for (const row of rows) {
      const key = KEY_COLUMNS.map(k => row[k]).join('||');
      excelMap.set(key, row);
    }

    // 3. 建立查詢條件
    const keys = Array.from(excelMap.keys()).map(k => k.split('||'));
    const whereClauses = keys.map(
      ([v1, v2]) =>
        `(南化ERP品號 = N'${v1.replace("'", "''")}' AND TDF原物料編號 = N'${v2.replace("'", "''")}')`
    );
    const whereClause = whereClauses.join(' OR ');

    if (!whereClause) return res.status(400).json({ error: '查詢條件為空' });

    // 4. 使用 getPool 連線並查詢
    const pool = await getPool();
    const sqlQuery = `
      SELECT * FROM [dbo].[南化ERP品號與TDF原物料編號對照檔] WHERE ${whereClause}
    `;
    const dbRows = await pool.request().query(sqlQuery);

    // 5. 比對資料
    const updates = [];
    const inserts = [];

    for (const [key, excelRow] of excelMap.entries()) {
      const dbMatch = dbRows.recordset.find(
        r => r['南化ERP品號'] === excelRow['南化ERP品號'] &&
             r['TDF原物料編號'] === excelRow['TDF原物料編號']
      );

      if (dbMatch) {
        const oldPrice = dbMatch['數量單價'];
        const newPrice = excelRow['數量單價'];
        if (String(oldPrice) !== String(newPrice)) {
          updates.push({
            ...excelRow,
            舊數量單價: oldPrice
          });
        }
      } else {
        inserts.push(excelRow);
      }
    }

    return res.json({ updates, inserts });
  } catch (err) {
    console.error('❌ 預覽錯誤:', err);
    return res.status(500).json({ error: err.message || '內部伺服器錯誤' });
  }
});

router.post('/tool/import', async (req, res) => {
  const { updates, inserts } = req.body;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 🔁 處理 updates
      for (const row of updates) {
        const request = new sql.Request(transaction);
        await request
          .input('品號', sql.NVarChar, row['南化ERP品號'])
          .input('原料編號', sql.NVarChar, row['TDF原物料編號'])
          .input('單價', sql.Decimal(18, 4), row['數量單價'])
          .query(`
            UPDATE [dbo].[南化ERP品號與TDF原物料編號對照檔]
            SET 數量單價 = @單價
            WHERE 南化ERP品號 = @品號 AND TDF原物料編號 = @原料編號
          `);
      }

      // 🔁 處理 inserts
      for (const row of inserts) {
        const request = new sql.Request(transaction);
        await request
          .input('品號', sql.NVarChar, row['南化ERP品號'])
          .input('原料編號', sql.NVarChar, row['TDF原物料編號'])
          .input('原料名稱', sql.NVarChar, row['原物料名稱'])
          .input('單位', sql.NVarChar, row['數量單位'])
          .input('單價', sql.Decimal(18, 4), row['數量單價'])
          .query(`
            INSERT INTO [dbo].[南化ERP品號與TDF原物料編號對照檔]
            (南化ERP品號, TDF原物料編號, 原物料名稱, 數量單位, 數量單價)
            VALUES (@品號, @原料編號, @原料名稱, @單位, @單價)
          `);
      }

      await transaction.commit();
      return res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('❌ 匯入錯誤:', err);
    return res.status(500).json({ error: err.message || '內部錯誤：匯入失敗' });
  }
});

//----------------------------------------------------------------------------------
// ✅ 主鍵欄位
const QAKEY_COLUMNS = ['ME001', 'MM002'];

router.post('/tool/QApreview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到 Excel 檔案' });

    // 1. 讀取 Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'Excel 無資料' });

    // 2. 整理 Excel 資料成 Map
    const excelMap = new Map();
    for (const row of rows) {
      const key = KEY_COLUMNS.map(k => row[k]).join('||');
      excelMap.set(key, row);
    }

    // 3. 建立查詢條件
    const keys = Array.from(excelMap.keys()).map(k => k.split('||'));
    const whereClauses = keys.map(
      ([v1, v2]) =>
        `(ME001 = N'${v1.replace("'", "''")}' AND ME002 = N'${v2.replace("'", "''")}')`
    );
    const whereClause = whereClauses.join(' OR ');

    if (!whereClause) return res.status(400).json({ error: '查詢條件為空' });

    // 4. 使用 getPool 連線並查詢
    const pool = await getPool();
    const sqlQuery = `
      SELECT * FROM [dbo].[INVME] WHERE ${whereClause}
    `;
    const dbRows = await pool.request().query(sqlQuery);

    // 5. 比對資料
    const updates = [];
    const inserts = [];

    for (const [key, excelRow] of excelMap.entries()) {
      const dbMatch = dbRows.recordset.find(
        r => r['ME001'] === excelRow['品號'] &&
             r['ME002'] === excelRow['批號'] &&
             r['ME010'] !== excelRow['備註']
      );

      if (dbMatch) {
        const oldNote = dbMatch['ME010'];
        const newNote = excelRow['備註'];
        if (String(oldNote) !== String(newNote)) {
          updates.push({
            ...excelRow,
            舊備註: oldNote
          });
        }
      } else {
        inserts.push(excelRow);
      }
    }

    return res.json({ updates, inserts });
  } catch (err) {
    console.error('❌ 預覽錯誤:', err);
    return res.status(500).json({ error: err.message || '內部伺服器錯誤' });
  }
});

router.post('/tool/QAimport', async (req, res) => {
  const { updates, inserts } = req.body;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 🔁 處理 updates
      for (const row of updates) {
        const request = new sql.Request(transaction);
        await request
          .input('品號', sql.NVarChar, row['ME001'])
          .input('批號', sql.NVarChar, row['ME002'])
          .input('備註', sql.Decimal(18, 4), row['ME010'])
          .query(`
            UPDATE [dbo].[INVME]
            SET ME010 = @備註
            WHERE ME001 = @品號 AND ME002 = @批號
          `);
      }

      // 🔁 處理 inserts
      for (const row of inserts) {
        const request = new sql.Request(transaction);
        await request
          .input('品號', sql.NVarChar, row['ME001'])
          .input('批號', sql.NVarChar, row['ME002'])
          .input('備註', sql.Decimal(18, 4), row['ME010'])
          .query(`
            INSERT INTO [dbo].[INVME]
            (品號, 批號, 原物料名稱, 數量單位, 數量單價)
            VALUES (@品號, @原料編號, @原料名稱, @單位, @單價)
          `);
      }

      await transaction.commit();
      return res.json({ success: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('❌ 匯入錯誤:', err);
    return res.status(500).json({ error: err.message || '內部錯誤：匯入失敗' });
  }
});

module.exports = router;