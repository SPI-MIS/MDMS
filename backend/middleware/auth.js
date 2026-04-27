const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db/db_SMS');

// 簡單auth middleware - 從header獲取用戶ID並查詢完整信息
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.NVarChar, decoded.userId)
        .query(`
          SELECT SA001, SA002, SA003, SA004, SA008, SA009, SA0010, SA0011, SA0012, SA0013
          FROM dbo.SMSSA
          WHERE SA001 = @userId
        `);
      if (result.recordset.length > 0) {
        req.user = result.recordset[0];
      } else {
        // HR 系統用戶（不在 SMSSA），設定基本 user 物件
        req.user = { SA001: decoded.userId, SA002: '', SA004: 'user' };
      }
    } catch (err) {
      // 無效token
    }
  }
  next();
};

module.exports = authMiddleware;