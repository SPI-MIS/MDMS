-- ============================================================
-- Bento 便當系統 資料表結構
-- 產出日期：2026-04-28
-- ============================================================

-- ── 外部已存在（手動管理）的資料表 ──────────────────────────

-- 店家主檔（bento_vendors）
-- 注意：is_active 欄位由 migration 動態新增，若不存在會自動 ALTER
CREATE TABLE IF NOT EXISTS bento_vendors (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  is_active   TINYINT NOT NULL DEFAULT 1     -- 1=顯示, 0=隱藏
);

-- 菜單品項（bento_menu）
-- 注意：item_idname / item_viname 由 migration 動態新增
CREATE TABLE IF NOT EXISTS bento_menu (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id    INT NOT NULL,
  item_name    VARCHAR(100) NOT NULL,          -- 中文名稱
  item_idname  VARCHAR(100) DEFAULT NULL,      -- 印尼語名稱
  item_viname  VARCHAR(100) DEFAULT NULL,      -- 越南語名稱
  price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (vendor_id) REFERENCES bento_vendors(id)
);

-- ── 自動建立的資料表 ─────────────────────────────────────────

-- 系統設定（bento_settings）
-- 預設值：lunch_end=10:30, dinner_start=13:00, dinner_end=16:00, auto_logout_timeout_min=15
CREATE TABLE IF NOT EXISTS bento_settings (
  setting_key    VARCHAR(50)  PRIMARY KEY,
  setting_value  VARCHAR(10)  NOT NULL,
  updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 每日便當訂單主檔（bento_orders）
CREATE TABLE IF NOT EXISTS bento_orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(50)  NOT NULL,           -- 訂購人工號
  meal_type   VARCHAR(20)  NOT NULL,           -- 'lunch' | 'dinner'
  order_date  DATE,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 每日便當訂單明細（bento_order_items）
CREATE TABLE IF NOT EXISTS bento_order_items (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT          NOT NULL,
  menu_item_id   VARCHAR(50),                  -- 對應 bento_menu.id
  item_name      VARCHAR(100) NOT NULL,
  price          DECIMAL(10,2) NOT NULL DEFAULT 0,
  vendor_name    VARCHAR(100),
  quantity       INT          NOT NULL DEFAULT 1,
  FOREIGN KEY (order_id) REFERENCES bento_orders(id) ON DELETE CASCADE
);

-- 加班便當訂購者名單（bento_overtime_permission）
-- 控制「誰能下加班便當訂單」
CREATE TABLE IF NOT EXISTS bento_overtime_permission (
  user_id     VARCHAR(50) PRIMARY KEY,         -- 被授權人工號
  granted_by  VARCHAR(50) NOT NULL,            -- 授權人工號
  created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP
);

-- 可選加班人員名單（bento_overtime_eligible）
-- 控制「誰能被選為加班人員」（含廠商 / GUEST）
CREATE TABLE IF NOT EXISTS bento_overtime_eligible (
  user_id     VARCHAR(50)  PRIMARY KEY,
  user_name   VARCHAR(100) NOT NULL,
  dept        VARCHAR(100) DEFAULT '',
  position    VARCHAR(100) DEFAULT '',
  email       VARCHAR(200) DEFAULT '',
  added_by    VARCHAR(50),
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- 加班便當訂單主檔（bento_overtime_orders）
CREATE TABLE IF NOT EXISTS bento_overtime_orders (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  created_by  VARCHAR(50)  NOT NULL,           -- 下訂人工號
  order_date  DATE         NOT NULL,
  remark      TEXT,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- 加班便當人員明細（bento_overtime_order_workers）
-- 每筆記錄代表此次加班訂單的一位加班者
CREATE TABLE IF NOT EXISTS bento_overtime_order_workers (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  overtime_order_id   INT          NOT NULL,
  worker_id           VARCHAR(50)  NOT NULL,   -- 工號或 'GUEST'
  worker_name         VARCHAR(100) NOT NULL,
  FOREIGN KEY (overtime_order_id) REFERENCES bento_overtime_orders(id) ON DELETE CASCADE
);

-- 加班便當訂購明細（bento_overtime_order_items）
-- 每筆記錄代表此次加班訂單的一個餐點品項
CREATE TABLE IF NOT EXISTS bento_overtime_order_items (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  overtime_order_id   INT          NOT NULL,
  meal_type           VARCHAR(20)  NOT NULL,   -- 'lunch' | 'dinner'
  vendor_name         VARCHAR(100),
  item_name           VARCHAR(100) NOT NULL,
  price               DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity            INT          NOT NULL DEFAULT 1,
  FOREIGN KEY (overtime_order_id) REFERENCES bento_overtime_orders(id) ON DELETE CASCADE
);

-- ============================================================
-- 關聯圖
-- ============================================================
--
--  bento_vendors ──< bento_menu
--
--  bento_orders ──< bento_order_items
--
--  bento_overtime_orders ──< bento_overtime_order_workers
--                        └──< bento_overtime_order_items
--
--  bento_overtime_permission   (獨立：控制誰能下加班訂單)
--  bento_overtime_eligible     (獨立：控制誰能被選為加班人員)
--  bento_settings              (獨立：時間與系統設定)
--
-- ============================================================
