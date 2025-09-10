<template>
  <CrudPage title="模具資料維護" resource="moldBasic" :fields="moldBasicSchema" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'
// import axios from 'axios'

const moldBasicSchema = [
  { key:'ME001', label:'模具編號', type:'text', col:3 },
  { key:'ME002', label:'模具名稱',type:'text', col:4 },
  { key:'ME003', label:'模具類別',type:'text', col:3 },
  { key:'ME004', label:'模具材質',type:'text', col:2 },

  { key:'ME005', label:'廠商代號',type:'text', col:2 },
  { key:'ME006', label:'廠商簡稱',type:'text', col:4},
  { key:'ME007', label:'進貨日期',type:'text', col:3 },
  { key:'ME008', label:'儲位',type:'text', col:3 },

  { key:'ME009', label:'排數',type:'text', col:3 },
  { key:'ME0010', label:'列數',type:'text', col:3 },
  { key:'ME0011', label:'取數(穴數)',type:'text', col:3 },
  
  { key:'ME0012', label:'備註',type:'textarea', col:12 },

  { key:'ME0013', label:'壽命模數',type:'text', col:3 },
  { key:'ME0014', label:'保養模數',type:'text', col:3 },
  { key:'ME0015', label:'累計生產模數',type:'text', col:3 },
  { key:'ME0016', label:'模具狀態',type:'text', col:3 }
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