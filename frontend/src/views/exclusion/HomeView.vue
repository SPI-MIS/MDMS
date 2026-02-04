<template>
  <MultiRowForm 
    v-model="formData" 
    :schema="formSchema" 
    title="除外工時填寫"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { ref } from 'vue'
import MultiRowForm from '@/components/common/MultiBulkInput.vue'
import { formSchema } from './formSchema'

const formData = ref([])

async function handleSubmit(data) {
  console.log('準備提交的資料:', data)
  
  try {
    const response = await fetch('/api/exclusion/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: data })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '提交失敗')
    }
    
    const result = await response.json()
    console.log('提交成功:', result)
    alert(`成功儲存 ${result.count || data.length} 筆資料！`)
    
    // 清空表單
    formData.value = []
  } catch (error) {
    console.error('提交錯誤:', error)
    alert('儲存失敗：' + error.message)
  }
}
</script>