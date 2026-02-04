const express = require('express');
const router = express.Router();
const { sql, getPool: getSMSPool } = require('../db/db_SMS');
const { getPool: getSPIPool } = require('../db/db_SPI');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex');
}

// Normalize role coming from SA004 (SMSSA) or other sources
function normalizeRole(rawRole, source = 'auth') {
  const r = String(rawRole || '').trim().toLowerCase();
  if (source === 'auth') {
    if (r === 'manager') return 'manager';
    if (r === 'admin') return 'admin';
    return 'user';
  }
  // Default to user for HR/unknown
  return 'user';
}

/**
 * 統一登入端點
 * POST /api/login
 * 
 * 優先檢查權限控管系統 (SPI_SMS.SMSSA)
 * 如果找不到，則檢查 HR 系統 (SPIDB.CMSMV)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '缺少帳號或密碼' });
    }

    logger.debug('[Login] 登入嘗試:', { username, timestamp: new Date().toISOString() });

    // 1️⃣ 優先查詢權限控管系統 (SPI_SMS.SMSSA)
    try {
      const smsPool = await getSMSPool();
      const authResult = await smsPool.request()
        .input('id', sql.NVarChar, String(username).trim())
        .query(`
          SELECT SA001, SA002, SA003, SA004, SA005, SA006,
                 SA008, SA009, SA0010, SA0011, SA0012, SA0013,
                 IssueState, Creator, CreateDate
          FROM dbo.SMSSA
          WHERE RTRIM(LTRIM(SA001)) = @id AND IssueState <> 'V'
        `);

      logger.debug('[Login] SMS 查詢結果:', authResult.recordset.length > 0 ? '找到用戶' : '未找到');

      // 如果在權限控管系統找到用戶 -> 僅用 SMSSA(SA003) 驗證
      if (authResult.recordset.length > 0) {
        const user = authResult.recordset[0];
        const stored = String(user.SA003 || '');
        const isBcryptLike = /^\$2[aby]\$/.test(stored);

        // 嚴格比對 SA003：
        // - 若為 bcrypt 格式，使用 bcrypt 驗證
        // - 否則使用逐字相等比對（不做 sha256 或大小寫轉換）
        let passwordMatch = false;
        if (isBcryptLike) {
          try {
            passwordMatch = bcrypt.compareSync(String(password), stored);
          } catch (e) {
            console.error('[Login] bcrypt compare error', e);
            passwordMatch = false;
          }
        } else {
          passwordMatch = stored === String(password);
        }

        if (!passwordMatch) {
          logger.warn('[Login] SMS 密碼驗證失敗 (SA003 不匹配)');
          return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
        }

        // 檢查狀態
        if (user.IssueState === 'N') {
          logger.warn('[Login] 帳號未審核');
          return res.status(403).json({ 
            success: false, 
            message: '帳號尚未經過審核，請聯繫管理員' 
          });
        }

        // Normalize role and compute UI flags
        const normalizedRole = normalizeRole(user.SA004, 'auth');
        const isManager = normalizedRole === 'manager';
        // admin or manager should have vote-admin capability
        const isAdmin = normalizedRole === 'admin' || normalizedRole === 'manager';
        const showAdminPanel = normalizedRole === 'manager';
        const showVoteAdmin = normalizedRole === 'manager' || normalizedRole === 'admin';

        logger.info('[Login] 登入成功 - 權限控管系統:', { userId: user.SA001, role: normalizedRole });

        // 登入成功 - 權限控管系統用戶
        return res.json({
          success: true,
          userId: user.SA001,
          userName: user.SA002,
          role: normalizedRole,
          manager: isManager ? '1' : '0',
          admin: (normalizedRole === 'admin') ? '1' : '0',
          showAdminPanel,
          showVoteAdmin,
          perms: {
            C: user.SA008 === 'Y',
            R: user.SA009 === 'Y',
            U: user.SA0010 === 'Y',
            D: user.SA0011 === 'Y',
            A: user.SA0012 === 'Y',
            CA: user.SA0013 === 'Y'
          },
          source: 'auth'
        });
      }
    } catch (smsError) {
      logger.error('[SMS DB Error]', smsError && smsError.message);
    }

    // 2️⃣ 如果權限控管系統找不到，查詢 HR 系統 (SPIDB.CMSMV)
    try {
      logger.debug('[Login] SPI 查詢開始', { id: String(username).trim() });
      const SPIPool = await getSPIPool();
      const hrResult = await SPIPool.request()
        .input('id', sql.NVarChar, String(username).trim())
        .query(`
          SELECT MV001, MV002, MV009
          FROM dbo.CMSMV
          WHERE RTRIM(LTRIM(MV001)) = @id
        `);

      logger.debug('[Login] SPI 查詢結果 length =', hrResult.recordset.length);

      // 如果在 HR 系統找到用戶
      if (hrResult.recordset.length > 0) {
        logger.debug('[Login] SPI raw record:', hrResult.recordset[0]);
        const hrUser = hrResult.recordset[0];

        // 清洗 MV009，保留數字並移除空白，取得後 4 碼作為密碼驗證
        const rawMV009 = String(hrUser.MV009 || '');
        const cleaned = rawMV009.replace(/\D+/g, '').replace(/\s+/g, '');
        const last4Digits = cleaned.slice(-4);

        logger.debug('[Login] SPI 用戶資訊:', { mv001: String(hrUser.MV001 || '').trim(), mv002: hrUser.MV002, mv009_masked: cleaned ? ('***' + last4Digits) : '(empty)' });
        logger.debug('[Login] SPI debug compare:', { cleaned, last4Digits, passwordType: typeof password, passwordValue: String(password) });

        const passwordMatches = (last4Digits && password === last4Digits);
        logger.debug('[Login] SPI passwordMatches:', passwordMatches);

        if (!passwordMatches) {
          logger.warn('[Login] SPI 密碼驗證失敗');
          return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
        }

        const normalizedRole = normalizeRole(null, 'hr');
        logger.info('[Login] 登入成功 - HR 系統:', { userId: hrUser.MV001, role: normalizedRole });

        // 登入成功 - HR 系統用戶（一般使用者）
        return res.json({
          success: true,
          userId: hrUser.MV001,
          userName: hrUser.MV002,
          role: normalizedRole,
          manager: '0',
          admin: '0',
          showAdminPanel: false,
          showVoteAdmin: false,
          perms: {
            C: false,
            R: true,
            U: false,
            D: false,
            A: false,
            CA: false
          },
          source: 'hr'
        });
      }
    } catch (SPIError) {
      logger.error('[SPI DB Error]', SPIError && SPIError.message);
      logger.error('[SPI DB Error Details]', SPIError);
      logger.error('[SPI DB Error Stack]', SPIError && SPIError.stack);
    }

    // 3️⃣ 兩個系統都找不到用戶
    logger.warn('[Login] 登入失敗 - 找不到用戶');
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });

  } catch (err) {
    logger.error('[Login Error]', err);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

/**
 * 變更密碼
 * POST /api/login/change-password
 * 
 * 僅支援權限控管系統的用戶變更密碼
 */
router.post('/login/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  logger.debug('[Change Password] 請求:', { userId });

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ message: '資料不足' });
  }

  try {
    const pool = await getSMSPool();

    // 查詢使用者資料（只從權限控管系統）
    const result = await pool.request()
      .input('id', sql.NVarChar, String(userId).trim())
      .query('SELECT SA003, IssueState FROM dbo.SMSSA WHERE SA001 = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        message: '找不到使用者或您是 HR 系統用戶（HR 系統用戶請聯繫人資部門變更密碼）' 
      });
    }

    const user = result.recordset[0];

    // 檢查帳號狀態
    if (user.IssueState === 'V') {
      return res.status(403).json({ message: '帳號已作廢' });
    }

    // 驗證目前密碼
    const stored = String(user.SA003 || '');
    const isBcryptLike = /^\$2[aby]\$/.test(stored);
    
    const currentHash = sha256Hex(currentPassword);
    const storedHash = isBcryptLike ? stored : sha256Hex(stored);

    if (currentHash !== storedHash && stored !== currentPassword) {
      return res.status(400).json({ message: '目前密碼不正確' });
    }

    // 更新密碼
    await pool.request()
      .input('id', sql.NVarChar, String(userId).trim())
      .input('newPassword', sql.NVarChar, newPassword)
      .query('UPDATE dbo.SMSSA SET SA003 = @newPassword WHERE SA001 = @id');

    logger.info('[Change Password] 成功:', { userId });
    return res.json({ message: '密碼已成功變更' });

  } catch (err) {
    logger.error('[Change Password Error]', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

/**
 * 檢查用戶權限
 * GET /api/login/check-permission?userId=xxx&permission=C
 */
router.get('/login/check-permission', async (req, res) => {
  try {
    const { userId, permission } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少 userId' });
    }

    const pool = await getSMSPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, String(userId).trim())
      .query(`
        SELECT SA004, SA008, SA009, SA0010, SA0011, SA0012, SA0013, IssueState
        FROM dbo.SMSSA
        WHERE SA001 = @id AND IssueState = 'Y'
      `);

    if (result.recordset.length === 0) {
      return res.json({ 
        success: false, 
        hasPermission: false,
        message: '找不到使用者或帳號未啟用' 
      });
    }

    const user = result.recordset[0];
    const normalizedRole = normalizeRole(user.SA004, 'auth');
    const isManager = normalizedRole === 'manager';
    // manager should also have admin-like vote capabilities
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'manager';

    // 如果是管理者，擁有所有權限
    if (isManager) {
      return res.json({ 
        success: true, 
        hasPermission: true,
        isManager: true,
        isAdmin: true,
      });
    }

    if (isAdmin) {
      return res.json({ 
        success: true, 
        hasPermission: true,
        isManager: false,
        isAdmin: true,
      });
    }

    // 檢查特定權限
    const permissionMap = {
      'C': user.SA008,
      'R': user.SA009,
      'U': user.SA0010,
      'D': user.SA0011,
      'A': user.SA0012,
      'CA': user.SA0013
    };

    const hasPermission = permission ? permissionMap[permission] === 'Y' : true;

    return res.json({ 
      success: true, 
      hasPermission,
      isManager: false,
      permissions: {
        C: user.SA008 === 'Y',
        R: user.SA009 === 'Y',
        U: user.SA0010 === 'Y',
        D: user.SA0011 === 'Y',
        A: user.SA0012 === 'Y',
        CA: user.SA0013 === 'Y'
      }
    });

  } catch (err) {
    logger.error('[Check Permission Error]', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

/**
 * 獲取用戶資訊
 * GET /api/login/user-info?userId=xxx
 */
router.get('/login/user-info', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: '缺少 userId' });
    }

    // 先查詢權限控管系統 (SPI_SMS)
    try {
      const smsPool = await getSMSPool();
      const authResult = await smsPool.request()
        .input('id', sql.NVarChar, String(userId).trim())
        .query(`
          SELECT SA001, SA002, SA004, SA005, SA006,
                 SA008, SA009, SA0010, SA0011, SA0012, SA0013,
                 IssueState, Creator, CreateDate
          FROM dbo.SMSSA
          WHERE SA001 = @id AND IssueState <> 'V'
        `);

      if (authResult.recordset.length > 0) {
        const user = authResult.recordset[0];
        const normalizedRole = normalizeRole(user.SA004, 'auth');
        const showAdminPanel = normalizedRole === 'manager';
        const showVoteAdmin = normalizedRole === 'manager' || normalizedRole === 'admin';

        return res.json({
          success: true,
          userId: user.SA001,
          userName: user.SA002,
          userEmail: user.SA005 || '',
          userPhone: user.SA006 || '',
          role: normalizedRole,
          manager: normalizedRole === 'manager' ? '1' : '0',
          admin: normalizedRole === 'admin' ? '1' : '0',
          showAdminPanel,
          showVoteAdmin,
          perms: {
            C: user.SA008 === 'Y',
            R: user.SA009 === 'Y',
            U: user.SA0010 === 'Y',
            D: user.SA0011 === 'Y',
            A: user.SA0012 === 'Y',
            CA: user.SA0013 === 'Y'
          },
          status: user.IssueState,
          source: 'auth'
        });
      }
    } catch (smsError) {
      logger.error('[SMS DB Error]', smsError && smsError.message);
    }

    // 再查詢 HR 系統 (SPIDB)
    try {
      const SPIPool = await getSPIPool();
      const hrResult = await SPIPool.request()
        .input('id', sql.NVarChar, String(userId).trim())
        .query(`
          SELECT MV001, MV002, MV009
          FROM dbo.CMSMV
          WHERE MV001 = @id
        `);

      if (hrResult.recordset.length > 0) {
        const hrUser = hrResult.recordset[0];
        return res.json({
          success: true,
          userId: hrUser.MV001,
          userName: hrUser.MV002,
          role: 'user',
          manager: '0',
          admin: '0',
          showAdminPanel: false,
          showVoteAdmin: false,
          perms: {
            C: false,
            R: true,
            U: false,
            D: false,
            A: false,
            CA: false
          },
          source: 'hr'
        });
      }
    } catch (SPIError) {
      logger.error('[SPI DB Error]', SPIError && SPIError.message);
    }

    return res.status(404).json({ success: false, message: '找不到使用者' });

  } catch (err) {
    logger.error('[User Info Error]', err);
    return res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

module.exports = router;