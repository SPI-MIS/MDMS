<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid>
    <!-- 頁籤 -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="daily">
        <v-icon start>mdi-calendar-today</v-icon>每日彙總
      </v-tab>
      <v-tab value="monthly">
        <v-icon start>mdi-calendar-month</v-icon>每月匯總
      </v-tab>
      <v-tab value="dept">
        <v-icon start>mdi-office-building</v-icon>每日各部門
      </v-tab>
      <v-tab value="overtime">
        <v-icon start>mdi-food-takeout-box</v-icon>加班便當
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- ======== 每日彙總 ======== -->
      <v-tabs-window-item value="daily">
        <!-- 篩選列 -->
        <div class="d-flex flex-wrap align-center gap-3 mb-4">
          <v-btn icon="mdi-chevron-left" variant="text" density="compact" @click="shiftDay(-1)" />
          <v-menu v-model="datePicker" :close-on-content-click="false" max-width="320">
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="tonal" prepend-icon="mdi-calendar" color="primary" min-width="200">
                {{ selectedDateLabel }}
              </v-btn>
            </template>
            <v-date-picker
              v-model="pickerModel"
              :max="maxPickerDate"
              hide-header
              @update:model-value="onDatePick"
            />
          </v-menu>
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="compact"
            :disabled="selectedDate >= todayStr"
            @click="shiftDay(1)"
          />
          <v-btn v-if="selectedDate !== todayStr" variant="text" size="small" color="primary" @click="goToday">
            回今天
          </v-btn>

          <v-divider vertical class="mx-1" style="height:28px" />

          <v-btn-toggle v-model="mealType" mandatory density="compact" variant="outlined" color="primary">
            <v-btn value="all">
              <v-icon size="16" class="me-1">mdi-all-inclusive</v-icon>全部
            </v-btn>
            <v-btn value="lunch">
              <v-icon size="16" color="orange" class="me-1">mdi-white-balance-sunny</v-icon>午餐
            </v-btn>
            <v-btn value="dinner">
              <v-icon size="16" color="blue" class="me-1">mdi-weather-night</v-icon>晚餐
            </v-btn>
          </v-btn-toggle>

          <v-spacer />

          <v-btn
            color="success"
            variant="tonal"
            prepend-icon="mdi-microsoft-excel"
            :loading="exporting === 'excel'"
            @click="exportData('excel')"
          >
            匯出 Excel
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            prepend-icon="mdi-file-pdf-box"
            :loading="exporting === 'pdf'"
            @click="exportData('pdf')"
          >
            匯出 PDF
          </v-btn>
        </div>

        <!-- 載入中 -->
        <div v-if="dailyLoading" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- 無資料 -->
        <v-alert v-else-if="dailyData.length === 0" type="info" variant="tonal" icon="mdi-information">
          {{ selectedDateLabel }}{{ mealTypeLabel }} 尚無訂單
        </v-alert>

        <!-- 店家展開面板 -->
        <template v-else>
          <v-expansion-panels variant="accordion" multiple>
            <v-expansion-panel v-for="vendor in dailyData" :key="vendor.vendor_name">
              <v-expansion-panel-title>
                <div class="d-flex align-center gap-3 w-100">
                  <v-icon color="orange">mdi-store</v-icon>
                  <span class="font-weight-bold text-body-1">{{ vendor.vendor_name }}</span>
                  <v-chip size="small" color="orange" variant="tonal">
                    {{ vendor.users.length }} 人
                  </v-chip>
                  <v-spacer />
                  <v-chip color="primary" variant="tonal" class="me-4">
                    總計 ${{ vendor.total_amount }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-left">訂購人</th>
                      <th class="text-left">訂購內容</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="u in vendor.users" :key="u.user_id">
                      <td class="text-no-wrap py-2">
                        <v-icon size="16" class="me-1" color="grey">mdi-account</v-icon>
                        {{ u.user_id }}
                      </td>
                      <td class="py-2">
                        <span v-for="(item, idx) in u.items" :key="idx">
                          <v-chip
                            v-if="mealType === 'all'"
                            size="x-small"
                            :color="item.meal_type === 'lunch' ? 'orange' : 'blue'"
                            variant="tonal"
                            class="me-1 mb-1"
                          >
                            {{ item.meal_type === 'lunch' ? '午' : '晚' }}
                          </v-chip>
                          {{ item.item_name }}
                          <strong>×{{ item.quantity }}</strong>
                          <span v-if="idx < u.items.length - 1" class="mx-1 text-medium-emphasis">·</span>
                        </span>
                      </td>
                    </tr>
                    <!-- 品項數量小計 -->
                    <tr class="bg-blue-grey-lighten-5">
                      <td class="text-caption text-medium-emphasis text-no-wrap py-1 ps-3">品項小計</td>
                      <td class="py-1">
                        <span v-for="(t, i) in vendorItemTotals(vendor)" :key="i">
                          {{ t.item_name }}
                          <strong class="text-primary">×{{ t.quantity }}</strong>
                          <span v-if="i < vendorItemTotals(vendor).length - 1" class="mx-1 text-medium-emphasis">·</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- 當日總計 -->
          <v-card elevation="1" class="mt-4 pa-4">
            <div class="d-flex justify-end align-center gap-6">
              <span class="text-body-2 text-medium-emphasis">店家數</span>
              <v-chip color="secondary" size="large">{{ dailyData.length }} 家</v-chip>
              <span class="text-body-2 text-medium-emphasis">當日總金額</span>
              <v-chip color="primary" size="large" class="font-weight-bold">${{ dailyGrandTotal }}</v-chip>
            </div>
          </v-card>
        </template>
      </v-tabs-window-item>

      <!-- ======== 每月匯總 ======== -->
      <v-tabs-window-item value="monthly">
        <!-- 年月選擇 + 匯出 -->
        <div class="d-flex align-center gap-3 mb-4">
          <v-btn icon="mdi-chevron-left" variant="text" density="compact" @click="shiftMonth(-1)" />
          <v-select
            v-model="selectedYear"
            :items="yearOptions"
            density="compact"
            variant="outlined"
            hide-details
            style="width:110px"
          />
          <v-select
            v-model="selectedMonth"
            :items="monthOptions"
            item-title="label"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            style="width:90px"
          />
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            density="compact"
            :disabled="selectedYear >= nowYear && selectedMonth >= nowMonth"
            @click="shiftMonth(1)"
          />
          <v-btn
            v-if="selectedYear !== nowYear || selectedMonth !== nowMonth"
            variant="text"
            size="small"
            color="primary"
            @click="goThisMonth"
          >
            回本月
          </v-btn>

          <v-spacer />

          <v-btn
            color="success"
            variant="tonal"
            prepend-icon="mdi-microsoft-excel"
            :loading="exporting === 'excel'"
            @click="exportData('excel')"
          >
            匯出 Excel
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            prepend-icon="mdi-file-pdf-box"
            :loading="exporting === 'pdf'"
            @click="exportData('pdf')"
          >
            匯出 PDF
          </v-btn>
        </div>

        <!-- 載入中 -->
        <div v-if="monthlyLoading" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- 無資料 -->
        <v-alert v-else-if="monthlyData.length === 0" type="info" variant="tonal" icon="mdi-information">
          {{ selectedYear }} 年 {{ selectedMonth }} 月 尚無訂單紀錄
        </v-alert>

        <!-- 每月展開面板 -->
        <template v-else>
          <v-expansion-panels variant="accordion" multiple>
            <v-expansion-panel v-for="(u, idx) in monthlyData" :key="u.user_id">
              <v-expansion-panel-title>
                <div class="d-flex align-center gap-3 w-100">
                  <span class="text-medium-emphasis text-body-2 mr-1">{{ idx + 1 }}</span>
                  <v-icon color="grey">mdi-account</v-icon>
                  <span class="font-weight-bold text-body-1">{{ u.user_id }}</span>
                  <v-chip size="small" color="secondary" variant="tonal">
                    {{ u.order_count }} 次
                  </v-chip>
                  <v-spacer />
                  <v-chip color="primary" variant="tonal" class="me-4">
                    當月 ${{ u.total_amount }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-left">日期</th>
                      <th class="text-left">餐別</th>
                      <th class="text-left">店家</th>
                      <th class="text-left">訂購內容</th>
                      <th class="text-right">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="order in u.daily_orders" :key="order.order_date + order.meal_type">
                      <td class="text-no-wrap py-2">{{ order.order_date }}</td>
                      <td class="py-2">
                        <v-chip
                          size="x-small"
                          :color="order.meal_type === 'lunch' ? 'orange' : 'blue'"
                          variant="tonal"
                        >
                          {{ order.meal_type === 'lunch' ? '午餐' : '晚餐' }}
                        </v-chip>
                      </td>
                      <td class="py-2">{{ order.vendor_name }}</td>
                      <td class="py-2">
                        <span v-for="(item, i) in order.items" :key="i">
                          {{ item.item_name }} <strong>×{{ item.quantity }}</strong>
                          <span v-if="i < order.items.length - 1" class="mx-1 text-medium-emphasis">·</span>
                        </span>
                      </td>
                      <td class="text-right font-weight-medium text-primary py-2">
                        ${{ order.day_amount }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- 月度總計 -->
          <v-card elevation="1" class="mt-4 pa-4">
            <div class="d-flex justify-end align-center gap-6">
              <span class="text-body-2 text-medium-emphasis">訂購人數</span>
              <v-chip color="secondary" size="large">{{ monthlyData.length }} 人</v-chip>
              <span class="text-body-2 text-medium-emphasis">當月總金額</span>
              <v-chip color="primary" size="large" class="font-weight-bold">${{ monthlyGrandTotal }}</v-chip>
            </div>
          </v-card>
        </template>
      </v-tabs-window-item>
      <!-- ======== 每日各部門匯總 ======== -->
      <v-tabs-window-item value="dept">
        <div class="d-flex flex-wrap align-center gap-3 mb-4">
          <v-btn icon="mdi-chevron-left" variant="text" density="compact" @click="shiftDeptDay(-1)" />
          <v-menu v-model="deptDatePicker" :close-on-content-click="false" max-width="320">
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="tonal" prepend-icon="mdi-calendar" color="primary" min-width="200">
                {{ deptDateLabel }}
              </v-btn>
            </template>
            <v-date-picker v-model="deptPickerModel" :max="deptMaxDate" hide-header @update:model-value="onDeptDatePick" />
          </v-menu>
          <v-btn icon="mdi-chevron-right" variant="text" density="compact" :disabled="deptDate >= todayStr" @click="shiftDeptDay(1)" />
          <v-btn v-if="deptDate !== todayStr" variant="text" size="small" color="primary" @click="deptDate = todayStr">回今天</v-btn>

          <v-divider vertical class="mx-1" style="height:28px" />

          <v-btn-toggle v-model="deptMealType" mandatory density="compact" variant="outlined" color="primary">
            <v-btn value="all"><v-icon size="16" class="me-1">mdi-all-inclusive</v-icon>全部</v-btn>
            <v-btn value="lunch"><v-icon size="16" color="orange" class="me-1">mdi-white-balance-sunny</v-icon>午餐</v-btn>
            <v-btn value="dinner"><v-icon size="16" color="blue" class="me-1">mdi-weather-night</v-icon>晚餐</v-btn>
          </v-btn-toggle>

          <v-spacer />
          <v-btn color="success" variant="tonal" prepend-icon="mdi-microsoft-excel" :loading="exporting === 'excel'" @click="exportData('excel')">匯出 Excel</v-btn>
          <v-btn color="error" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="exporting === 'pdf'" @click="exportData('pdf')">匯出 PDF</v-btn>
          <v-divider vertical class="mx-1" style="height:28px" />
          <span class="text-body-2 text-medium-emphasis">當日總計</span>
          <v-chip color="primary" size="large" class="font-weight-bold">${{ deptGrandTotal }}</v-chip>
        </div>

        <div v-if="deptLoading" class="text-center py-10"><v-progress-circular indeterminate color="primary" /></div>
        <v-alert v-else-if="deptData.length === 0" type="info" variant="tonal" icon="mdi-information">
          {{ deptDateLabel }} 尚無訂購記錄
        </v-alert>
        <v-expansion-panels v-else variant="accordion" multiple>
          <v-expansion-panel v-for="d in deptData" :key="d.dept_name">
            <v-expansion-panel-title>
              <div class="d-flex align-center gap-3 w-100">
                <v-icon color="secondary">mdi-office-building</v-icon>
                <span class="font-weight-bold text-body-1">{{ d.dept_name }}</span>
                <v-chip size="small" color="secondary" variant="tonal">{{ d.users.length }} 人</v-chip>
                <v-spacer />
                <v-chip color="primary" variant="tonal" class="me-4">總計 ${{ d.total_amount }}</v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th class="text-left">訂購人</th>
                    <th class="text-left">品項</th>
                    <th class="text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in d.users" :key="u.user_id">
                    <td class="text-no-wrap py-2">
                      <v-icon size="14" class="me-1" color="grey">mdi-account</v-icon>
                      {{ u.user_id }}<span v-if="u.user_name" class="text-medium-emphasis ms-1">{{ u.user_name }}</span>
                    </td>
                    <td class="py-2">
                      <span v-for="(it, i) in u.items" :key="i">
                        {{ it.item_name }} <strong>×{{ it.quantity }}</strong>
                        <span v-if="i < u.items.length - 1" class="mx-1 text-medium-emphasis">·</span>
                      </span>
                    </td>
                    <td class="text-right text-primary font-weight-medium py-2">${{ u.user_amount }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="bg-blue-grey-lighten-5">
                    <td class="font-weight-bold text-caption text-medium-emphasis" colspan="2">
                      品項小計：
                      <span v-for="(t, i) in d.item_totals" :key="i">
                        {{ t.item_name }} <strong class="text-primary">×{{ t.quantity }}</strong>
                        <span v-if="i < d.item_totals.length - 1" class="mx-1">·</span>
                      </span>
                    </td>
                    <td class="text-right font-weight-bold text-primary">${{ d.total_amount }}</td>
                  </tr>
                </tfoot>
              </v-table>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-tabs-window-item>

      <!-- ======== 加班便當匯總 ======== -->
      <v-tabs-window-item value="overtime">
        <div class="d-flex flex-wrap align-center gap-3 mb-4">
          <span class="text-body-2 text-medium-emphasis text-no-wrap">開始日期</span>
          <v-text-field v-model="otFrom" type="date" density="compact" variant="outlined" hide-details :max="otTo || todayStr" style="width:150px" />
          <span class="text-medium-emphasis">～</span>
          <span class="text-body-2 text-medium-emphasis text-no-wrap">結束日期</span>
          <v-text-field v-model="otTo" type="date" density="compact" variant="outlined" hide-details :min="otFrom" :max="todayStr" style="width:150px" />
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-magnify" :loading="otLoading" :disabled="!!otRangeError" @click="fetchOvertimeSummary">查詢</v-btn>
          <v-chip v-if="otRangeError" color="error" variant="tonal" size="small">{{ otRangeError }}</v-chip>
          <v-spacer />
          <v-btn color="success" variant="tonal" prepend-icon="mdi-microsoft-excel" :loading="exporting === 'excel'" :disabled="!otSearched || otData.length === 0" @click="exportData('excel')">匯出 Excel</v-btn>
          <v-btn color="error" variant="tonal" prepend-icon="mdi-file-pdf-box" :loading="exporting === 'pdf'" :disabled="!otSearched || otData.length === 0" @click="exportData('pdf')">匯出 PDF</v-btn>
          <v-divider vertical class="mx-1" style="height:28px" />
          <span class="text-body-2 text-medium-emphasis">區間總計</span>
          <v-chip color="primary" size="large" class="font-weight-bold">${{ otGrandTotal }}</v-chip>
        </div>

        <div v-if="otLoading" class="text-center py-10"><v-progress-circular indeterminate color="primary" /></div>
        <v-alert v-else-if="!otSearched" type="info" variant="tonal" icon="mdi-information">
          請選擇日期區間後點擊查詢（最短一日，最長 31 天）
        </v-alert>
        <v-alert v-else-if="otData.length === 0" type="info" variant="tonal" icon="mdi-information">
          所選區間尚無加班便當記錄
        </v-alert>
        <v-expansion-panels v-else variant="accordion" multiple>
          <v-expansion-panel v-for="d in otData" :key="d.dept_name">
            <v-expansion-panel-title>
              <div class="d-flex align-center gap-3 w-100">
                <v-icon color="orange">mdi-office-building</v-icon>
                <span class="font-weight-bold text-body-1">{{ d.dept_name }}</span>
                <v-chip size="small" color="orange" variant="tonal">{{ d.orders.length }} 筆</v-chip>
                <v-spacer />
                <v-chip color="primary" variant="tonal" class="me-4">總計 ${{ d.total_amount }}</v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- 每筆加班便當訂單 -->
              <v-card
                v-for="order in d.orders"
                :key="order.order_id"
                variant="outlined"
                class="mb-3 pa-3"
              >
                <!-- 加班者名單 -->
                <div class="d-flex flex-wrap align-center gap-2 mb-2">
                  <span class="text-caption text-medium-emphasis text-no-wrap">加班者：</span>
                  <v-chip
                    v-for="w in order.overtime_workers"
                    :key="w.id"
                    size="x-small"
                    color="secondary"
                    variant="tonal"
                  >
                    <v-icon start size="12">mdi-account</v-icon>
                    {{ w.id }} {{ w.name }}
                  </v-chip>
                  <span v-if="!order.overtime_workers.length" class="text-caption text-medium-emphasis">（未指定）</span>
                </div>

                <!-- 便當品項 -->
                <div class="d-flex flex-wrap align-center gap-1 mb-2">
                  <span class="text-caption text-medium-emphasis text-no-wrap">便當：</span>
                  <span v-for="(it, i) in order.items" :key="i">
                    {{ it.item_name }} <strong>×{{ it.quantity }}</strong>
                    <span v-if="i < order.items.length - 1" class="mx-1 text-medium-emphasis">·</span>
                  </span>
                </div>

                <!-- 訂購者 + 金額 -->
                <div class="d-flex align-center justify-space-between">
                  <span class="text-caption text-medium-emphasis">
                    訂購者：
                    <strong>{{ order.created_by }}</strong>
                    <span v-if="order.created_by_name" class="ms-1">{{ order.created_by_name }}</span>
                  </span>
                  <v-chip size="small" color="primary" variant="tonal">${{ order.order_amount }}</v-chip>
                </div>
              </v-card>

              <!-- 品項小計 -->
              <div class="d-flex flex-wrap align-center gap-1 pt-1 pb-1 bg-blue-grey-lighten-5 px-3 rounded">
                <span class="text-caption font-weight-bold text-medium-emphasis">品項小計：</span>
                <span v-for="(t, i) in d.item_totals" :key="i">
                  {{ t.item_name }} <strong class="text-primary">×{{ t.quantity }}</strong>
                  <span v-if="i < d.item_totals.length - 1" class="mx-1">·</span>
                </span>
                <v-spacer />
                <strong class="text-primary">${{ d.total_amount }}</strong>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-tabs-window-item>

    </v-tabs-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/utils/api';

// ── 共用 ──────────────────────────────────────────────
const activeTab = ref('daily');
const exporting = ref('');

const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── 每日彙總 ──────────────────────────────────────────
const dailyData = ref([]);
const dailyLoading = ref(false);
const datePicker = ref(false);
const mealType = ref('all');

const todayStr = localDateStr();
const selectedDate = ref(todayStr);

const pickerModel = computed(() => new Date(selectedDate.value + 'T00:00:00'));
const maxPickerDate = new Date(todayStr + 'T23:59:59');

const selectedDateLabel = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00');
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
});

const mealTypeLabel = computed(() => {
  if (mealType.value === 'lunch') return '（午餐）';
  if (mealType.value === 'dinner') return '（晚餐）';
  return '';
});

const dailyGrandTotal = computed(() =>
  dailyData.value.reduce((s, v) => s + Number(v.total_amount), 0)
);

const vendorItemTotals = (vendor) => {
  const map = {};
  for (const u of vendor.users) {
    for (const item of u.items) {
      map[item.item_name] = (map[item.item_name] || 0) + item.quantity;
    }
  }
  return Object.entries(map).map(([item_name, quantity]) => ({ item_name, quantity }));
};

const fetchDaily = async () => {
  dailyLoading.value = true;
  try {
    const params = { date: selectedDate.value };
    if (mealType.value !== 'all') params.mealType = mealType.value;
    const res = await api.get('/bento/summary/daily', { params });
    dailyData.value = res.data;
  } catch {
    alert('獲取每日彙總失敗');
  } finally {
    dailyLoading.value = false;
  }
};

const onDatePick = (val) => {
  const d = val instanceof Date ? val : new Date(val);
  selectedDate.value = localDateStr(d);
  datePicker.value = false;
};

const shiftDay = (delta) => {
  const d = new Date(selectedDate.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const next = localDateStr(d);
  if (next <= todayStr) selectedDate.value = next;
};

const goToday = () => { selectedDate.value = todayStr; };

const exportData = async (type) => {
  exporting.value = type;
  try {
    let body = { type };
    let filename;

    if (activeTab.value === 'monthly') {
      body.mode = 'monthly';
      body.year = selectedYear.value;
      body.month = selectedMonth.value;
      filename = `bento_monthly_${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`;
    } else if (activeTab.value === 'dept') {
      body.mode = 'dept';
      body.date = deptDate.value;
      if (deptMealType.value !== 'all') body.mealType = deptMealType.value;
      filename = `bento_dept_${deptDate.value}`;
    } else if (activeTab.value === 'overtime') {
      body.mode = 'overtime';
      body.from = otFrom.value;
      body.to = otTo.value;
      filename = `bento_overtime_${otFrom.value}_${otTo.value}`;
    } else {
      body.mode = 'daily';
      body.date = selectedDate.value;
      if (mealType.value !== 'all') body.mealType = mealType.value;
      filename = `bento_daily_${selectedDate.value}`;
    }

    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const res = await api.post('/bento/export', body, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    alert('匯出失敗');
  } finally {
    exporting.value = '';
  }
};

// ── 每月匯總 ──────────────────────────────────────────
const monthlyData = ref([]);
const monthlyLoading = ref(false);

const now = new Date();
const nowYear = now.getFullYear();
const nowMonth = now.getMonth() + 1;
const selectedYear = ref(nowYear);
const selectedMonth = ref(nowMonth);

const yearOptions = Array.from({ length: 4 }, (_, i) => nowYear - 2 + i);
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` }));


const monthlyGrandTotal = computed(() =>
  monthlyData.value.reduce((s, r) => s + Number(r.total_amount), 0)
);

const fetchMonthly = async () => {
  monthlyLoading.value = true;
  try {
    const res = await api.get('/bento/summary/monthly', {
      params: { year: selectedYear.value, month: selectedMonth.value }
    });
    monthlyData.value = res.data;
  } catch {
    alert('獲取每月匯總失敗');
  } finally {
    monthlyLoading.value = false;
  }
};

const shiftMonth = (delta) => {
  let y = selectedYear.value;
  let m = selectedMonth.value + delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1)  { m = 12; y--; }
  if (y > nowYear || (y === nowYear && m > nowMonth)) return;
  selectedYear.value = y;
  selectedMonth.value = m;
};

const goThisMonth = () => {
  selectedYear.value = nowYear;
  selectedMonth.value = nowMonth;
};

// ── 每日各部門匯總 ──────────────────────────────────────
const deptDate = ref(todayStr);
const deptMealType = ref('all');
const deptData = ref([]);
const deptLoading = ref(false);
const deptDatePicker = ref(false);

const deptPickerModel = computed(() => new Date(deptDate.value + 'T00:00:00'));
const deptMaxDate = new Date(todayStr + 'T23:59:59');
const deptDateLabel = computed(() => {
  const d = new Date(deptDate.value + 'T00:00:00');
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
});
const deptGrandTotal = computed(() => deptData.value.reduce((s, d) => s + Number(d.total_amount), 0));

const fetchDeptSummary = async () => {
  deptLoading.value = true;
  try {
    const params = { date: deptDate.value };
    if (deptMealType.value !== 'all') params.mealType = deptMealType.value;
    deptData.value = (await api.get('/bento/summary/department', { params })).data;
  } catch { alert('查詢失敗'); }
  finally { deptLoading.value = false; }
};

const shiftDeptDay = (delta) => {
  const d = new Date(deptDate.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const next = localDateStr(d);
  if (next <= todayStr) deptDate.value = next;
};
const onDeptDatePick = (val) => {
  deptDate.value = localDateStr(val instanceof Date ? val : new Date(val));
  deptDatePicker.value = false;
};

watch([deptDate, deptMealType], () => { if (activeTab.value === 'dept') fetchDeptSummary(); });

// ── 加班便當匯總 ──────────────────────────────────────
const otFrom = ref(todayStr);
const otTo   = ref(todayStr);
const otData = ref([]);
const otLoading = ref(false);
const otSearched = ref(false);

const otRangeError = computed(() => {
  if (!otFrom.value || !otTo.value) return '請填寫日期';
  const diff = Math.round((new Date(otTo.value) - new Date(otFrom.value)) / 86400000);
  if (diff < 0) return '結束不得早於開始';
  if (diff > 30) return '最長 31 天';
  return '';
});
const otGrandTotal = computed(() => otData.value.reduce((s, d) => s + Number(d.total_amount), 0));

const fetchOvertimeSummary = async () => {
  if (otRangeError.value) return;
  otLoading.value = true;
  try {
    otData.value = (await api.get('/bento/overtime/summary', { params: { from: otFrom.value, to: otTo.value } })).data;
    otSearched.value = true;
  } catch { alert('查詢失敗'); }
  finally { otLoading.value = false; }
};

// ── Watchers ──────────────────────────────────────────
watch([selectedDate, mealType], fetchDaily);
watch([selectedYear, selectedMonth], fetchMonthly);
watch(activeTab, (tab) => {
  if (tab === 'daily' && dailyData.value.length === 0 && !dailyLoading.value) fetchDaily();
  if (tab === 'monthly' && monthlyData.value.length === 0 && !monthlyLoading.value) fetchMonthly();
  if (tab === 'dept' && !deptLoading.value) fetchDeptSummary();
});

onMounted(fetchDaily);
</script>

<style scoped>
.gap-3 { gap: 12px; }
.gap-6 { gap: 24px; }
</style>
