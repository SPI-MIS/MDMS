<template>
  <CrudPage title="模具種類維護" resource="molds" :fields="fields" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'

const fields = [
  { key:'MA001', label:'模具種類', type:'text', pk:true, col:6, readonly:({isNew})=>!isNew },
  { key:'MA002', label:'組合式模具', type:'checkbox', col:6,
    transform:{ get:v=>v==='Y', set:v=>v?'Y':'N' } },
  { key:'MA003', label:'說明', type:'textarea', col:12 },
]
const listHeaders = [
  { title:'選取', key:'pick', sortable:false, width:80 },
  { title:'模具種類', key:'MA001' },
  { title:'組合式',   key:'MA002' },
  { title:'狀態',     key:'IssueState' },
  { title:'建立人',   key:'Creator' },
  { title:'建立日',   key:'CreateDate' },
]
</script>

