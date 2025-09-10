<template>
  <CrudPage title="模具分類維護" resource="moldC" :fields="materialSchema" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'
import axios from 'axios'

const materialSchema = [
  { key:'MB001', label:'分類代碼', type:'text', pk:true, readonly:({isNew})=>!isNew },
  { key:'MB002', label:'模具種類', type:'select',
    options: async () => {
      const { data } = await axios.get('/api/molds', { params:{ state:'Y' }})
      return data.map(r => ({ title:r.MA001, value:r.MA001 }))
    }
  },
  { key:'MB003', label:'說明', type:'textarea', col:12 }
]

const listHeaders = [
  { title:'選取', key:'pick', sortable:false, width:80 },
  { title:'分類代碼', key:'MB001' },
  { title:'模具種類',   key:'MB002' },
  { title:'狀態',     key:'IssueState' },
  { title:'建立人',   key:'Creator' },
  { title:'建立日',   key:'CreateDate' },
]
</script>