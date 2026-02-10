const express = require('express');
const router = express.Router();
const pool = require('../db/db_votes');
const { formatToISO, DEFAULT_TZ_OFFSET } = require('../utils/time')

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

function parseOffsetMinutes(offset) {
  if (!offset) return 0;
  const normalized = offset.replace(':', '');
  const m = normalized.match(/^([+-])(\d{2})(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatUtcDateTime(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateTimeForMySQLWallTime(dateValue, targetOffset = DEFAULT_TZ_OFFSET) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return formatLocalDateTime(dateValue);
  }

  if (typeof dateValue === 'number') {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return formatLocalDateTime(date);
  }

  if (typeof dateValue !== 'string') return null;

  const s = dateValue.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) {
    const date = new Date(s);
    if (isNaN(date.getTime())) return null;
    return formatLocalDateTime(date);
  }

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hours = parseInt(m[4] || '0', 10);
  const minutes = parseInt(m[5] || '0', 10);
  const seconds = parseInt(m[6] || '0', 10);
  const inputOffsetRaw = m[7];

  if (!inputOffsetRaw) {
    return `${m[1]}-${m[2]}-${m[3]} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const inputOffsetMinutes = inputOffsetRaw === 'Z' ? 0 : parseOffsetMinutes(inputOffsetRaw);
  const targetOffsetMinutes = parseOffsetMinutes(targetOffset);
  const utcMillis = Date.UTC(year, month, day, hours, minutes, seconds) - inputOffsetMinutes * 60 * 1000;
  const targetMillis = utcMillis + targetOffsetMinutes * 60 * 1000;
  return formatUtcDateTime(new Date(targetMillis));
}

/**
 * 查詢投票列表
 * GET /api/votes?q=keyword&state=Draft/Active/Closed/Cancelled
 */
router.get('/votes', async (req, res) => {
  const { q = '', state = '' } = req.query;
  try {
    let query = `
      SELECT 
        v.voteId, 
        v.activityName, 
        v.activityCode, 
        v.voteTitle, 
        v.voteStatus, 
        v.startTime, 
        v.endTime, 
        v.createdAt, 
        v.createdBy,
        COUNT(DISTINCT vp.userId) as participantCount
      FROM Votes v
      LEFT JOIN VoteParticipants vp ON v.voteId = vp.voteId
      WHERE (v.activityName LIKE ? OR v.voteTitle LIKE ?)
    `;
    const params = [`%${q}%`, `%${q}%`];

    if (state) {
      query += ' AND v.voteStatus = ?';
      params.push(state);
    }

    query += ' GROUP BY v.voteId ORDER BY v.createdAt DESC';

    const [results] = await pool.query(query, params);
    // Format date fields to ISO format without timezone assumption
    const formatted = results.map(r => ({
      ...r,
      startTime: formatToISO(r.startTime),
      endTime: formatToISO(r.endTime),
      createdAt: formatToISO(r.createdAt),
      updatedAt: r.updatedAt ? formatToISO(r.updatedAt) : null,
      participantCount: r.participantCount || 0
    }))
    
    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString())
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 使用者投票統計
 * GET /api/votes/user-stats?limit=50
 */
router.get('/votes/user-stats', async (req, res) => {
  const { limit = '50' } = req.query;
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
  try {
    const [rows] = await pool.query(
      `SELECT 
        vp.userId,
        COUNT(*) as voteCount,
        MIN(vp.votedAt) as firstVoteTime,
        MAX(vp.votedAt) as lastVoteTime
      FROM VoteParticipants vp
      GROUP BY vp.userId
      ORDER BY voteCount DESC, lastVoteTime DESC
      LIMIT ?`,
      [safeLimit]
    );

    const formatted = rows.map(r => ({
      ...r,
      firstVoteTime: r.firstVoteTime ? formatToISO(r.firstVoteTime) : null,
      lastVoteTime: r.lastVoteTime ? formatToISO(r.lastVoteTime) : null
    }));

    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString());
    res.json(formatted);
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

    // Format date/time fields to ISO format without timezone assumption
    vote.startTime = formatToISO(vote.startTime)
    vote.endTime = formatToISO(vote.endTime)
    vote.createdAt = formatToISO(vote.createdAt)
    vote.updatedAt = vote.updatedAt ? formatToISO(vote.updatedAt) : null

    // 查詢參與者
    const [participants] = await pool.query(
      'SELECT DISTINCT userId FROM VoteParticipants WHERE voteId = ?',
      [voteId]
    );

    vote.participants = participants.map(p => p.userId);

    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString())
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

  console.log('[POST /votes/submit] Request:', { voteId, userId, selectedOptions, anonymous, votedAt });

  if (!voteId || !selectedOptions || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 檢查用戶是否已經投票過（使用 VoteParticipants 表）
    const [existingVote] = await connection.query(
      'SELECT COUNT(*) as voteCount FROM VoteParticipants WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    console.log('[POST /votes/submit] Existing vote count:', existingVote[0].voteCount);

    if (existingVote[0].voteCount > 0) {
      await connection.rollback();
      console.log('[POST /votes/submit] User already voted, returning 400');
      return res.status(400).json({ error: 'User has already voted' });
    }

    // 確保選項陣列有效
    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid options' });
    }

    const voteTimeValue = votedAt || Date.now();
    const formattedVotedAt = formatDateTimeForMySQLWallTime(voteTimeValue);
    const timestamp = Date.now();

    // 記錄投票 - 無論是否匿名，都要保存 userId 以便追蹤
    for (let i = 0; i < selectedOptions.length; i++) {
      const optionId = selectedOptions[i];
      
      // 驗證 optionId 是否存在
      const [optionCheck] = await connection.query(
        'SELECT optionId FROM VoteOptions WHERE optionId = ? AND voteId = ?',
        [optionId, voteId]
      );
      
      if (optionCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Invalid option: ${optionId}` });
      }
      
      // 使用 timestamp 和 index 確保每個 voteRecordId 唯一
      const voteRecordId = `VREC_${voteId}_${userId}_${timestamp}_${i}`;
      await connection.query(
        'INSERT INTO VoteRecords (voteRecordId, voteId, optionId, userId, votedAt) VALUES (?, ?, ?, ?, ?)',
        [voteRecordId, voteId, optionId, userId, formattedVotedAt]
      );

      // 更新投票計數
      await connection.query(
        'UPDATE VoteOptions SET voteCount = voteCount + 1 WHERE optionId = ?',
        [optionId]
      );
    }

    // 記錄參與者
    const participantId = `PART_${voteId}_${userId}_${timestamp}`;
    await connection.query(
      'INSERT INTO VoteParticipants (participantId, voteId, userId, votedAt) VALUES (?, ?, ?, ?)',
      [participantId, voteId, userId, formattedVotedAt]
    );

    console.log('[POST /votes/submit] Vote submitted successfully, participantId:', participantId);

    await connection.commit();
    res.status(201).json({ message: 'Vote submitted successfully' });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[POST /votes/submit] Rollback error:', rollbackErr);
    }
    console.error('[POST /votes/submit]', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

/**
 * 檢查用戶是否已投票
 * GET /api/votes/:voteId/check-voted?userId=xxx
 */
router.get('/votes/:voteId/check-voted', async (req, res) => {
  const { voteId } = req.params;
  const { userId } = req.query;

  console.log('[GET /votes/:voteId/check-voted] Request:', { voteId, userId });

  if (!voteId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 使用 VoteParticipants 表檢查（該表有 UNIQUE KEY 保證數據一致性）
    const [result] = await pool.query(
      'SELECT COUNT(*) as voteCount FROM VoteParticipants WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    const hasVoted = result[0].voteCount > 0;
    console.log('[GET /votes/:voteId/check-voted] Result:', { hasVoted, voteCount: result[0].voteCount });
    
    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString())
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

  console.log('[GET /votes/:voteId/results] Request for voteId:', voteId);

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
    // totalParticipants: 參與的不重複用戶數（從 VoteParticipants 表）
    // totalVotes: 總投票記錄數（從 VoteRecords 表，一個用戶可能投多個選項）
    const [participantStats] = await pool.query(
      'SELECT COUNT(DISTINCT userId) as totalParticipants FROM VoteParticipants WHERE voteId = ?',
      [voteId]
    );
    
    const [voteStats] = await pool.query(
      'SELECT COUNT(*) as totalVotes FROM VoteRecords WHERE voteId = ?',
      [voteId]
    );
    
    const stats = {
      totalParticipants: participantStats[0].totalParticipants,
      totalVotes: voteStats[0].totalVotes
    };
    
    console.log('[GET /votes/:voteId/results] Stats for', voteId, ':', stats);

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

    // Format voter timestamps
    votersList = votersList.map(v => ({
      ...v,
      votedAt: v.votedAt ? formatToISO(v.votedAt) : null
    }))

    // 添加時間戳防止緩存
    res.set('X-Query-Timestamp', Date.now().toString())
    res.json({
      voteId,
      optionDetails: options,
      totalVotes: stats.totalVotes,
      totalParticipants: stats.totalParticipants,
      votersList
    });
  } catch (err) {
    console.error('[GET /votes/:voteId/results]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 清理用戶在特定投票中的記錄（用於修復數據不一致）
 * DELETE /api/votes/:voteId/user/:userId
 * 需要管理員權限
 */
router.delete('/votes/:voteId/user/:userId', async (req, res) => {
  const { voteId, userId } = req.params;

  if (!voteId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 取得該用戶在該投票中的所有選項
    const [voteRecords] = await connection.query(
      'SELECT DISTINCT optionId FROM VoteRecords WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    // 刪除投票記錄
    await connection.query(
      'DELETE FROM VoteRecords WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    // 刪除參與者記錄
    await connection.query(
      'DELETE FROM VoteParticipants WHERE voteId = ? AND userId = ?',
      [voteId, userId]
    );

    // 更新受影響選項的投票計數
    for (const record of voteRecords) {
      await connection.query(
        'UPDATE VoteOptions SET voteCount = GREATEST(0, voteCount - 1) WHERE optionId = ?',
        [record.optionId]
      );
    }

    await connection.commit();
    res.json({ message: 'User vote record deleted successfully', recordsDeleted: voteRecords.length });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error('[DELETE /votes/:voteId/user/:userId] Rollback error:', rollbackErr);
    }
    console.error('[DELETE /votes/:voteId/user/:userId]', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
