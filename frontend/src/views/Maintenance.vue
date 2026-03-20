<!-- components/Maintenance.vue -->
<template>
  <div class="maintenance-container">
    <img src="@/assets/maintenance.svg" alt="Maintenance" class="icon" />
    <h1>系統維護中</h1>
    <p>為了提供更好的服務，網站正在進行維護。</p>
    <!-- <p>預計維護時間：{{ maintenanceTime }}</p> -->
    <p>造成不便，敬請見諒。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const maintenanceTime = ref('2026/03/21 00:00 - 06:00');
</script>

<style scoped>
.maintenance-container {
  text-align: center;
  padding: 50px;
  font-family: sans-serif;
}
.icon {
  width: 200px;
  height: 200px;
}
</style>