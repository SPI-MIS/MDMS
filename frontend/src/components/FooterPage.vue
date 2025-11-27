<template>
  <v-footer app height="36" class="py-1 px-3" color="primary">
    <v-container fluid>
      <v-row align="center" justify="space-between" class="text-caption">
        <!-- 左 -->
        <v-col cols="4" class="text-left py-0"></v-col>

        <!-- 中 -->
        <v-col cols="4" class="text-center py-0"> &copy; {{ new Date().getFullYear() }} 南化模具管理系統 </v-col>

        <!-- 右 -->
        <v-col cols="4" class="text-right py-0">版本 v1.0.7</v-col>
      </v-row>
    </v-container>
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