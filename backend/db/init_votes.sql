-- 投票相關表格 MySQL 初始化指令碼

-- 建立或選擇數據庫
CREATE DATABASE IF NOT EXISTS `voting_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `voting_system`;

-- 建立投票主表
CREATE TABLE IF NOT EXISTS `Votes` (
  `voteId` VARCHAR(100) PRIMARY KEY,
  `activityName` VARCHAR(100) NOT NULL,
  `activityCode` VARCHAR(50),
  `voteTitle` VARCHAR(200) NOT NULL,
  `voteDescription` LONGTEXT,
  `voteType` VARCHAR(50) DEFAULT 'general', -- general, rating, poll
  `allowMultiple` BOOLEAN DEFAULT FALSE,
  `startTime` DATETIME,
  `endTime` DATETIME,
  `allowAnonymous` BOOLEAN DEFAULT FALSE,
  `resultsPublic` BOOLEAN DEFAULT TRUE,
  `voteStatus` VARCHAR(50) DEFAULT 'Draft', -- Draft, Active, Closed, Cancelled
  `createdBy` VARCHAR(100),
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedBy` VARCHAR(100),
  `updatedAt` DATETIME
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立投票選項表
CREATE TABLE IF NOT EXISTS `VoteOptions` (
  `optionId` VARCHAR(100) PRIMARY KEY,
  `voteId` VARCHAR(100) NOT NULL,
  `optionText` VARCHAR(200) NOT NULL,
  `optionOrder` INT,
  `voteCount` INT DEFAULT 0,
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立投票參與者表（用於記錄已投票的用戶，防止重複投票）
CREATE TABLE IF NOT EXISTS `VoteParticipants` (
  `participantId` VARCHAR(100) PRIMARY KEY,
  `voteId` VARCHAR(100) NOT NULL,
  `userId` VARCHAR(100) NOT NULL,
  `votedAt` DATETIME,
  UNIQUE KEY `uc_vote_user` (`voteId`, `userId`), -- 確保每個用戶只能投票一次
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_userId` (`userId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立投票記錄表（用於記錄投票結果）
CREATE TABLE IF NOT EXISTS `VoteRecords` (
  `voteRecordId` VARCHAR(100) PRIMARY KEY,
  `voteId` VARCHAR(100) NOT NULL,
  `optionId` VARCHAR(100) NOT NULL,
  `userId` VARCHAR(100), -- 為 NULL 時表示匿名投票
  `votedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE CASCADE,
  FOREIGN KEY (`optionId`) REFERENCES `VoteOptions`(`optionId`) ON DELETE CASCADE,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_userId` (`userId`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立系統日誌表
CREATE TABLE IF NOT EXISTS `VoteLogs` (
  `logId` VARCHAR(100) PRIMARY KEY,
  `voteId` VARCHAR(100),
  `action` VARCHAR(50), -- CREATE, UPDATE, DELETE, SUBMIT, ACTIVATE, CLOSE
  `userId` VARCHAR(100),
  `details` LONGTEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`voteId`) REFERENCES `Votes`(`voteId`) ON DELETE SET NULL,
  KEY `idx_voteId` (`voteId`),
  KEY `idx_createdAt` (`createdAt`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立系統設定表
CREATE TABLE IF NOT EXISTS `VoteSystemSettings` (
  `settingId` VARCHAR(50) PRIMARY KEY,
  `settingName` VARCHAR(100),
  `settingValue` LONGTEXT,
  `settingType` VARCHAR(50), -- boolean, int, string
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立額外索引以提高查詢效能
ALTER TABLE `Votes` ADD KEY `idx_status` (`voteStatus`);
ALTER TABLE `Votes` ADD KEY `idx_createdAt` (`createdAt`);

-- 建立檢視：投票統計
DROP VIEW IF EXISTS `vw_VoteStatistics`;
CREATE VIEW `vw_VoteStatistics` AS
SELECT 
  v.`voteId`,
  v.`activityName`,
  v.`voteTitle`,
  v.`voteStatus`,
  COUNT(DISTINCT p.`userId`) AS `totalParticipants`,
  COUNT(DISTINCT r.`voteRecordId`) AS `totalVotes`
FROM `Votes` v
LEFT JOIN `VoteParticipants` p ON v.`voteId` = p.`voteId`
LEFT JOIN `VoteRecords` r ON v.`voteId` = r.`voteId`
GROUP BY v.`voteId`, v.`activityName`, v.`voteTitle`, v.`voteStatus`;

-- 建立檢視：用戶投票統計
DROP VIEW IF EXISTS `vw_UserVoteStatistics`;
CREATE VIEW `vw_UserVoteStatistics` AS
SELECT 
  `userId`,
  COUNT(DISTINCT `voteId`) AS `totalVotedCount`,
  MIN(`votedAt`) AS `firstVoteTime`,
  MAX(`votedAt`) AS `lastVoteTime`
FROM `VoteParticipants`
WHERE `userId` IS NOT NULL
GROUP BY `userId`;

-- 建立檢視：投票選項統計
DROP VIEW IF EXISTS `vw_OptionStatistics`;
CREATE VIEW `vw_OptionStatistics` AS
SELECT 
  vo.`optionId`,
  vo.`voteId`,
  vo.`optionText`,
  vo.`voteCount`,
  CASE 
    WHEN (SELECT COUNT(*) FROM `VoteRecords` WHERE `voteId` = vo.`voteId`) > 0 
    THEN ROUND(vo.`voteCount` * 100.0 / (SELECT COUNT(*) FROM `VoteRecords` WHERE `voteId` = vo.`voteId`), 2)
    ELSE 0 
  END AS `percentage`
FROM `VoteOptions` vo;
