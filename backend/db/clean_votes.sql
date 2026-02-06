-- 清理投票數據的 SQL 腳本
-- 用於修復因投票提交失敗而導致的數據不一致問題

-- 1. 找出有重複投票的用戶（保留最早的記錄）
-- DELETE FROM VoteParticipants 
-- WHERE participantId NOT IN (
--   SELECT MIN(participantId)
--   FROM VoteParticipants
--   GROUP BY voteId, userId
-- );

-- 2. 清理孤立的投票記錄（VoteRecords 中存在但 VoteParticipants 中不存在的記錄）
-- 這會刪除不完整的投票
DELETE FROM VoteRecords 
WHERE (voteId, userId) NOT IN (
  SELECT voteId, userId 
  FROM VoteParticipants 
  WHERE userId IS NOT NULL
);

-- 3. 重新計算投票計數
UPDATE VoteOptions 
SET voteCount = (
  SELECT COUNT(*) 
  FROM VoteRecords 
  WHERE VoteRecords.optionId = VoteOptions.optionId
);

-- 4. 驗證一致性：檢查投票選項計數
SELECT 
  vo.voteId,
  vo.optionId,
  vo.optionText,
  vo.voteCount,
  (SELECT COUNT(*) FROM VoteRecords WHERE optionId = vo.optionId) as actualCount
FROM VoteOptions vo
WHERE vo.voteCount != (SELECT COUNT(*) FROM VoteRecords WHERE optionId = vo.optionId);
