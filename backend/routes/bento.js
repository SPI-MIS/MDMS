const express = require('express');
const router = express.Router();
const pool = require('../db/db_addap');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sql: mssql, getPool: getSPIPool } = require('../db/db_SPI');

// 初始化設定表、訂單表、訂單明細表，並執行資料遷移
;(async () => {
  try {
    // bento_settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(10) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    const defaults = [['lunch_end', '10:30'], ['dinner_start', '13:00'], ['dinner_end', '16:00']]
    for (const [key, value] of defaults) {
      await pool.query(
        'INSERT IGNORE INTO bento_settings (setting_key, setting_value) VALUES (?, ?)',
        [key, value]
      )
    }

    // bento_orders（不含 items 欄位）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        meal_type VARCHAR(20) NOT NULL,
        order_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // bento_order_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id VARCHAR(50),
        item_name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        vendor_name VARCHAR(100),
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES bento_orders(id) ON DELETE CASCADE
      )
    `)

    // 遷移舊的 items JSON 欄位
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bento_orders' AND COLUMN_NAME = 'items'
    `)

    if (cols.length > 0) {
      console.log('[bento] 偵測到舊的 items 欄位，開始遷移...')
      const [orders] = await pool.query('SELECT id, items FROM bento_orders WHERE items IS NOT NULL AND items != ""')

      for (const order of orders) {
        try {
          const [existing] = await pool.query(
            'SELECT COUNT(*) AS cnt FROM bento_order_items WHERE order_id = ?',
            [order.id]
          )
          if (existing[0].cnt > 0) continue // 已遷移，跳過

          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
          if (!Array.isArray(items)) continue

          for (const item of items) {
            await pool.query(
              `INSERT INTO bento_order_items (order_id, menu_item_id, item_name, price, vendor_name, quantity)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [order.id, item.id, item.name || '', item.price || 0, item.vendor || '', item.quantity || 1]
            )
          }
        } catch (e) {
          console.error(`[bento] 遷移訂單 ${order.id} 失敗:`, e.message)
        }
      }

      await pool.query('ALTER TABLE bento_orders DROP COLUMN items')
      console.log('[bento] 遷移完成，items 欄位已移除')
    }

    // 加班便當訂購權限表（誰可以下訂）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_overtime_permission (
        user_id VARCHAR(50) PRIMARY KEY,
        granted_by VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 加班便當適用人員名單（哪些人可被選為加班人員）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_overtime_eligible (
        user_id VARCHAR(50) PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        dept VARCHAR(100) DEFAULT '',
        position VARCHAR(100) DEFAULT '',
        email VARCHAR(200) DEFAULT '',
        added_by VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 加班便當訂購單（批次）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_overtime_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        created_by VARCHAR(50) NOT NULL,
        order_date DATE NOT NULL,
        overtime_workers TEXT,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 加班便當訂購明細
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bento_overtime_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        overtime_order_id INT NOT NULL,
        meal_type VARCHAR(20) NOT NULL,
        vendor_name VARCHAR(100),
        item_name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (overtime_order_id) REFERENCES bento_overtime_orders(id) ON DELETE CASCADE
      )
    `)
  } catch (err) {
    console.error('[bento] 初始化錯誤:', err.message)
  }
})()

// 設定快取（PUT /settings 時清除）
let settingsCache = null

async function getSettings() {
  if (settingsCache) return settingsCache
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM bento_settings')
  const s = {}
  rows.forEach(r => { s[r.setting_key] = r.setting_value })
  settingsCache = s
  return s
}

// 檢查訂購時間（讀取 DB 設定）
async function isValidOrderTime(mealType) {
  const s = await getSettings()
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const toMin = t => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m }

  if (mealType === 'lunch') return nowMin <= toMin(s.lunch_end || '10:30')
  if (mealType === 'dinner') {
    return nowMin >= toMin(s.dinner_start || '13:00') && nowMin < toMin(s.dinner_end || '16:00')
  }
  return false
}

// 檢查權限（SA004 為角色欄位：admin / manager / user）
function hasPermission(user) {
  if (!user) return false;
  return user.SA004 === 'admin' || user.SA004 === 'manager';
}

// 將查詢結果的 items 欄位確保為陣列
function parseItems(row) {
  if (!row) return row
  const items = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
  return { ...row, items }
}

// 創建訂單
router.post('/order', async (req, res) => {
  const { mealType, items } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: '未登入' });

  if (!await isValidOrderTime(mealType)) { return res.status(400).json({ error: '不在訂購時間內' }); }

  if (!Array.isArray(items) || items.length === 0) { return res.status(400).json({ error: '請選擇餐點' }); }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO bento_orders (user_id, meal_type, order_date, created_at)
       VALUES (?, ?, ?, NOW())`,
      [user.SA001, mealType, new Date()]
    );
    const orderId = result.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO bento_order_items (order_id, menu_item_id, item_name, price, vendor_name, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.price, item.vendor, item.quantity]
      );
    }

    await conn.commit();
    res.json({ success: true, message: '訂購成功', insertId: orderId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 取得菜單（供應商+品項）
router.get('/menu', async (req, res) => {
  console.log('📋 Menu route called', req.method, req.originalUrl);
  try {
    console.log('📋 Menu query start');
    const [rows] = await pool.query(`
      SELECT m.id, m.vendor_id, v.name AS vendor_name, m.item_name, m.price
      FROM bento_menu m
      JOIN bento_vendors v ON m.vendor_id = v.id
      ORDER BY v.name, m.item_name
    `);
    console.log('📋 Menu query done, records:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('📋 Menu route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 獲取用戶訂單
router.get('/orders', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: '未登入' });

  try {
    const [rows] = await pool.query(`
      SELECT bo.id, bo.user_id, bo.meal_type, bo.order_date, bo.created_at, bo.updated_at,
        JSON_ARRAYAGG(JSON_OBJECT(
          'id',        boi.menu_item_id,
          'name',      boi.item_name,
          'price',     boi.price,
          'vendor',    boi.vendor_name,
          'quantity',  boi.quantity
        )) AS items
      FROM bento_orders bo
      LEFT JOIN bento_order_items boi ON bo.id = boi.order_id
      WHERE bo.user_id = ?
      GROUP BY bo.id
      ORDER BY bo.created_at DESC
    `, [user.SA001]);

    res.json(rows.map(parseItems));
  } catch (err) {
    console.error('📋 /orders error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新訂單
router.put('/order/:id', async (req, res) => {
  const { id } = req.params;
  const { mealType, items } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: '未登入' });

  if (!await isValidOrderTime(mealType)) {
    return res.status(400).json({ error: '不在訂購時間內' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '請選擇餐點' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE bento_orders SET meal_type = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
      [mealType, id, user.SA001]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: '訂單不存在或無權限' });
    }

    await conn.query(`DELETE FROM bento_order_items WHERE order_id = ?`, [id]);

    for (const item of items) {
      await conn.query(
        `INSERT INTO bento_order_items (order_id, menu_item_id, item_name, price, vendor_name, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, item.id, item.name, item.price, item.vendor, item.quantity]
      );
    }

    await conn.commit();
    res.json({ success: true, message: '更新成功' });
  } 
  catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } 
  finally { conn.release(); }
});

// 刪除訂單（明細由 CASCADE 自動刪除）
router.delete('/order/:id', async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) return res.status(401).json({ error: '未登入' });

  try {
    const [result] = await pool.query(
      `DELETE FROM bento_orders WHERE id = ? AND user_id = ?`,
      [id, user.SA001]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '訂單不存在或無權限' });
    }

    res.json({ success: true, message: '刪除成功' });
  } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

// 每日彙總：店家分群，展開看各訂購人細項
router.get('/summary/daily', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const date = req.query.date || new Date().toLocaleDateString('sv');
  const mealType = req.query.mealType;
  const mealWhere = mealType ? 'AND bo.meal_type = ?' : '';
  const params = mealType ? [date, mealType] : [date];

  try {
    const [rows] = await pool.query(`
      SELECT
        boi.vendor_name,
        bo.user_id,
        boi.item_name,
        bo.meal_type,
        SUM(boi.quantity) AS quantity,
        boi.price
      FROM bento_orders bo
      JOIN bento_order_items boi ON bo.id = boi.order_id
      WHERE DATE(bo.order_date) = ? ${mealWhere}
      GROUP BY boi.vendor_name, bo.user_id, boi.item_name, boi.price, bo.meal_type
      ORDER BY boi.vendor_name, bo.user_id, boi.item_name
    `, params);

    // 在 JS 組成 vendor → users 的巢狀結構
    const vendorMap = {};
    for (const row of rows) {
      if (!vendorMap[row.vendor_name]) {
        vendorMap[row.vendor_name] = { vendor_name: row.vendor_name, total_amount: 0, users: {} };
      }
      const v = vendorMap[row.vendor_name];
      v.total_amount += Number(row.price) * Number(row.quantity);

      if (!v.users[row.user_id]) {
        v.users[row.user_id] = { user_id: row.user_id, items: [] };
      }
      v.users[row.user_id].items.push({
        item_name: row.item_name,
        quantity: Number(row.quantity),
        meal_type: row.meal_type
      });
    }

    res.json(Object.values(vendorMap).map(v => ({
      ...v,
      users: Object.values(v.users)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 每月匯總：訂購人分群，顯示當月總金額
router.get('/summary/monthly', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);

  try {
    const [rows] = await pool.query(`
      SELECT
        bo.user_id,
        DATE_FORMAT(bo.order_date, '%Y-%m-%d') AS order_date,
        bo.meal_type,
        boi.vendor_name,
        boi.item_name,
        boi.quantity,
        boi.price
      FROM bento_orders bo
      JOIN bento_order_items boi ON bo.id = boi.order_id
      WHERE YEAR(bo.order_date) = ? AND MONTH(bo.order_date) = ?
      ORDER BY bo.user_id, bo.order_date, bo.meal_type, boi.vendor_name, boi.item_name
    `, [year, month]);

    // 在 JS 組成 user → daily_orders 巢狀結構
    const userMap = {};
    for (const row of rows) {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = { user_id: row.user_id, total_amount: 0, daily_orders: {} };
      }
      const u = userMap[row.user_id];
      u.total_amount += Number(row.price) * Number(row.quantity);

      const key = `${row.order_date}_${row.meal_type}`;
      if (!u.daily_orders[key]) {
        u.daily_orders[key] = {
          order_date: row.order_date,
          meal_type: row.meal_type,
          vendor_name: row.vendor_name,
          items: [],
          day_amount: 0
        };
      }
      u.daily_orders[key].items.push({ item_name: row.item_name, quantity: Number(row.quantity) });
      u.daily_orders[key].day_amount += Number(row.price) * Number(row.quantity);
    }

    res.json(Object.values(userMap).map(u => ({
      user_id: u.user_id,
      order_count: Object.keys(u.daily_orders).length,
      total_amount: u.total_amount,
      daily_orders: Object.values(u.daily_orders)
    })).sort((a, b) => b.total_amount - a.total_amount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 舊版匯總（供 export 使用）
router.get('/summary', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const date = req.query.date || new Date().toLocaleDateString('sv'); // YYYY-MM-DD 本地時間
  const mealType = req.query.mealType; // 'lunch' | 'dinner' | undefined(全部)

  try {
    const where = mealType ? 'AND bo.meal_type = ?' : '';
    const params = mealType ? [date, mealType] : [date];
    const [rows] = await pool.query(`
      SELECT
        boi.item_name,
        boi.price,
        boi.vendor_name,
        bo.meal_type,
        SUM(boi.quantity) AS total_quantity,
        SUM(boi.price * boi.quantity) AS total_amount
      FROM bento_orders bo
      JOIN bento_order_items boi ON bo.id = boi.order_id
      WHERE DATE(bo.order_date) = ? ${where}
      GROUP BY boi.menu_item_id, boi.item_name, boi.price, boi.vendor_name, bo.meal_type
      ORDER BY bo.meal_type, boi.vendor_name, boi.item_name
    `, params);

    res.json(rows);
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// 所有訂單（權限人）
router.get('/all-orders', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  try {
    const [rows] = await pool.query(`
      SELECT bo.id, bo.user_id, bo.meal_type, bo.order_date, bo.created_at, bo.updated_at,
        JSON_ARRAYAGG(JSON_OBJECT(
          'id',        boi.menu_item_id,
          'name',      boi.item_name,
          'price',     boi.price,
          'vendor',    boi.vendor_name,
          'quantity',  boi.quantity
        )) AS items
      FROM bento_orders bo
      LEFT JOIN bento_order_items boi ON bo.id = boi.order_id
      GROUP BY bo.id
      ORDER BY bo.created_at DESC
    `);

    res.json(rows.map(parseItems));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 偵測可用的中文字型路徑（優先選 .ttf/.otf，PDFKit 對 .ttc Collection 需額外指定 index）
const CJK_FONT_PATHS = [
  'C:\\Windows\\Fonts\\kaiu.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansCJKtc-Regular.otf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  'C:\\Windows\\Fonts\\msjh.ttc',
  'C:\\Windows\\Fonts\\mingliu.ttc',
];
const cjkFontPath = CJK_FONT_PATHS.find(p => fs.existsSync(p)) || null;
console.log('[bento] CJK font:', cjkFontPath || '（未找到，將使用預設字型）');

function buildPdf(filePath, title, subtitle, sections) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (cjkFontPath) {
      try {
        doc.registerFont('CJK', cjkFontPath).font('CJK');
      } catch (e) {
        console.warn('[bento] 字型載入失敗，使用預設字型:', e.message);
      }
    }

    // 標題
    doc.fontSize(16).text(title, { align: 'center' });
    if (subtitle) { doc.fontSize(10).fillColor('#666').text(subtitle, { align: 'center' }); }
    doc.fillColor('#000').moveDown(1);

    // sections: [{ header, rows: [{cols}], subtotal }]
    for (const section of sections) {
      doc.fontSize(12).fillColor('#333').text(section.header, { underline: true });
      doc.moveDown(0.3);

      for (const row of section.rows) {
        doc.fontSize(9).fillColor('#000').text('    ' + row, { lineGap: 2 });
      }

      if (section.itemSubtotals && section.itemSubtotals.length) {
        doc.fontSize(8.5).fillColor('#555')
          .text('    品項小計：' + section.itemSubtotals.join('　'), { lineGap: 3 });
      }

      doc.fontSize(10).fillColor('#1a56db')
        .text(`    ${section.subtotalLabel}：$${section.subtotal}`, { lineGap: 4 });
      doc.moveDown(0.5);
    }

    // 總計
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);
    const grandTotal = sections.reduce((s, sec) => s + sec.subtotal, 0);
    doc.fontSize(13).fillColor('#c0392b').text(`總計：$${grandTotal}`, { align: 'right' });

    stream.on('finish', resolve);
    stream.on('error', (err) => { console.error('[bento] PDF stream error:', err.message); reject(err); });
    doc.on('error', (err) => { console.error('[bento] PDF doc error:', err.message); reject(err); });
    doc.end();
  });
}

// 匯出 Excel / PDF（mode: 'daily' | 'monthly'）
router.post('/export', async (req, res) => {
  const { type, mode = 'daily', date, mealType, year, month } = req.body;
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const exportsDir = path.join(__dirname, '../exports');
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

  try {
    if (mode === 'monthly') {
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || (new Date().getMonth() + 1);
      const filename = `bento_monthly_${y}-${String(m).padStart(2, '0')}`;

      const [rows] = await pool.query(`
        SELECT bo.user_id,
          DATE_FORMAT(bo.order_date, '%Y-%m-%d') AS order_date,
          bo.meal_type, boi.vendor_name, boi.item_name, boi.quantity, boi.price
        FROM bento_orders bo
        JOIN bento_order_items boi ON bo.id = boi.order_id
        WHERE YEAR(bo.order_date) = ? AND MONTH(bo.order_date) = ?
        ORDER BY bo.user_id, bo.order_date, bo.meal_type, boi.vendor_name, boi.item_name
      `, [y, m]);

      // 依訂購人分群
      const userGroups = {};
      for (const r of rows) {
        if (!userGroups[r.user_id]) userGroups[r.user_id] = [];
        userGroups[r.user_id].push(r);
      }

      if (type === 'excel') {
        const data = [];
        let grandTotal = 0;
        for (const [uid, items] of Object.entries(userGroups)) {
          for (const r of items) {
            data.push({
              訂購人: r.user_id, 日期: r.order_date,
              餐別: r.meal_type === 'lunch' ? '午餐' : '晚餐',
              店家: r.vendor_name, 品項: r.item_name,
              數量: r.quantity, 小計: r.price * r.quantity
            });
          }
          const sub = items.reduce((s, r) => s + r.price * r.quantity, 0);
          grandTotal += sub;
          data.push({ 訂購人: `【${uid} 當月合計】`, 日期: '', 餐別: '', 店家: '', 品項: '', 數量: '', 小計: sub });
        }
        data.push({ 訂購人: '【月度總計】', 日期: '', 餐別: '', 店家: '', 品項: '', 數量: '', 小計: grandTotal });

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '每月匯總');
        const filePath = path.join(exportsDir, `${filename}.xlsx`);
        xlsx.writeFile(wb, filePath);
        return res.download(filePath);
      }

      if (type === 'pdf') {
        const sections = Object.entries(userGroups).map(([uid, items]) => ({
          header: `訂購人：${uid}`,
          rows: items.map(r =>
            `${r.order_date}  ${r.meal_type === 'lunch' ? '午餐' : '晚餐'}  ${r.vendor_name}  ${r.item_name} ×${r.quantity}  $${r.price * r.quantity}`
          ),
          subtotalLabel: `${uid} 當月合計`,
          subtotal: items.reduce((s, r) => s + r.price * r.quantity, 0)
        }));
        const filePath = path.join(exportsDir, `${filename}.pdf`);
        await buildPdf(filePath, `便當訂購每月匯總`, `${y} 年 ${m} 月`, sections);
        return res.download(filePath);
      }
    } else {
      // 每日彙總
      const targetDate = date || new Date().toLocaleDateString('sv');
      const mealWhere = mealType ? 'AND bo.meal_type = ?' : '';
      const params = mealType ? [targetDate, mealType] : [targetDate];
      const filename = `bento_daily_${targetDate}`;

      const [rows] = await pool.query(`
        SELECT bo.user_id, bo.meal_type,
          boi.vendor_name, boi.item_name, boi.price, boi.quantity
        FROM bento_orders bo
        JOIN bento_order_items boi ON bo.id = boi.order_id
        WHERE DATE(bo.order_date) = ? ${mealWhere}
        ORDER BY boi.vendor_name, bo.user_id, boi.item_name
      `, params);

      // 依店家分群
      const vendorGroups = {};
      for (const r of rows) {
        if (!vendorGroups[r.vendor_name]) vendorGroups[r.vendor_name] = [];
        vendorGroups[r.vendor_name].push(r);
      }

      if (type === 'excel') {
        const data = [];
        let grandTotal = 0;
        for (const [vendor, items] of Object.entries(vendorGroups)) {
          for (const r of items) {
            data.push({
              店家: r.vendor_name, 訂購人: r.user_id,
              餐別: r.meal_type === 'lunch' ? '午餐' : '晚餐',
              品項: r.item_name, 數量: r.quantity, 小計: r.price * r.quantity
            });
          }
          // 品項數量小計
          const itemMap = {};
          for (const r of items) itemMap[r.item_name] = (itemMap[r.item_name] || 0) + Number(r.quantity);
          for (const [itemName, qty] of Object.entries(itemMap)) {
            data.push({ 店家: '', 訂購人: `  ${itemName} 小計`, 餐別: '', 品項: '', 數量: qty, 小計: '' });
          }
          const sub = items.reduce((s, r) => s + r.price * r.quantity, 0);
          grandTotal += sub;
          data.push({ 店家: `【${vendor} 合計】`, 訂購人: '', 餐別: '', 品項: '', 數量: '', 小計: sub });
        }
        data.push({ 店家: '【當日總計】', 訂購人: '', 餐別: '', 品項: '', 數量: '', 小計: grandTotal });

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '每日彙總');
        const filePath = path.join(exportsDir, `${filename}.xlsx`);
        xlsx.writeFile(wb, filePath);
        return res.download(filePath);
      }

      if (type === 'pdf') {
        const mealLabel = mealType === 'lunch' ? '（午餐）' : mealType === 'dinner' ? '（晚餐）' : '';
        const sections = Object.entries(vendorGroups).map(([vendor, items]) => {
          const itemMap = {};
          for (const r of items) itemMap[r.item_name] = (itemMap[r.item_name] || 0) + Number(r.quantity);
          return {
            header: `店家：${vendor}`,
            rows: items.map(r =>
              `${r.user_id}  ${r.meal_type === 'lunch' ? '午餐' : '晚餐'}  ${r.item_name} ×${r.quantity}  $${r.price * r.quantity}`
            ),
            itemSubtotals: Object.entries(itemMap).map(([name, qty]) => `${name} ×${qty}`),
            subtotalLabel: `${vendor} 合計`,
            subtotal: items.reduce((s, r) => s + r.price * r.quantity, 0)
          };
        });
        const filePath = path.join(exportsDir, `${filename}.pdf`);
        await buildPdf(filePath, `便當訂購每日彙總`, `${targetDate}${mealLabel}`, sections);
        return res.download(filePath);
      }
    }

    // ── 每日各部門匯總 ──────────────────────────────────
    if (mode === 'dept') {
      const targetDate = date || new Date().toLocaleDateString('sv');
      const mealWhere = (mealType && mealType !== 'all') ? 'AND bo.meal_type = ?' : '';
      const qParams = (mealType && mealType !== 'all') ? [targetDate, mealType] : [targetDate];
      const filename = `bento_dept_${targetDate}`;
      const mealLabel = mealType === 'lunch' ? '（午餐）' : mealType === 'dinner' ? '（晚餐）' : '';

      const [dRows] = await pool.query(`
        SELECT bo.user_id, boi.item_name, boi.price, boi.quantity
        FROM bento_orders bo JOIN bento_order_items boi ON bo.id = boi.order_id
        WHERE DATE(bo.order_date) = ? ${mealWhere}
        ORDER BY bo.user_id, boi.item_name
      `, qParams);

      const deptMap = await getUserDepts([...new Set(dRows.map(r => r.user_id))]);
      const dGroups = {};
      for (const row of dRows) {
        const dept = deptMap[row.user_id] || '未分類';
        if (!dGroups[dept]) dGroups[dept] = { dept_name: dept, total_amount: 0, itemMap: {} };
        const amt = Number(row.price) * Number(row.quantity);
        dGroups[dept].total_amount += amt;
        if (!dGroups[dept].itemMap[row.item_name]) dGroups[dept].itemMap[row.item_name] = { quantity: 0, amount: 0, price: Number(row.price) };
        dGroups[dept].itemMap[row.item_name].quantity += Number(row.quantity);
        dGroups[dept].itemMap[row.item_name].amount += amt;
      }
      const deptList = Object.values(dGroups).sort((a, b) => b.total_amount - a.total_amount);

      if (type === 'excel') {
        const data = [];
        let grandTotal = 0;
        for (const dept of deptList) {
          for (const [itemName, v] of Object.entries(dept.itemMap)) {
            data.push({ 部門: dept.dept_name, 品項: itemName, 數量: v.quantity, 金額: v.amount });
          }
          grandTotal += dept.total_amount;
          data.push({ 部門: `【${dept.dept_name} 小計】`, 品項: '', 數量: Object.values(dept.itemMap).reduce((s, v) => s + v.quantity, 0), 金額: dept.total_amount });
        }
        data.push({ 部門: '【當日總計】', 品項: '', 數量: '', 金額: grandTotal });
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '每日各部門');
        const filePath = path.join(exportsDir, `${filename}.xlsx`);
        xlsx.writeFile(wb, filePath);
        return res.download(filePath);
      }

      if (type === 'pdf') {
        const sections = deptList.map(dept => ({
          header: `部門：${dept.dept_name}`,
          rows: Object.entries(dept.itemMap).map(([name, v]) => `${name}　×${v.quantity}　$${v.amount}`),
          subtotalLabel: `${dept.dept_name} 小計`,
          subtotal: dept.total_amount
        }));
        const filePath = path.join(exportsDir, `${filename}.pdf`);
        await buildPdf(filePath, `便當訂購每日各部門匯總`, `${targetDate}${mealLabel}`, sections);
        return res.download(filePath);
      }
    }

    // ── 加班便當匯總 ──────────────────────────────────
    if (mode === 'overtime') {
      const { from, to } = req.body;
      if (!from || !to) return res.status(400).json({ error: '請提供日期區間' });
      const filename = `bento_overtime_${from}_${to}`;

      const [oRows] = await pool.query(`
        SELECT oo.created_by, ooi.item_name, ooi.price, ooi.quantity
        FROM bento_overtime_orders oo JOIN bento_overtime_order_items ooi ON oo.id = ooi.overtime_order_id
        WHERE DATE(oo.order_date) >= ? AND DATE(oo.order_date) <= ?
        ORDER BY oo.created_by, ooi.item_name
      `, [from, to]);

      const odeptMap = await getUserDepts([...new Set(oRows.map(r => r.created_by))]);
      const oGroups = {};
      for (const row of oRows) {
        const dept = odeptMap[row.created_by] || '未分類';
        if (!oGroups[dept]) oGroups[dept] = { dept_name: dept, total_amount: 0, itemMap: {} };
        const amt = Number(row.price) * Number(row.quantity);
        oGroups[dept].total_amount += amt;
        if (!oGroups[dept].itemMap[row.item_name]) oGroups[dept].itemMap[row.item_name] = { quantity: 0, amount: 0 };
        oGroups[dept].itemMap[row.item_name].quantity += Number(row.quantity);
        oGroups[dept].itemMap[row.item_name].amount += amt;
      }
      const odeptList = Object.values(oGroups).sort((a, b) => b.total_amount - a.total_amount);

      if (type === 'excel') {
        const data = [];
        let grandTotal = 0;
        for (const dept of odeptList) {
          for (const [itemName, v] of Object.entries(dept.itemMap)) {
            data.push({ 部門: dept.dept_name, 品項: itemName, 數量: v.quantity, 金額: v.amount });
          }
          grandTotal += dept.total_amount;
          data.push({ 部門: `【${dept.dept_name} 小計】`, 品項: '', 數量: Object.values(dept.itemMap).reduce((s, v) => s + v.quantity, 0), 金額: dept.total_amount });
        }
        data.push({ 部門: '【區間總計】', 品項: '', 數量: '', 金額: grandTotal });
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, '加班便當');
        const filePath = path.join(exportsDir, `${filename}.xlsx`);
        xlsx.writeFile(wb, filePath);
        return res.download(filePath);
      }

      if (type === 'pdf') {
        const sections = odeptList.map(dept => ({
          header: `部門：${dept.dept_name}`,
          rows: Object.entries(dept.itemMap).map(([name, v]) => `${name}　×${v.quantity}　$${v.amount}`),
          subtotalLabel: `${dept.dept_name} 小計`,
          subtotal: dept.total_amount
        }));
        const filePath = path.join(exportsDir, `${filename}.pdf`);
        await buildPdf(filePath, `加班便當匯總`, `${from} ～ ${to}`, sections);
        return res.download(filePath);
      }
    }

    res.status(400).json({ error: '不支援的匯出格式' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 取得便當時間設定（公開，前端用）
router.get('/settings', async (_req, res) => {
  try {
    res.json(await getSettings())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新便當時間設定（僅 manager 角色）
router.put('/settings', async (req, res) => {
  const user = req.user
  if (!user || user.SA004 !== 'manager') return res.status(403).json({ error: '無權限' })

  const { lunch_end, dinner_start, dinner_end } = req.body
  const entries = [['lunch_end', lunch_end], ['dinner_start', dinner_start], ['dinner_end', dinner_end]]
    .filter(([, v]) => v)

  if (entries.length === 0) return res.status(400).json({ error: '未提供任何設定值' })

  try {
    for (const [key, value] of entries) {
      await pool.query(
        'INSERT INTO bento_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      )
    }
    settingsCache = null
    res.json({ success: true, message: '設定已更新' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 工具：批次查詢工號對應部門名稱（CMSMV JOIN CMSME）
// ─────────────────────────────────────────────────────────────────────────────
// 批次查詢工號 → { user_id: { name, dept } }
async function getUserInfo(userIds) {
  if (!userIds.length) return {};
  try {
    const spiPool = await getSPIPool();
    const safe = userIds.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
    const rs = await spiPool.request().query(`
      SELECT RTRIM(LTRIM(mv.MV001)) AS user_id,
             RTRIM(LTRIM(ISNULL(mv.MV002, ''))) AS user_name,
             ISNULL(me.ME002, '未分類') AS dept_name
      FROM dbo.CMSMV mv
      LEFT JOIN dbo.CMSME me ON mv.MV004 = me.ME001
      WHERE mv.MV001 IN (${safe})
    `);
    const map = {};
    for (const r of rs.recordset) {
      map[String(r.user_id || '').trim()] = { name: r.user_name || '', dept: r.dept_name || '未分類' };
    }
    return map;
  } catch (err) {
    console.error('[bento] getUserInfo error:', err.message);
    return {};
  }
}

// 向下相容舊呼叫者
async function getUserDepts(userIds) {
  const info = await getUserInfo(userIds);
  return Object.fromEntries(Object.entries(info).map(([id, v]) => [id, v.dept]));
}

// 每日各部門訂購匯總（含訂購人明細）
router.get('/summary/department', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const date = req.query.date || new Date().toLocaleDateString('sv');
  const mealType = req.query.mealType;
  const mealWhere = (mealType && mealType !== 'all') ? 'AND bo.meal_type = ?' : '';
  const params = (mealType && mealType !== 'all') ? [date, mealType] : [date];

  try {
    const [rows] = await pool.query(`
      SELECT bo.user_id, boi.item_name, boi.price, boi.quantity
      FROM bento_orders bo
      JOIN bento_order_items boi ON bo.id = boi.order_id
      WHERE DATE(bo.order_date) = ? ${mealWhere}
      ORDER BY bo.user_id, boi.item_name
    `, params);

    if (!rows.length) return res.json([]);

    const userInfo = await getUserInfo([...new Set(rows.map(r => r.user_id))]);

    const groups = {};
    for (const row of rows) {
      const info = userInfo[row.user_id] || { name: '', dept: '未分類' };
      const dept = info.dept;
      if (!groups[dept]) groups[dept] = { dept_name: dept, total_amount: 0, userMap: {}, itemMap: {} };
      const g = groups[dept];
      const amt = Number(row.price) * Number(row.quantity);
      g.total_amount += amt;

      if (!g.userMap[row.user_id]) g.userMap[row.user_id] = { user_id: row.user_id, user_name: info.name, items: [], user_amount: 0 };
      g.userMap[row.user_id].items.push({ item_name: row.item_name, quantity: Number(row.quantity), amount: amt });
      g.userMap[row.user_id].user_amount += amt;

      if (!g.itemMap[row.item_name]) g.itemMap[row.item_name] = { item_name: row.item_name, quantity: 0, amount: 0 };
      g.itemMap[row.item_name].quantity += Number(row.quantity);
      g.itemMap[row.item_name].amount += amt;
    }

    res.json(Object.values(groups).map(g => ({
      dept_name: g.dept_name,
      total_amount: g.total_amount,
      users: Object.values(g.userMap),
      item_totals: Object.values(g.itemMap).sort((a, b) => b.quantity - a.quantity)
    })).sort((a, b) => b.total_amount - a.total_amount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 加班便當日期區間匯總（以加班人員部門為組）
router.get('/overtime/summary', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });

  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: '請提供日期區間' });
  const diffDays = Math.round((new Date(to) - new Date(from)) / 86400000);
  if (diffDays < 0) return res.status(400).json({ error: '結束日期不得早於開始日期' });
  if (diffDays > 30) return res.status(400).json({ error: '日期區間最長 31 天' });

  try {
    const [rows] = await pool.query(`
      SELECT oo.id, oo.created_by, oo.overtime_workers,
             ooi.item_name, ooi.price, ooi.quantity
      FROM bento_overtime_orders oo
      JOIN bento_overtime_order_items ooi ON oo.id = ooi.overtime_order_id
      WHERE DATE(oo.order_date) >= ? AND DATE(oo.order_date) <= ?
      ORDER BY oo.id, ooi.item_name
    `, [from, to]);

    if (!rows.length) return res.json([]);

    // 彙整每張訂單
    const orderMap = {};
    for (const row of rows) {
      if (!orderMap[row.id]) {
        let workers = [];
        try { workers = JSON.parse(row.overtime_workers || '[]'); } catch {}
        orderMap[row.id] = { id: row.id, created_by: row.created_by, workers, items: [], order_amount: 0 };
      }
      const amt = Number(row.price) * Number(row.quantity);
      orderMap[row.id].items.push({ item_name: row.item_name, quantity: Number(row.quantity), amount: amt });
      orderMap[row.id].order_amount += amt;
    }

    // 取得所有相關工號的部門/姓名
    const allIds = new Set();
    for (const o of Object.values(orderMap)) {
      allIds.add(o.created_by);
      for (const w of o.workers) allIds.add(w.id);
    }
    const userInfo = await getUserInfo([...allIds]);

    // 以加班人員部門分群
    const groups = {};
    for (const order of Object.values(orderMap)) {
      const depts = new Set(
        order.workers.length
          ? order.workers.map(w => userInfo[w.id]?.dept || '未分類')
          : ['未分類']
      );
      for (const dept of depts) {
        if (!groups[dept]) groups[dept] = { dept_name: dept, total_amount: 0, orders: [], itemMap: {} };
        const g = groups[dept];
        const deptWorkers = order.workers.filter(w => (userInfo[w.id]?.dept || '未分類') === dept);
        g.total_amount += order.order_amount;
        g.orders.push({
          order_id: order.id,
          created_by: order.created_by,
          created_by_name: userInfo[order.created_by]?.name || '',
          overtime_workers: deptWorkers,
          items: order.items,
          order_amount: order.order_amount
        });
        for (const item of order.items) {
          if (!g.itemMap[item.item_name]) g.itemMap[item.item_name] = { quantity: 0, amount: 0 };
          g.itemMap[item.item_name].quantity += item.quantity;
          g.itemMap[item.item_name].amount += item.amount;
        }
      }
    }

    res.json(Object.values(groups).map(g => ({
      dept_name: g.dept_name,
      total_amount: g.total_amount,
      orders: g.orders,
      item_totals: Object.entries(g.itemMap).map(([name, v]) => ({ item_name: name, ...v }))
    })).sort((a, b) => b.total_amount - a.total_amount));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 廠商搜尋（查 SPI_20191231.PURMA：廠商代號 / 簡稱 / 全名）
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vendor/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const spiPool = await getSPIPool();
    const rs = await spiPool.request()
      .input('q', mssql.NVarChar, `%${q}%`)
      .query(`
        SELECT TOP 20
          RTRIM(LTRIM(MA001)) AS id,
          RTRIM(LTRIM(MA002)) AS name,
          RTRIM(LTRIM(MA003)) AS full_name
        FROM [SPI_20191231].[dbo].[PURMA]
        WHERE MA001 LIKE @q OR MA002 LIKE @q OR MA003 LIKE @q
        ORDER BY MA001
      `);
    res.json(rs.recordset);
  } catch (err) {
    console.error('[bento] vendor search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 員工搜尋（查 CMSMV：工號 / 姓名）
// ─────────────────────────────────────────────────────────────────────────────
router.get('/employee/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const spiPool = await getSPIPool();
    const rs = await spiPool.request()
      .input('q', mssql.NVarChar, `%${q}%`)
      .query(`
        SELECT TOP 20
          RTRIM(LTRIM(MV001)) AS id,
          RTRIM(LTRIM(MV002)) AS name
        FROM dbo.CMSMV
        WHERE (MV001 LIKE @q OR MV002 LIKE @q)
          AND MV022 = '' AND MV021 != ''
        ORDER BY MV001
      `);
    res.json(rs.recordset);
  } catch (err) {
    console.error('[bento] employee search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 加班便當適用人員名單
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overtime/eligible', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: '未登入' });
  const q = (req.query.q || '').trim();
  try {
    let query = 'SELECT * FROM bento_overtime_eligible';
    let params = [];
    if (q) {
      query += ' WHERE user_id LIKE ? OR user_name LIKE ?';
      params = [`%${q}%`, `%${q}%`];
    }
    query += ' ORDER BY user_id';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/overtime/eligible', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });
  const { userId, userName, dept = '', position = '', email = '' } = req.body;
  if (!userId || !userName) return res.status(400).json({ error: '請提供工號及姓名' });
  try {
    await pool.query(
      `INSERT INTO bento_overtime_eligible (user_id, user_name, dept, position, email, added_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_name=VALUES(user_name), dept=VALUES(dept),
         position=VALUES(position), email=VALUES(email)`,
      [userId.trim(), userName, dept, position, email, user.SA001]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/overtime/eligible/:userId', async (req, res) => {
  const user = req.user;
  if (!hasPermission(user)) return res.status(403).json({ error: '無權限' });
  try {
    await pool.query('DELETE FROM bento_overtime_eligible WHERE user_id = ?', [req.params.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 加班便當權限管理
// ─────────────────────────────────────────────────────────────────────────────
async function hasOvertimePermission(user) {
  if (!user) return false;
  const [rows] = await pool.query(
    'SELECT user_id FROM bento_overtime_eligible WHERE user_id = ?',
    [user.SA001]
  );
  return rows.length > 0;
}

// 查自己是否有加班便當訂購權限
router.get('/overtime/permission', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: '未登入' });
  try {
    res.json({ hasPermission: await hasOvertimePermission(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 加班便當訂購
// ─────────────────────────────────────────────────────────────────────────────
router.post('/overtime/order', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: '未登入' });
  if (!await hasOvertimePermission(user)) return res.status(403).json({ error: '無加班便當訂購權限' });

  const { items, overtimeWorkers, remark } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '請新增訂購項目' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO bento_overtime_orders (created_by, order_date, overtime_workers, remark)
       VALUES (?, CURDATE(), ?, ?)`,
      [user.SA001, JSON.stringify(overtimeWorkers || []), remark || '']
    );
    const orderId = result.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO bento_overtime_order_items
           (overtime_order_id, meal_type, vendor_name, item_name, price, quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.mealType, item.vendorName, item.itemName, item.price || 0, item.quantity || 1]
      );
    }

    await conn.commit();
    res.json({ success: true, orderId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// 查詢加班便當訂購記錄
router.get('/overtime/orders', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: '未登入' });
  if (!await hasOvertimePermission(user)) return res.status(403).json({ error: '無加班便當訂購權限' });

  try {
    const isAdmin = hasPermission(user);
    const [orders] = isAdmin
      ? await pool.query('SELECT * FROM bento_overtime_orders ORDER BY created_at DESC LIMIT 100')
      : await pool.query(
          'SELECT * FROM bento_overtime_orders WHERE created_by = ? ORDER BY created_at DESC',
          [user.SA001]
        );

    for (const order of orders) {
      const [its] = await pool.query(
        'SELECT * FROM bento_overtime_order_items WHERE overtime_order_id = ?',
        [order.id]
      );
      order.items = its;
      try { order.overtime_workers = JSON.parse(order.overtime_workers || '[]'); } catch { order.overtime_workers = []; }
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
