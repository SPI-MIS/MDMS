<template>
  <div>
    <!-- 原物料資料匯入 -->
    <ExcelImport
      title="Excel 資料匯入"
      :headers="materialHeaders"
      preview-url="/api/tool/QApreview"
      import-url="/api/tool/QAimport"
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
  { title: '品號', key: '品號' },
  { title: '品名', key: '品名' },
  { title: '規格', key: '規格' },
  { title: '單位', key: '單位' },
  { title: '包裝單位', key: '包裝單位' },
  { title: '批號', key: '批號' },
  { title: '期末包裝庫存', key: '期末包裝庫存' },
  { title: '備註', key: '備註' }
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