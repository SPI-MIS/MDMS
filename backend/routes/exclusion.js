const express = require('express');
const router = express.Router();
const pool = require('../db/db_addap');

/**
 * 將 ISO 8601 日期轉換為 MySQL DATETIME 格式 (YYYY-MM-DD HH:MM:SS)
 */
function formatDateTimeForMySQL(dateValue) {
  if (!dateValue) return null;
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 查詢投票列表
 * GET /api/votes?q=keyword&state=Draft/Active/Closed/Cancelled
 */
router.get('/exclusion', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    let query = `SELECT * FROM case007d WHERE f07 >='2025-01-01'`;
    const params = [`%${q}%`, `%${q}%`];

    // if (state) {
    //   query += ' AND voteStatus = ?';
    //   params.push(state);
    // }

    // query += ' ORDER BY createdAt DESC';

    const [results] = await pool.query(query, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 查詢單個投票詳情
 * GET /api/votes/:voteId
 */
router.get('/votes/:voteId', async (req, res) => {
  const { voteId } = req.params;
  if (!voteId) return res.status(400).json({ error: 'voteId required' });

  try {
    const [voteResult] = await pool.query(
      'SELECT * FROM Votes WHERE voteId = ?',
      [voteId]
    );

    if (!voteResult.length) {
      return res.status(404).json({ error: 'not found' });
    }

    const vote = voteResult[0];

    // 查詢投票選項
    const [options] = await pool.query(
      'SELECT optionId, optionText, voteCount FROM VoteOptions WHERE voteId = ? ORDER BY optionOrder',
      [voteId]
    );

    vote.voteOptions = options.map(opt => opt.optionText);
    vote.optionDetails = options;

    // 查詢參與者
    const [participants] = await pool.query(
      'SELECT DISTINCT userId FROM VoteParticipants WHERE voteId = ?',
      [voteId]
    );

    vote.participants = participants.map(p => p.userId);

    res.json(vote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 建立投票
 * POST /api/votes
 */
router.post('/votes', async (req, res) => {
  const { 
    activityName, 
    activityCode, 
    voteTitle, 
    voteDescription, 
    voteType, 
    allowMultiple, 
    startTime, 
    endTime, 
    allowAnonymous, 
    resultsPublic, 
    participants, 
    voteOptions,
    createdBy
  } = req.body;

  // 驗證必填欄位
  if (!activityName || !voteTitle || !voteOptions || voteOptions.length < 2) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const voteId = `VOTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // 插入投票主記錄
    await pool.query(
      `INSERT INTO Votes 
        (voteId, activityName, activityCode, voteTitle, voteDescription, voteType, allowMultiple, startTime, endTime, allowAnonymous, resultsPublic, voteStatus, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [voteId, activityName, activityCode || null, voteTitle, voteDescription || null, voteType || 'general', allowMultiple ? 1 : 0, formatDateTimeForMySQL(startTime), formatDateTimeForMySQL(endTime), allowAnonymous ? 1 : 0, resultsPublic ? 1 : 0, 'Draft', createdBy || 'system', formatDateTimeForMySQL(now)]
    );

    // 插入投票選項
    let optionOrder = 1;
    for (const optionText of voteOptions) {
      if (optionText.trim()) {
        const optionId = `OPT_${voteId}_${optionOrder}`;
        await pool.query(
          'INSERT INTO VoteOptions (optionId, voteId, optionText, optionOrder, voteCount) VALUES (?, ?, ?, ?, ?)',
          [optionId, voteId, optionText, optionOrder, 0]
        );
        optionOrder++;
      }
    }

    // 插入參與者
    if (participants && participants.length > 0) {
      for (const userId of participants) {
        const participantId = `PART_${voteId}_${userId}`;
        await pool.query(
          'INSERT INTO VoteParticipants (participantId, voteId, userId) VALUES (?, ?, ?)',
          [participantId, voteId, userId]
        );
      }
    }

    res.status(201).json({ 
      voteId, 
      message: 'Vote created successfully' 
    });
  } catch (err) {
    console.error('[POST /votes]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 更新投票
 * PUT /api/votes/:voteId
 */
router.put('/votes/:voteId', async (req, res) => {
  const { voteId } = req.params;
  const { 
    activityName, 
    activityCode, 
    voteTitle, 
    voteDescription, 
    voteType, 
    allowMultiple, 
    startTime, 
    endTime, 
    allowAnonymous, 
    resultsPublic, 
    participants, 
    voteOptions,
    voteStatus,
    updatedBy
  } = req.body;

  if (!voteId) return res.status(400).json({ error: 'voteId required' });

  try {
    // 檢查投票是否存在
    const [voteResult] = await pool.query('SELECT voteStatus FROM Votes WHERE voteId = ?', [voteId]);

    if (!voteResult.length) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    const currentStatus = voteResult[0].voteStatus;
    
    // 只允許 Draft 狀態進行編輯
    if (currentStatus !== 'Draft' && voteStatus !== 'Draft') {
      return res.status(400).json({ error: 'Can only edit Draft votes' });
    }

    const now = new Date();

    // 更新投票主記錄
    await pool.query(
      `UPDATE Votes SET 
        activityName = ?,
        activityCode = ?,
        voteTitle = ?,
        voteDescription = ?,
        voteType = ?,
        allowMultiple = ?,
        startTime = ?,
        endTime = ?,
        allowAnonymous = ?,
        resultsPublic = ?,
        voteStatus = ?,
        updatedBy = ?,
        updatedAt = ?
      WHERE voteId = ?`,
      [activityName, activityCode || null, voteTitle, voteDescription || null, voteType || 'general', allowMultiple ? 1 : 0, formatDateTimeForMySQL(startTime), formatDateTimeForMySQL(endTime), allowAnonymous ? 1 : 0, resultsPublic ? 1 : 0, voteStatus || 'Draft', updatedBy || 'system', formatDateTimeForMySQL(now), voteId]
    );

    // 更新投票選項
    if (voteOptions && voteOptions.length > 0) {
      // 刪除舊選項
      await pool.query('DELETE FROM VoteOptions WHERE voteId = ?', [voteId]);

      // 插入新選項
      let optionOrder = 1;
      for (const optionText of voteOptions) {
        if (optionText.trim()) {
          const optionId = `OPT_${voteId}_${optionOrder}`;
          await pool.query(
            'INSERT INTO VoteOptions (optionId, voteId, optionText, optionOrder, voteCount) VALUES (?, ?, ?, ?, ?)',
            [optionId, voteId, optionText, optionOrder, 0]
          );
          optionOrder++;
        }
      }
    }

    // 更新參與者
    if (participants) {
      // 刪除舊參與者
      await pool.query('DELETE FROM VoteParticipants WHERE voteId = ?', [voteId]);

      // 插入新參與者
      if (participants.length > 0) {
        for (const userId of participants) {
          const participantId = `PART_${voteId}_${userId}`;
          await pool.query(
            'INSERT INTO VoteParticipants (participantId, voteId, userId) VALUES (?, ?, ?)',
            [participantId, voteId, userId]
          );
        }
      }
    }

    res.json({ message: 'Vote updated successfully' });
  } catch (err) {
    console.error('[PUT /votes/:voteId]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 刪除投票
 * DELETE /api/votes/:voteId
 */
router.delete('/votes/:voteId', async (req, res) => {
  const { voteId } = req.params;

  if (!voteId) return res.status(400).json({ error: 'voteId required' });

  try {
    // 刪除投票選項
    await pool.query('DELETE FROM VoteOptions WHERE voteId = ?', [voteId]);

    // 刪除參與者
    await pool.query('DELETE FROM VoteParticipants WHERE voteId = ?', [voteId]);

    // 刪除投票記錄
    await pool.query('DELETE FROM VoteRecords WHERE voteId = ?', [voteId]);

    // 刪除投票主記錄
    await pool.query('DELETE FROM Votes WHERE voteId = ?', [voteId]);

    res.json({ message: 'Vote deleted successfully' });
  } catch (err) {
    console.error('[DELETE /votes/:voteId]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 提交投票（員工）
 * POST /api/votes/submit
 */
router.post('/votes/submit', async (req, res) => {
  const { voteId, selectedOptions, userId, anonymous, votedAt } = req.body;

  if (!voteId || !selectedOptions || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 檢查用戶是否已經投票過
    const [existingVote] = await pool.query(
      'SELECT COUNT(*) as voteCount FROM VoteRecords WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    if (existingVote[0].voteCount > 0) {
      return res.status(400).json({ error: 'User has already voted' });
    }

    const now = new Date(votedAt || Date.now());

    // 記錄投票
    for (const optionId of selectedOptions) {
      const voteRecordId = `VREC_${voteId}_${userId}_${Date.now()}`;
      await pool.query(
        'INSERT INTO VoteRecords (voteRecordId, voteId, optionId, userId, votedAt) VALUES (?, ?, ?, ?, ?)',
        [voteRecordId, voteId, optionId, anonymous ? null : userId, formatDateTimeForMySQL(now)]
      );

      // 更新投票計數
      await pool.query(
        'UPDATE VoteOptions SET voteCount = voteCount + 1 WHERE optionId = ?',
        [optionId]
      );
    }

    // 記錄參與者
    const participantId = `PART_${voteId}_${userId}`;
    await pool.query(
      'INSERT INTO VoteParticipants (participantId, voteId, userId, votedAt) VALUES (?, ?, ?, ?)',
      [participantId, voteId, userId, formatDateTimeForMySQL(now)]
    );

    res.status(201).json({ message: 'Vote submitted successfully' });
  } catch (err) {
    console.error('[POST /votes/submit]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 檢查用戶是否已投票
 * GET /api/votes/:voteId/check-voted?userId=xxx
 */
router.get('/votes/:voteId/check-voted', async (req, res) => {
  const { voteId } = req.params;
  const { userId } = req.query;

  if (!voteId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as voteCount FROM VoteRecords WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    const hasVoted = result[0].voteCount > 0;
    res.json({ hasVoted });
  } catch (err) {
    console.error('[GET /votes/:voteId/check-voted]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 獲取投票結果
 * GET /api/votes/:voteId/results
 */
router.get('/votes/:voteId/results', async (req, res) => {
  const { voteId } = req.params;

  if (!voteId) {
    return res.status(400).json({ error: 'voteId required' });
  }

  try {
    // 獲取投票基本信息
    const [voteResult] = await pool.query('SELECT * FROM Votes WHERE voteId = ?', [voteId]);

    if (!voteResult.length) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    const vote = voteResult[0];

    // 獲取選項及投票計數
    const [options] = await pool.query(
      'SELECT optionId, optionText, voteCount, optionOrder FROM VoteOptions WHERE voteId = ? ORDER BY optionOrder',
      [voteId]
    );

    // 獲取投票統計
    const [stats] = await pool.query(
      'SELECT COUNT(DISTINCT userId) as totalParticipants, COUNT(*) as totalVotes FROM VoteParticipants WHERE voteId = ?',
      [voteId]
    );

    // 獲取投票者清單（如果不是匿名投票）
    let votersList = [];
    if (!vote.allowAnonymous) {
      const [voters] = await pool.query(
        `SELECT 
          vr.voteRecordId,
          vr.userId,
          vo.optionText,
          vr.votedAt
        FROM VoteRecords vr
        JOIN VoteOptions vo ON vr.optionId = vo.optionId
        WHERE vr.voteId = ?
        ORDER BY vr.votedAt DESC`,
        [voteId]
      );
      votersList = voters;
    }

    res.json({
      voteId,
      optionDetails: options,
      totalVotes: stats[0].totalVotes,
      totalParticipants: stats[0].totalParticipants,
      votersList
    });
  } catch (err) {
    console.error('[GET /votes/:voteId/results]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 接收前端一次新增多筆範例（不會存 DB，僅示範處理與回傳）  
 * POST /api/exclusion/bulk
 * body: { rows: [ { text, textarea, date, start, end } ] }
 */
router.post('/exclusion/bulk', async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'rows array required' });
  }
  try {
    const processed = rows.map(r => {
      const start = r.start ? new Date(r.start) : null;
      const end = r.end ? new Date(r.end) : null;
      const durationMs = (start && end && !isNaN(start) && !isNaN(end)) ? (end - start) : null;
      return {
        text: r.text || null,
        textarea: r.textarea || null,
        date: r.date || null,
        startTime: formatDateTimeForMySQL(r.start),
        endTime: formatDateTimeForMySQL(r.end),
        durationMs
      };
    });

    // TODO: 若需要存 DB, 在此將 processed 資料插入對應表格
    res.status(201).json({ inserted: processed.length, rows: processed });
  } catch (err) {
    console.error('[POST /exclusion/bulk]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
