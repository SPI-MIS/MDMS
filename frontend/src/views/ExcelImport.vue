<template>
  <div class="mt-3 ml-3" >    
    <h2>📥 Excel 資料匯入</h2>    
    <!-- 檔案上傳 -->
    <input type="file" accept=".xlsx,.xls" @change="handleFile" />
    <p v-if="message" class="text-red-500 mt-2">{{ message }}</p>
    <!-- 預覽 -->
    <v-card class="ma-3" >
      <div v-if="previewData">
        <h3 class="mt-2">🔄 預覽結果：</h3>

        <div v-if="previewData.updates.length">
          <h4 class="mt-2 ml-3">✏️ 將更新資料：</h4>
          <v-data-table class="ma-3" :headers="headers" :items="previewData.updates" density="compact" hide-default-footer />
        </div>

        <div v-if="previewData.inserts.length">
          <h4 class="mt-2 ml-3">➕ 將新增資料：</h4>
          <v-data-table class="ma-3" :headers="headers" :items="previewData.inserts" density="compact" hide-default-footer />
        </div>

        <!-- ✅ 如果無更新也無新增資料，顯示提示文字 -->
        <div v-if="!previewData.updates.length && !previewData.inserts.length" class="mt-4 text-grey">
          ⚠️ 沒有可更新資料
        </div>

        <!-- ✅ 匯入按鈕僅在有資料時顯示 -->
        <v-btn v-if="previewData.updates.length || previewData.inserts.length" color="primary" class="ma-3" @click="handleImport" >
          ✅ 確定匯入
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const file = ref(null)
const message = ref('')
const previewData = ref(null)

// 自行定義欄位表頭
const headers = [
  { title: '南化ERP品號', key: '南化ERP品號' },
  { title: 'TDF原物料編號', key: 'TDF原物料編號' },
  { title: '數量單價', key: '數量單價' },
  { title: '舊數量單價', key: '舊數量單價' }
]

const handleFile = async (event) => {
  const f = event.target.files[0]
  if (!f) return
  file.value = f
  message.value = ''
  previewData.value = null

  const form = new FormData()
  form.append('file', f)

  try {
    const res = await axios.post('/api/tool/preview', form)
    previewData.value = res.data
    console.log(previewData.value)
  } catch (err) {
    message.value = `❌ 預覽失敗: ${err.response?.data?.error || err.message}`
  }
}

const handleImport = async () => {
  if (!previewData.value) return

  try {
    const res = await axios.post('/api/tool/import', {
      updates: previewData.value.updates,
      inserts: previewData.value.inserts
    })
    alert('✅ 匯入成功！')
    previewData.value = null
    file.value = null
  } catch (err) {
    alert(`❌ 匯入失敗: ${err.response?.data?.error || err.message}`)
  }
}
</script>
