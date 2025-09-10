<script setup>
import CrudPage from '@/components/CrudPage.vue'
import axios from 'axios'

const materialSchema = [
  { key:'MB001', label:'材質代碼', type:'text', pk:true, readonly:({isNew})=>!isNew },
  { key:'MB003', label:'說明',     type:'textarea', col:12 },
  { key:'MB002', label:'模具類別', type:'select',
    options: async () => {
      const { data } = await axios.get('/api/molds', { params:{ state:'Y' }})
      return data.map(r => ({ title:r.MA001, value:r.MA001 }))
    }
  },
  { key:'MB004', label:'供應商', type:'select',
    options: async () => {
      const { data } = await axios.get('/api/vendors', { params:{ state:'Y' }})
      return data.map(r => ({ title:r.VA002, value:r.VA001 }))
    }
  }
]
</script>

<template>
  <CrudPage title="模具材質維護" resource="materials" :fields="materialSchema" />
</template>
