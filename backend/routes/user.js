// routes/user.js
const express = require('express');
const router = express.Router();
require('dotenv').config();
const db = require('../db/db_addap'); // 你的資料庫連線

router.get('/user', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM member');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/user/:f02', async (req, res) => {
  const { f02 } = req.params;
  const { name, email } = req.body;
  try {
    const [result] = await db.execute(
      'UPDATE member SET f04 = ?, f05 = ? WHERE f02 = ?',
      [name, email, f02]
    );
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
