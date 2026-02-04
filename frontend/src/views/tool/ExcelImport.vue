<template>
  <div>
    <!-- 原物料資料匯入 -->
    <ExcelImport
      title="Excel 資料匯入"
      :headers="materialHeaders"
      preview-url="/api/tool/preview"
      import-url="/api/tool/import"
      @import-success="handleImportSuccess"
      @import-error="handleImportError"
    />
  </div>
</template>

<script setup>
// import { ref } from 'vue'
import ExcelImport from '@/components/common/excel.vue'

// 原物料表頭配置
const materialHeaders = [
  { title: '南化ERP品號', key: '南化ERP品號' },
  { title: 'TDF原物料編號', key: 'TDF原物料編號' },
  { title: '原物料名稱', key: '原物料名稱' },
  { title: '數量單位', key: '數量單位' },
  { title: '數量單價', key: '數量單價' },
  { title: '舊數量單價', key: '舊數量單價' }
]

// 匯入成功處理
const handleImportSuccess = (data) => {
  console.log('✅ 匯入成功:', data)
  // 可以在這裡做其他處理，例如：
  // - 重新載入資料列表
  // - 顯示成功通知
  // - 導航到其他頁面
}

// 匯入失敗處理
const handleImportError = (error) => {
  console.error('❌ 匯入失敗:', error)
  // 可以在這裡做錯誤處理，例如：
  // - 顯示錯誤通知
  // - 記錄錯誤日誌
}
</script>