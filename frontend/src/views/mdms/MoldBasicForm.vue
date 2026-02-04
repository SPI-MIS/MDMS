<template>
  <CrudPage title="模具資料維護" resource="moldbasic" :fields="moldBasicSchema" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'
import axios from 'axios'

const moldBasicSchema = [
  { key:'ME001', label:'模具編號', type:'text', col:3, pk:true },
  { key:'ME002', label:'模具名稱',type:'text', col:5 },
  { key:'ME006', label:'進貨日期', type:'date', col:4, default: () => new Date().toISOString().slice(0, 10) },

  { key:'ME003', label:'模具類別',type:'select', col:3,
    options: async () => {
      const { data } = await axios.get('/api/molds', { params:{ state:'Y' }})
      return data.map(r => ({ title:r.MA001, value:r.MA001 }))}
  }, 
  { key:'ME004', label:'模具材質',type:'select', col:3,
    options: async () => {
      const { data } = await axios.get('/api/material', { params:{ state:'Y' }})
      return data.map(r => ({ title:r.MC001, value:r.MC001 }))} 
  },

  { key:'ME005', label:'廠商代號',type:'text', col:3,
    transform:{
      get: v => v || '',
      set: v => (v || '').toUpperCase()
      // .replace(/[^A-Z0-9]/g, '')
    },
    lookup: {
      url: (v) => `/api/spi/${encodeURIComponent(v)}`, // 回 { MA001, MA002, ... }
      pick: 'MA002',           // 取回傳資料的 MA002
      trigger: 'blur',         // 離焦才查；要即時就拿掉這行（預設 input）+ debounce
      debounce: 300,
      immediate: true,          // 若載入時 ME005 已有值，先查一次顯示簡稱
      hintPick: 'MA002'
    }
  },
  
 
  { key:'ME007', label:'儲位', type:'text', col:3 },
  { key:'ME008', label:'排數', type:'text', col:3 },
  { key:'ME009', label:'列數', type:'text', col:3 },
  { key:'ME010', label:'取數(穴數)',type:'text', col:3 },
  
  { key:'ME011', label:'備註', type:'textarea', col:12 },

  { key:'ME012', label:'壽命模數', type:'text', col:3, hideOnCreate: true, required: ({ isNew }) => !isNew },
  { key:'ME013', label:'保養模數', type:'text', col:3, hideOnCreate: true, required: ({ isNew }) => !isNew },
  { key:'ME014', label:'累計生產模數', type:'text', col:3, hideOnCreate: true, required: ({ isNew }) => !isNew },
  { key:'ME015', label:'模具狀態', type:'text', col:3, hideOnCreate: true, required: ({ isNew }) => !isNew }
]

const listHeaders = [
  { title:'選取', key:'pick', sortable:false, width:80 },
  { title:'模具編號', key:'ME001' },
  { title:'模具名稱', key:'ME002' },
  { title:'模具類別', key:'ME003' },
  { title:'建立人',   key:'Creator' },
  { title:'建立日',   key:'CreateDate' },
]
</script>