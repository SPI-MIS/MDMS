# 投票系統 - 快速參考指南

## 快速啟動

### 前提條件
- Node.js 14+
- SQL Server 2016+
- npm 或 yarn

### 5 分鐘快速啟動

```bash
# 1. 初始化資料庫
# 在 SQL Server 中執行 backend/db/init_votes.sql

# 2. 啟動後端
cd backend
npm install
npm start
# 監聽 http://localhost:4000

# 3. 啟動前端（另一個終端）
cd frontend
npm install
npm run dev
# 訪問 http://localhost:5173（或提示的端口）
```

## 系統三大模組

### 1️⃣ 員工投票前台
**URL**: `/employee-vote`
**角色**: 員工
**功能**:
- 瀏覽進行中的投票
- 提交投票（每個投票活動只能投一次）
- 查看投票結果（如果公開）

**關鍵特性**:
- ✅ 防重複投票（UI + 後端 + 資料庫）
- ✅ 實時狀態反饋
- ✅ 支援記名和不記名投票

### 2️⃣ 投票主辦者後台
**URL**: `/vote-admin`
**角色**: 投票主辦者
**功能**:
- 建立和管理投票活動
- 設定投票選項
- 啟動投票
- 查看實時統計
- 匯出結果

**工作流程**:
1. 建立投票（Draft）
2. 編輯設定
3. 啟動投票（Active）
4. 監控進度
5. 查看結果（Closed）

### 3️⃣ IT 管理平台
**URL**: `/vote-it-management`
**角色**: IT 管理員
**功能**:
- 系統監控和統計
- 用戶管理和分析
- 系統日誌查詢
- 系統設定和配置

**分頁**:
- 📊 **概況** - 統計儀表板
- 👥 **用戶管理** - 用戶投票記錄
- 📝 **系統日誌** - 操作日誌查詢
- ⚙️ **系統設定** - 全局配置

## 防重複投票實現

### 技術層
```
資料庫層面
├─ UNIQUE(voteId, userId) 約束
└─ 插入失敗拋出異常

應用層面
├─ 投票前檢查: SELECT COUNT(*) ...
├─ 重複投票返回 400 錯誤
└─ 記錄日誌

前端層面
├─ 檢查投票狀態: GET /check-voted
├─ 已投票禁用按鈕
└─ 顯示「已投票」提示
```

### 驗證邏輯
```javascript
// 1. 前端檢查
const hasVoted = await checkUserVoted(voteId, userId)
if (hasVoted) return // 禁用投票

// 2. 投票時後端檢查
SELECT COUNT(*) FROM VoteRecords 
WHERE voteId = @voteId AND userId = @userId

// 3. 資料庫層
UNIQUE(voteId, userId) 防止異常插入
```

## API 速查表

### 投票管理 API

| 方法 | 端點 | 描述 | 參數 |
|------|------|------|------|
| GET | `/api/votes` | 查詢投票列表 | `q`, `state` |
| GET | `/api/votes/:voteId` | 獲取投票詳情 | `voteId` |
| POST | `/api/votes` | 建立投票 | 投票對象 |
| PUT | `/api/votes/:voteId` | 更新投票 | `voteId`, 投票對象 |
| DELETE | `/api/votes/:voteId` | 刪除投票 | `voteId` |

### 員工投票 API

| 方法 | 端點 | 描述 | 參數 |
|------|------|------|------|
| POST | `/api/votes/submit` | 提交投票 | 投票數據 |
| GET | `/api/votes/:voteId/check-voted` | 檢查投票狀態 | `userId` |
| GET | `/api/votes/:voteId/results` | 獲取投票結果 | 無 |

## 資料模型

### Votes 表
```javascript
{
  voteId: string,           // 投票 ID
  activityName: string,     // 活動名稱
  activityCode: string,     // 活動代碼
  voteTitle: string,        // 投票主題
  voteDescription: string,  // 描述
  voteType: string,         // 投票類型
  allowMultiple: boolean,   // 是否允許複選
  startTime: datetime,      // 開始時間
  endTime: datetime,        // 結束時間
  allowAnonymous: boolean,  // 是否匿名
  resultsPublic: boolean,   // 結果是否公開
  voteStatus: string,       // 狀態: Draft/Active/Closed/Cancelled
  createdBy: string,        // 建立者
  createdAt: datetime,      // 建立時間
  updatedBy: string,        // 修改者
  updatedAt: datetime       // 修改時間
}
```

### VoteOptions 表
```javascript
{
  optionId: string,         // 選項 ID
  voteId: string,           // 投票 ID (FK)
  optionText: string,       // 選項文本
  optionOrder: int,         // 排序
  voteCount: int            // 投票計數
}
```

### VoteParticipants 表 (防重複)
```javascript
{
  participantId: string,    // 參與者 ID
  voteId: string,           // 投票 ID (FK)
  userId: string,           // 用戶 ID (UNIQUE with voteId)
  votedAt: datetime         // 投票時間
}
```

### VoteRecords 表
```javascript
{
  voteRecordId: string,     // 記錄 ID
  voteId: string,           // 投票 ID (FK)
  optionId: string,         // 選項 ID (FK)
  userId: string,           // 用戶 ID (nullable 用於匿名)
  votedAt: datetime         // 投票時間
}
```

## 常見任務

### ✏️ 建立投票
1. 進入 `/vote-admin`
2. 點擊「建立新投票」
3. 填寫基本信息
4. 設定時間和選項
5. 保存為草稿

### 🚀 啟動投票
1. 在投票列表找到要啟動的投票（Draft 狀態）
2. 點擊「啟動」按鈕
3. 確認啟動
4. 狀態變為 Active，員工可以投票

### 📊 查看結果
1. **主辦者**: 進入 `/vote-admin` → 點擊「查看統計」
2. **員工**: 進入 `/employee-vote` → 點擊「查看結果」
3. 可查看選項分佈、投票者名單（記名投票）

### 📥 匯出資料
1. 進入 `/vote-admin` → 點擊「查看統計」
2. 點擊「匯出資料」按鈕
3. 自動下載 CSV 檔案

## 狀態說明

| 狀態 | 說明 | 員工可投 | 主辦者可編輯 |
|------|------|--------|-----------|
| Draft | 草稿 | ❌ | ✅ |
| Active | 進行中 | ✅ | ❌ |
| Closed | 已結束 | ❌ | ❌ |
| Cancelled | 已取消 | ❌ | ❌ |

## 故障排除

### ❌ 無法投票，顯示「已投票」
**原因**: 用戶已在該投票中投過票
**解決**: 
- 確認用戶信息正確
- 檢查 VoteParticipants 表
- 若為測試，清理測試資料

### ❌ 投票結果不更新
**原因**: VoteRecords 表未更新
**解決**:
- 檢查 VoteRecords 表是否有新記錄
- 檢查 VoteOptions.voteCount 是否更新
- 重新載入頁面

### ❌ 匿名投票仍顯示投票者
**原因**: allowAnonymous 設定不正確
**解決**:
- 確認 Votes 表中 allowAnonymous = 1
- 確認 VoteRecords.userId = NULL
- 清理舊資料重新測試

### ❌ API 返回 500 錯誤
**原因**: 後端數據庫連接或查詢錯誤
**解決**:
- 檢查後端日誌
- 確認資料庫初始化完成
- 檢查表結構是否正確
- 重啟後端服務

## 效能優化建議

### 資料庫層
- ✅ 已添加主要索引
- 💡 考慮添加定時清理過期投票記錄的作業
- 💡 考慮對大型投票使用分區表

### 應用層
- ✅ 使用 Pinia 進行狀態快取
- 💡 考慮添加投票列表分頁
- 💡 考慮添加投票結果快取

### 前端層
- ✅ 使用虛擬滾動處理大列表
- 💡 考慮添加樂觀更新
- 💡 考慮添加線下功能

## 擴展功能建議

### 🔔 通知系統
```
投票開始 → 發送郵件/推播 → 員工投票
投票結束 → 發送結果摘要
```

### 🔐 權限控制
```
- 主辦者權限: 建立、編輯、刪除投票
- IT 管理員權限: 查看所有統計、系統設定
- 員工權限: 僅查看和參與投票
```

### 📱 移動端支援
```
使用 Vuetify 的響應式設計
已支援手機和平板訪問
```

### 🌍 多語言支援
```
已使用 Vue i18n
當前支援繁體中文
可輕鬆添加其他語言
```

## 開發命令

```bash
# 後端開發
cd backend
npm install              # 安裝依賴
npm start               # 啟動服務
npm run dev             # 開發模式（如果配置了）

# 前端開發
cd frontend
npm install              # 安裝依賴
npm run dev             # 啟動開發伺服器
npm run build           # 建置生產版本
npm run preview         # 預覽生產版本
```

## 檔案結構

```
frontend/
├── src/
│   ├── views/
│   │   ├── VoteView.vue              # 投票管理視圖
│   │   ├── EmployeeVoteView.vue      # 員工投票前台
│   │   ├── VoteAdminView.vue         # 主辦者後台
│   │   └── VoteITManagementView.vue  # IT 管理平台
│   ├── components/vote/
│   │   ├── VoteCard.vue              # 投票卡片
│   │   ├── VoteDialog.vue            # 投票對話框
│   │   ├── VoteResultsDialog.vue     # 結果對話框
│   │   ├── VoteDetailDialog.vue      # 詳情對話框
│   │   └── VoteStatisticsDialog.vue  # 統計對話框
│   ├── stores/
│   │   └── vote.js                   # Pinia 狀態管理
│   ├── router/
│   │   └── index.js                  # 路由配置
│   └── locales/
│       └── zh-tw.json                # 繁體中文翻譯

backend/
├── routes/
│   └── votes.js                       # 投票 API 路由
├── db/
│   └── init_votes.sql                # 資料庫初始化腳本
└── VOTING_SYSTEM_GUIDE.md            # 使用指南
```

## 更新日誌

### v1.0 (2025-12-09)
- ✅ 員工投票前台
- ✅ 投票主辦者後台
- ✅ IT 管理平台
- ✅ 防重複投票機制
- ✅ 記名/不記名投票
- ✅ 實時統計
- ✅ 資料匯出
- ✅ 系統日誌
- ✅ 繁體中文支援

## 聯繫方式

有問題或建議？請聯繫開發團隊。
