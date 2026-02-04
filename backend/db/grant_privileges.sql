-- 為 remote_user 授予 voting_system 數據庫的所有權限
-- 在 MySQL 上以 root 或具有 GRANT 權限的用戶執行此腳本

-- 授予所有權限
GRANT ALL PRIVILEGES ON voting_system.* TO 'remote_user'@'%' IDENTIFIED BY 'S06cj84@8016!';

-- 刷新權限
FLUSH PRIVILEGES;

-- 驗證權限
SHOW GRANTS FOR 'remote_user'@'%';
