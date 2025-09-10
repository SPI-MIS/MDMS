<template>
  <CrudPage title="廠商資料維護" resource="vendor" :fields="vendorSchema" :list-headers="listHeaders" />
</template>

<script setup>
import CrudPage from '@/components/CrudPage.vue'
// import axios from 'axios'

const vendorSchema = [
  { key:'MD001', label:'廠商代碼', type:'text', col:6 },
  { key:'MD002', label:'廠商簡稱',type:'text', col:6 },
  { key:'MD003', label:'地址',type:'text', col:12 },
  { key:'MD004', label:'TEL(一)',type:'text', col:4 },
  { key:'MD005', label:'TEL(二)',type:'text', col:4 },
  { key:'MD006', label:'FAX',type:'text', col:4},
  { key:'MD007', label:'聯絡人',type:'text', col:4 },
  { key:'MD008', label:'手機',type:'text', col:4 },
  { key:'MD009', label:'MAIL',type:'text', col:4 }
]

const listHeaders = [
  { title:'選取', key:'pick', sortable:false, width:80 },
  { title:'廠商代碼', key:'MD001' },
  { title:'廠商簡稱', key:'MD002' },
  { title:'狀態', key:'IssueState' },
  { title:'建立人',   key:'Creator' },
  { title:'建立日',   key:'CreateDate' },
]
</script>