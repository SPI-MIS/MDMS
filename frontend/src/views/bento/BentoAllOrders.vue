<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4 gap-3 flex-wrap">
      <v-icon color="primary" size="28">mdi-clipboard-list-outline</v-icon>
      <span class="text-h6 font-weight-bold">我的訂購記錄</span>

      <v-divider vertical class="mx-1" style="height:28px" />

      <!-- 月份選擇 -->
      <v-btn icon="mdi-chevron-left" variant="text" density="compact" @click="shiftMonth(-1)" />
      <v-select v-model="selectedYear" :items="yearOptions" density="compact" variant="outlined" hide-details style="width:110px" />
      <v-select v-model="selectedMonth" :items="monthOptions" item-title="label" item-value="value" density="compact" variant="outlined" hide-details style="width:90px" />
      <v-btn icon="mdi-chevron-right" variant="text" density="compact" :disabled="selectedYear >= nowYear && selectedMonth >= nowMonth" @click="shiftMonth(1)" />
      <v-btn v-if="selectedYear !== nowYear || selectedMonth !== nowMonth" variant="text" size="small" color="primary" @click="goThisMonth">回本月</v-btn>

      <v-spacer />
      <span class="text-body-2 text-medium-emphasis">當月合計</span>
      <v-chip color="primary" size="large" class="font-weight-bold">${{ monthlyTotal }}</v-chip>
    </div>

    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate color="primary" />
    </div>
    <v-alert v-else-if="filteredOrders.length === 0" type="info" variant="tonal" icon="mdi-information">
      {{ selectedYear }} 年 {{ selectedMonth }} 月 尚無訂購記錄
    </v-alert>
    <v-data-table v-else :headers="headers" :items="filteredOrders" items-per-page="20" :items-per-page-options="[10,20,50]" density="comfortable" hover>
      <template #item="{ item }">
        <tr>
          <td class="text-no-wrap">{{ String(item.order_date).slice(0, 10) }}</td>
          <td>
            <v-chip size="small" :color="item.meal_type === 'lunch' ? 'orange' : 'blue'" variant="tonal">
              <v-icon start size="14">{{ item.meal_type === 'lunch' ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
              {{ item.meal_type === 'lunch' ? '午餐' : '晚餐' }}
            </v-chip>
          </td>
          <td class="py-1">
            <span v-for="(it, i) in item.items" :key="i">
              <v-chip size="x-small" variant="tonal" color="secondary" class="me-1 mb-1">{{ it.vendor }}</v-chip>
              {{ it.name }} <strong>×{{ it.quantity }}</strong>
              <span v-if="i < item.items.length - 1" class="mx-2 text-medium-emphasis">·</span>
            </span>
          </td>
          <td class="text-right font-weight-medium text-primary text-no-wrap">${{ orderTotal(item) }}</td>
        </tr>
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';

const allOrders = ref([]);
const loading = ref(false);
const now = new Date();
const nowYear = now.getFullYear();
const nowMonth = now.getMonth() + 1;
const selectedYear = ref(nowYear);
const selectedMonth = ref(nowMonth);
const yearOptions = Array.from({ length: 4 }, (_, i) => nowYear - 2 + i);
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` }));

const headers = [
  { title: '訂購日期', key: 'order_date', width: '120px', sortable: true },
  { title: '餐別',     key: 'meal_type',  width: '90px',  sortable: true },
  { title: '品項',     key: 'items',      sortable: false },
  { title: '金額',     key: 'total',      width: '90px',  sortable: false, align: 'end' },
];

const filteredOrders = computed(() =>
  allOrders.value.filter(o => {
    if (!o.order_date) return false;
    const [y, m] = String(o.order_date).slice(0, 10).split('-').map(Number);
    return y === selectedYear.value && m === selectedMonth.value;
  })
);
const orderTotal = (o) => (o.items || []).reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
const monthlyTotal = computed(() => filteredOrders.value.reduce((s, o) => s + orderTotal(o), 0));

const shiftMonth = (delta) => {
  let y = selectedYear.value, m = selectedMonth.value + delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1)  { m = 12; y--; }
  if (y > nowYear || (y === nowYear && m > nowMonth)) return;
  selectedYear.value = y; selectedMonth.value = m;
};
const goThisMonth = () => { selectedYear.value = nowYear; selectedMonth.value = nowMonth; };

const fetchOrders = async () => {
  loading.value = true;
  try { allOrders.value = (await api.get('/bento/orders')).data; }
  catch { alert('獲取訂購記錄失敗'); }
  finally { loading.value = false; }
};

onMounted(fetchOrders);
</script>

<style scoped>
.gap-3 { gap: 12px; }
</style>
