# 修復投票後狀態不更新的問題

## 問題描述
用戶投票成功後，前端仍然顯示「投票」按鈕，而不是「已投票」狀態。資料庫中已正確記錄投票，但 UI 沒有正確反映。

## 根本原因
1. **響應性問題**：直接修改 `hasVotedMap.value[voteId]` 可能不會觸發 Vue 3 的響應性系統
2. **時序問題**：成功對話框在 `checkUserVoteStatus` 之前顯示，且使用 `setTimeout` 延遲檢查
3. **缺少調試信息**：沒有足夠的日志來追踪狀態變化

## 解決方案

### 1. 前端修改 (EmployeeVoteView.vue)

#### 修改 1: 改進 `onSubmitVote` 函數
```javascript
const onSubmitVote = async (voteData) => {
  try {
    const result = await voteStore.submitVote(voteData)
    console.log('[Vote Submit Success]', result)
    
    const voteId = selectedVote.value.voteId
    
    // 投票成功後立即更新已投票狀態
    console.log(`[Setting hasVotedMap] voteId=${voteId} to true`)
    hasVotedMap.value[voteId] = true
    
    // 檢查更新是否已生效
    console.log(`[Verify hasVotedMap] voteId=${voteId} is now ${hasVotedMap.value[voteId]}`)
    console.log(`[voteCardMap] ${voteId} = ${voteCardMap.value[voteId]}`)
    
    voteDialog.value = false
    successDialog.value = true
    
    // 立即檢查投票狀態以與伺服器同步（不需要等待）
    console.log('[Calling checkUserVoteStatus immediately]')
    await checkUserVoteStatus()
    
    // 關閉成功對話框
    setTimeout(() => {
      successDialog.value = false
      console.log('[Success dialog closed]')
      console.log(`[Final state] hasVotedMap[${voteId}] = ${hasVotedMap.value[voteId]}`)
    }, 1500)
  } catch (error) {
    // ... 錯誤處理
  }
}
```

**關鍵變更**：
- 添加詳細的控制台日志
- **立即調用** `await checkUserVoteStatus()` 而不是延遲 1500ms
- 只延遲關閉成功對話框

#### 修改 2: 改進 `checkUserVoteStatus` 函數
```javascript
const checkUserVoteStatus = async () => {
  try {
    if (!userId.value) {
      console.warn('[checkUserVoteStatus] No userId found')
      return
    }

    console.log(`[checkUserVoteStatus] Checking status for ${voteStore.votes.length} votes`)
    
    // 收集所有投票狀態
    const newVotedStatus = {}
    
    for (const vote of voteStore.votes) {
      const hasVoted = await voteStore.checkUserVoted(vote.voteId, userId.value)
      console.log(`[checkUserVoted] ${vote.voteId}: ${hasVoted}`)
      newVotedStatus[vote.voteId] = hasVoted
    }
    
    // 使用 Object.assign 確保 Vue 響應性
    Object.assign(hasVotedMap.value, newVotedStatus)
    
    console.log('[checkUserVoteStatus] Complete. Final hasVotedMap:', hasVotedMap.value)
  } catch (error) {
    console.error('Error checking vote status:', error)
  }
}
```

**關鍵變更**：
- 先收集所有狀態到臨時對象 `newVotedStatus`
- 使用 `Object.assign()` 批量更新 `hasVotedMap.value`，確保觸發 Vue 響應性
- 添加詳細日志

#### 修改 3: 添加 watch 監視器
```javascript
import { ref, computed, onMounted, watch } from 'vue'

// 監視 hasVotedMap 的變化以調試
watch(() => hasVotedMap.value, (newVal, oldVal) => {
  console.log('[hasVotedMap changed]', newVal)
}, { deep: true })
```

**目的**：追踪 `hasVotedMap` 何時變化

### 2. 後端修改 (votes.js)

#### 修改 1: 添加日志到 POST /api/votes/submit
```javascript
router.post('/votes/submit', async (req, res) => {
  const { voteId, selectedOptions, userId, anonymous, votedAt } = req.body;

  console.log('[POST /votes/submit] Request:', { voteId, userId, selectedOptions, anonymous, votedAt });

  // ... 現有邏輯 ...

  console.log('[POST /votes/submit] Existing vote count:', existingVote[0].voteCount);

  // ... 更多邏輯 ...

  console.log('[POST /votes/submit] Vote submitted successfully, participantId:', participantId);

  // ...
});
```

#### 修改 2: 添加日志到 GET /api/votes/:voteId/check-voted
```javascript
router.get('/votes/:voteId/check-voted', async (req, res) => {
  const { voteId } = req.params;
  const { userId } = req.query;

  console.log('[GET /votes/:voteId/check-voted] Request:', { voteId, userId });

  // ... 現有邏輯 ...

  const hasVoted = result[0].voteCount > 0;
  console.log('[GET /votes/:voteId/check-voted] Result:', { hasVoted, voteCount: result[0].voteCount });
  
  res.json({ hasVoted });
});
```

## 測試步驟

1. **打開瀏覽器控制台** (F12)
2. **導航到員工投票頁面**
3. **觀察日志**：應該看到 `[checkUserVoteStatus]` 日志
4. **點擊投票按鈕**，選擇選項並提交
5. **觀察控制台日志順序**：
   ```
   [Vote Submit Success] ...
   [Setting hasVotedMap] voteId=XXX to true
   [Verify hasVotedMap] voteId=XXX is now true
   [voteCardMap] XXX = true
   [Calling checkUserVoteStatus immediately]
   [checkUserVoteStatus] Checking status for N votes
   [checkUserVoted] XXX: true
   [hasVotedMap changed] { XXX: true, ... }
   [checkUserVoteStatus] Complete. Final hasVotedMap: { ... }
   [Success dialog closed]
   [Final state] hasVotedMap[XXX] = true
   ```

6. **檢查後端日志**（Docker logs）：
   ```
   [POST /votes/submit] Request: { voteId: 'XXX', userId: 'YYY', ... }
   [POST /votes/submit] Existing vote count: 0
   [POST /votes/submit] Vote submitted successfully, participantId: PART_XXX_YYY_...
   [GET /votes/:voteId/check-voted] Request: { voteId: 'XXX', userId: 'YYY' }
   [GET /votes/:voteId/check-voted] Result: { hasVoted: true, voteCount: 1 }
   ```

7. **驗證 UI**：投票後，按鈕應立即變為「已投票」（綠色 tonal 按鈕）

## 技術細節

### Vue 3 響應性
- 直接修改 `ref` 對象的屬性 (`ref.value[key] = val`) 在某些情況下可能不會觸發響應性
- 使用 `Object.assign(ref.value, newObj)` 更可靠
- `watch` 與 `{ deep: true }` 可以監視嵌套對象的變化

### 計算屬性 voteCardMap
```javascript
const voteCardMap = computed(() => {
  const map = {}
  for (const vote of filteredVotes.value) {
    map[vote.voteId] = hasVotedMap.value[vote.voteId] || false
  }
  return map
})
```
- 依賴於 `hasVotedMap.value` 和 `filteredVotes.value`
- 當 `hasVotedMap` 正確更新時，這個計算屬性會自動重新計算
- VoteCard 組件的 `:has-voted="voteCardMap[vote.voteId]"` prop 會自動更新

### 時序優化
- **之前**：提交 → 顯示成功對話框 → 等待 1500ms → 檢查狀態
- **之後**：提交 → **立即檢查狀態** → 顯示成功對話框 → 等待 1500ms → 關閉對話框

這確保在用戶看到確認之前，UI 狀態已經與伺服器同步。

## 預期結果

投票成功提交後：
1. 前端立即更新 `hasVotedMap`
2. 立即調用後端 API 確認狀態
3. `voteCardMap` 重新計算
4. VoteCard 組件收到新的 `hasVoted` prop
5. 按鈕從「投票」變為「已投票」
6. 成功對話框顯示
7. 1.5 秒後對話框自動關閉

## 如果問題仍然存在

查看控制台日志和後端日志，檢查：

1. `hasVotedMap` 是否被正確設置？
2. `checkUserVoted` API 是否返回 `hasVoted: true`？
3. `voteCardMap` 是否正確計算？
4. VoteCard 組件是否收到正確的 `hasVoted` prop？

如果所有日志都正確但 UI 仍未更新，可能需要：
- 檢查 Vue DevTools 中的組件狀態
- 驗證 VoteCard 組件的 template 邏輯（`v-if="isVotingAvailable && !hasVoted"`）
- 確認沒有其他代碼覆蓋了 `hasVotedMap` 的值
