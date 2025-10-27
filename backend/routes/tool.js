require('dotenv').config()
const express = require('express');
const router = express.Router();
const sql = require('mssql')  // 不使用 getPool
const multer = require('multer');
const xlsx = require('xlsx');
console.log('✅ multer 載入成功');

// ✅ 獨立資料庫連線設定（確保 port 是 number）
const overrideConfig = {
  user: process.env.MSDB_USER,
  password: process.env.MSDB_PASS,
  server: process.env.MSDB_HOST,
  port: parseInt(process.env.MSDB_PORT, 10), // 🔥 避免 TypeError
  database: process.env.MSDB_SPI,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

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

    // 4. 建立 SQL 連線並查詢
    const pool = await sql.connect(overrideConfig);
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
    return res.status(500).json({ error: '內部伺服器錯誤' });
  }
});

router.post('/tool/import', async (req, res) => {
  let pool;
  const { updates, inserts } = req.body;

  try {
    pool = await sql.connect(overrideConfig);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

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
        .input('單價', sql.Decimal(18, 4), row['數量單價'])
        .query(`
          INSERT INTO dbo.南化ERP品號與TDF原物料編號對照檔
          (南化ERP品號, TDF原物料編號, 數量單價)
          VALUES (@品號, @原料編號, @單價)
        `);
    }

    await transaction.commit();
    return res.json({ success: true });
  } catch (err) {
    console.error('❌ 匯入錯誤:', err);
    return res.status(500).json({ error: '內部錯誤：匯入失敗' });
  } finally {
    // 🧹 安全關閉資料庫連線（若支援）
    if (pool?.close) {
      try {
        await pool.close();
      } catch (e) {
        console.warn('⚠ 關閉 pool 時發生錯誤：', e.message);
      }
    }
  }
});


module.exports = router;
