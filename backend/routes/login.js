const express = require('express')
const router = express.Router()
const { sql, getPool } = require('../db/db_SMS')
const crypto = require('crypto')

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex')
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '缺少帳號或密碼' })
    }

    const pool = await getPool()
    const rs = await pool.request()
      .input('id', sql.NVarChar, String(username).trim())
      .query(`
        SELECT SA001, SA002, SA003, SA004,
               SA008, SA009, SA0010, SA0011, SA0012,
               IssueState
        FROM dbo.SMSSA
        WHERE SA001 = @id AND IssueState <> 'V'
      `)

    if (!rs.recordset.length) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
    }
    console.log('rs:', rs);

    const u = rs.recordset[0]
    const stored = String(u.SA003 || '')
    const isBcryptLike = /^\$2[aby]\$/.test(stored) // 若是舊 bcrypt，這支路由不支援

    const ok = !isBcryptLike && (
      stored === String(password) ||                       // 明文相等
      stored.toLowerCase() === sha256Hex(password).toLowerCase() // 或 SHA-256 相等
    )

    if (!ok) {
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
    }
    const isManager = String(u.SA004) === '1' || String(u.SA004).toLowerCase() === 'manager';

    res.json({
      success: true,
      userId: u.SA001,
      userName: u.SA002,
      manager: isManager ? '1' : '0',
      perms: {
        C: u.SA008 === 'Y', R: u.SA009 === 'Y', U: u.SA0010 === 'Y', D: u.SA0011 === 'Y', A: u.SA0012 === 'Y'
      }
    })
    
  } catch (err) {
    console.error('[Login Error]', err)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
})

module.exports = router
