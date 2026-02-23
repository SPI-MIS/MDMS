-- 投票相關表格 MySQL 初始化指令碼（精簡版 - 已移除視圖）

-- 建立或選擇數據庫
CREATE DATABASE IF NOT EXISTS `voting_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `voting_system`;

-- 建立投票主表
CREATE TABLE IF NOT EXISTS `Votes` (
  `voteId` VARCHAR(100) PRIMARY KEY COMMENT '投票ID（主鍵）',
  `activityName` VARCHAR(100) NOT NULL COMMENT '活動名稱',
  `activityCode` VARCHAR(50) COMMENT '活動代碼',
  `voteTitle` VARCHAR(200) NOT NULL COMMENT '投票標題',
  `voteDescription` LONGTEXT COMMENT '投票說明',
  `voteType` VARCHAR(50) DEFAULT 'general' COMMENT '投票類型：general一般投票, rating評分, poll民調',
  `allowMultiple` BOOLEAN DEFAULT FALSE COMMENT '是否允許多選',
  `startTime` DATETIME COMMENT '投票開始時間',
  `endTime` DATETIME COMMENT '投票結束時間',
  `allowAnonymous` BOOLEAN DEFAULT FALSE COMMENT '是否允許匿名投票',
  `resultsPublic` BOOLEAN DEFAULT TRUE COMMENT '投票結果是否公開',
  `voteStatus` VARCHAR(50) DEFAULT 'Draft' COMMENT '投票狀態：Draft草稿, Active進行中, Closed已結束, Cancelled已取消',
  `createdBy` VARCHAR(100) COMMENT '建立者',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `updatedBy` VARCHAR(100) COMMENT '更新者',
  `updatedAt` DATETIME COMMENT '更新時間',
  KEY `idx_status` (`voteStatus`),
  KEY `idx_createdAt` (`createdAt`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='投票主表';

-- 建立投票選項表
CREATE TABLE IF NOT EXISTS `VoteOptions` (
  `optionId` VARCHAR(100) PRIMARY KEY COMMENT '選項ID（主鍵）',
  `voteId` VARCHAR(100) NOT NULL COMMENT '投票ID（外鍵）',
  `optionText` VARCHAR(200) NOT NULL COMMENT '選項文字內容',
  `optionOrder` INT COMMENT '選項排序',
  `voteCount` INT DEFAULT 0 COMMENT '得票數',
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='投票選項表';

-- 建立投票參與者表（用於記錄已投票的用戶，防止重複投票）
CREATE TABLE IF NOT EXISTS `VoteParticipants` (
  `participantId` VARCHAR(100) PRIMARY KEY COMMENT '參與者ID（主鍵）',
  `voteId` VARCHAR(100) NOT NULL COMMENT '投票ID（外鍵）',
  `userId` VARCHAR(100) NOT NULL COMMENT '用戶ID',
  `votedAt` DATETIME COMMENT '投票時間',
  UNIQUE KEY `uc_vote_user` (`voteId`, `userId`), -- 確保每個用戶只能投票一次
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_userId` (`userId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='投票參與者表（防止重複投票）';

-- 建立投票記錄表（用於記錄投票結果）
CREATE TABLE IF NOT EXISTS `VoteRecords` (
  `voteRecordId` VARCHAR(100) PRIMARY KEY COMMENT '投票記錄ID（主鍵）',
  `voteId` VARCHAR(100) NOT NULL COMMENT '投票ID（外鍵）',
  `optionId` VARCHAR(100) NOT NULL COMMENT '選項ID（外鍵）',
  `userId` VARCHAR(100) COMMENT '用戶ID（NULL表示匿名投票）',
  `votedAt` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '投票時間',
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  FOREIGN KEY (`optionId`) REFERENCES `VoteOptions`(`optionId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_userId` (`userId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='投票記錄表（記錄每筆投票）';

-- 建立系統日誌表
CREATE TABLE IF NOT EXISTS `VoteLogs` (
  `logId` VARCHAR(100) PRIMARY KEY COMMENT '日誌ID（主鍵）',
  `voteId` VARCHAR(100) COMMENT '投票ID（外鍵，可為NULL）',
  `action` VARCHAR(50) COMMENT '操作類型：CREATE建立, UPDATE更新, DELETE刪除, SUBMIT提交, ACTIVATE啟用, CLOSE關閉',
  `userId` VARCHAR(100) COMMENT '操作用戶ID',
  `details` LONGTEXT COMMENT '詳細資訊（JSON格式）',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '日誌建立時間',
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE SET NULL,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_createdAt` (`createdAt`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='系統操作日誌表';

-- 建立系統設定表
CREATE TABLE IF NOT EXISTS `VoteSystemSettings` (
  `settingId` VARCHAR(50) PRIMARY KEY COMMENT '設定ID（主鍵）',
  `settingName` VARCHAR(100) COMMENT '設定名稱',
  `settingValue` LONGTEXT COMMENT '設定值',
  `settingType` VARCHAR(50) COMMENT '設定類型：boolean布林值, int整數, string字串',
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最後更新時間'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='系統設定表';

-- ============================================
-- 常用查詢範例（替代原視圖功能）
-- ============================================

-- 1. 投票統計查詢（替代 vw_VoteStatistics）
-- SELECT 
--   v.voteId,
--   v.activityName,
--   v.voteTitle,
--   v.voteStatus,
--   COUNT(DISTINCT p.userId) AS totalParticipants,
--   COUNT(DISTINCT r.voteRecordId) AS totalVotes
-- FROM Votes v
-- LEFT JOIN VoteParticipants p ON v.voteId = p.voteId
-- LEFT JOIN VoteRecords r ON v.voteId = r.voteId
-- WHERE v.voteId = ?
-- GROUP BY v.voteId, v.activityName, v.voteTitle, v.voteStatus;

-- 2. 用戶投票統計查詢（替代 vw_UserVoteStatistics）
-- SELECT 
--   userId,
--   COUNT(DISTINCT voteId) AS totalVotedCount,
--   MIN(votedAt) AS firstVoteTime,
--   MAX(votedAt) AS lastVoteTime
-- FROM VoteParticipants
-- WHERE userId = ?
-- GROUP BY userId;

-- 3. 投票選項統計查詢（替代 vw_OptionStatistics）
-- SELECT 
--   optionId,
--   voteId,
--   optionText,
--   voteCount
-- FROM VoteOptions
-- WHERE voteId = ?
-- ORDER BY optionOrder;
-- 
-- 註：百分比計算建議在應用層處理：
-- percentage = (voteCount / totalVotes) * 100
