const express = require('express')
const router = express.Router()
require('dotenv').config()
const db = require('../db/db_addap') // 引用你的資料庫模組

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  try {
     const [rows] = await db.execute( 'SELECT * FROM member WHERE f02 = ? AND f03 = ?', [username, password] )

    if (rows.length === 1) {
      const user = rows[0]
      res.json({
        success: true,
        userId: user.f02,
        userName: user.f04,
        manager:user.f08
      })
    } else {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
    }
  } catch (err) {
    console.error('[Login Error]', err)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
})

module.exports = router
