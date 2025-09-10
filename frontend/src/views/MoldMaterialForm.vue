<template>
  <CrudPage title="模具材質維護" resource="material" :fields="materialSchema" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'

const materialSchema = [
  { key:'MC001', label:'材質名稱', type:'text', pk:true, readonly:({isNew})=>!isNew },
  { key:'MC002', label:'說明', type:'textarea', col:12 }
]

const listHeaders = [
  { title:'選取', key:'pick', sortable:false, width:80 },
  { title:'材質名稱', key:'MC001' },
  { title:'狀態',     key:'IssueState' },
  { title:'建立人',   key:'Creator' },
  { title:'建立日',   key:'CreateDate' },
]
</script>