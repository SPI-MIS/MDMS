<template>
  <v-footer app height="36" class="justify-center text-caption py-1 px-3" color="primary" >
    <div class="py-4 px-2">
      <span class="font-weight-light">&copy; {{ new Date().getFullYear() }} 南化 SPI 系統(25.10.27)</span>
    </div>
  </v-footer>
</template>

<script setup>
// 無需 script 區塊，因為使用簡單顯示內容。
</script>

<style scoped>
.v-footer {
  font-size: 12px;
  background-color: #f8f8f8; /* 可視情況調整 */
  border-top: 1px solid #ddd;
}
</style>