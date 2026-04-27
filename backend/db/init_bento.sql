-- 初始化 Bento 資料表套件

-- 1) 便當訂購
IF NOT EXISTS(SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.BentoOrders') AND type = N'U')
BEGIN
CREATE TABLE dbo.BentoOrders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(50) NOT NULL,
    meal_type NVARCHAR(10) NOT NULL,
    items NVARCHAR(MAX) NOT NULL,
    order_date DATE NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_BentoOrders_UserId' AND object_id = OBJECT_ID(N'dbo.BentoOrders'))
  CREATE INDEX IX_BentoOrders_UserId ON dbo.BentoOrders(user_id);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_BentoOrders_OrderDate' AND object_id = OBJECT_ID(N'dbo.BentoOrders'))
  CREATE INDEX IX_BentoOrders_OrderDate ON dbo.BentoOrders(order_date);

-- 2) 供應商
IF NOT EXISTS(SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.BentoVendors') AND type = N'U')
BEGIN
CREATE TABLE dbo.BentoVendors (
    vendor_code NVARCHAR(20) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL
);
END

-- 3) 菜單
IF NOT EXISTS(SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.BentoMenu') AND type = N'U')
BEGIN
CREATE TABLE dbo.BentoMenu (
    id INT IDENTITY(1,1) PRIMARY KEY,
    vendor_code NVARCHAR(20) NOT NULL,
    item_name NVARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active CHAR(1) DEFAULT 'Y',
    CONSTRAINT FK_BentoMenu_Vendor FOREIGN KEY (vendor_code) REFERENCES dbo.BentoVendors(vendor_code)
);
END

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_BentoMenu_Vendor' AND object_id = OBJECT_ID(N'dbo.BentoMenu'))
  CREATE INDEX IX_BentoMenu_Vendor ON dbo.BentoMenu(vendor_code);
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='IX_BentoMenu_ItemName' AND object_id = OBJECT_ID(N'dbo.BentoMenu'))
  CREATE INDEX IX_BentoMenu_ItemName ON dbo.BentoMenu(item_name);

