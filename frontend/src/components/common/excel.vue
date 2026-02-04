<template>
  <div class="mt-3 ml-3">    
    <h2>📥 {{ title }}</h2>    
    
    <!-- 檔案上傳 -->
    <input type="file" accept=".xlsx,.xls" @change="handleFile" />
    <p v-if="message" class="text-red-500 mt-2">{{ message }}</p>
    
    <!-- 預覽 -->
    <v-card class="ma-3">
      <div v-if="previewData">
        <h3 class="mt-2">🔄 預覽結果：</h3>

        <div v-if="previewData.updates.length">
          <h4 class="mt-2 ml-3">✏️ 將更新資料：</h4>
          <v-data-table 
            class="ma-3" 
            :headers="headers" 
            :items="previewData.updates" 
            density="compact" 
            hide-default-footer 
          />
        </div>

        <div v-if="previewData.inserts.length">
          <h4 class="mt-2 ml-3">➕ 將新增資料：</h4>
          <v-data-table 
            class="ma-3" 
            :headers="headers" 
            :items="previewData.inserts" 
            density="compact" 
            hide-default-footer 
          />
        </div>

        <!-- 如果無更新也無新增資料，顯示提示文字 -->
        <div v-if="!previewData.updates.length && !previewData.inserts.length" class="mt-4 text-grey">
          ⚠️ 沒有可更新資料
        </div>

        <!-- 匯入按鈕僅在有資料時顯示 -->
        <v-btn 
          v-if="previewData.updates.length || previewData.inserts.length" 
          color="primary" 
          class="ma-3" 
          @click="handleImport"
        >
          ✅ 確定匯入
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

// Props 定義
const props = defineProps({
  title: {
    type: String,
    default: 'Excel 資料匯入'
  },
  headers: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(h => h.title && h.key)
    }
  },
  previewUrl: {
    type: String,
    required: true
  },
  importUrl: {
    type: String,
    required: true
  },
  // 額外參數（可選）
  extraParams: {
    type: Object,
    default: () => ({})
  }
})

// Emits 定義
const emit = defineEmits(['import-success', 'import-error', 'preview-success', 'preview-error'])

const file = ref(null)
const message = ref('')
const previewData = ref(null)

const handleFile = async (event) => {
  const f = event.target.files[0]
  if (!f) return
  
  file.value = f
  message.value = ''
  previewData.value = null

  const form = new FormData()
  form.append('file', f)
  
  // 將額外參數也加入 FormData
  Object.keys(props.extraParams).forEach(key => {
    form.append(key, props.extraParams[key])
  })

  try {
    const res = await axios.post(props.previewUrl, form)
    previewData.value = res.data
    emit('preview-success', res.data)
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message
    message.value = `❌ 預覽失敗: ${errorMsg}`
    emit('preview-error', err)
  }
}

const handleImport = async () => {
  if (!previewData.value) return

  try {
    const res = await axios.post(props.importUrl, {
      updates: previewData.value.updates,
      inserts: previewData.value.inserts,
      ...props.extraParams
    })
    alert('✅ 匯入成功！')
    emit('import-success', res.data)
    previewData.value = null
    file.value = null
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message
    alert(`❌ 匯入失敗: ${errorMsg}`)
    emit('import-error', err)
  }
}
</script>