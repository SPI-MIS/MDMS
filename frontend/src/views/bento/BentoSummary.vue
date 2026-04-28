<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid>
    <!-- 頁籤 -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="monthly">
        <v-icon start>mdi-calendar-month</v-icon>每月匯總（個人）
      </v-tab>
      <v-tab value="dept">
        <v-icon start>mdi-office-building</v-icon>每日匯總（個人）
      </v-tab>
      <v-tab value="overtime">
        <v-icon start>mdi-food-takeout-box</v-icon>加班/廠商/客戶匯總
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
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

        <!-- 每月展開面板：組 → 員工 → 訂購細項 -->
        <template v-else>
          <v-expansion-panels variant="accordion" multiple>
            <v-expansion-panel v-for="g in monthlyData" :key="g.group_name">
              <v-expansion-panel-title>
                <div class="d-flex align-center gap-3 w-100">
                  <v-icon color="secondary">mdi-account-group</v-icon>
                  <span class="font-weight-bold text-body-1">{{ g.group_name }}</span>
                  <v-chip size="small" color="secondary" variant="tonal">
                    {{ g.users.length }} 人
                  </v-chip>
                  <v-spacer />
                  <v-chip color="primary" variant="tonal" class="me-4">
                    當月 ${{ g.total_amount }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <!-- 組內每位員工 -->
                <v-expansion-panels variant="accordion" multiple class="mb-1">
                  <v-expansion-panel v-for="u in g.users" :key="u.user_id">
                    <v-expansion-panel-title>
                      <div class="d-flex align-center gap-3 w-100">
                        <v-icon size="16" color="grey">mdi-account</v-icon>
                        <span class="font-weight-medium">{{ u.user_id }}</span>
                        <span v-if="u.user_name" class="text-medium-emphasis text-body-2">{{ u.user_name }}</span>
                        <v-chip size="x-small" color="secondary" variant="tonal">
                          {{ u.order_count }} 次
                        </v-chip>
                        <v-spacer />
                        <v-chip size="small" color="primary" variant="tonal" class="me-2">
                          ${{ u.total_amount }}
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
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- 月度總計 -->
          <v-card elevation="1" class="mt-4 pa-4">
            <div class="d-flex justify-end align-center gap-6">
              <span class="text-body-2 text-medium-emphasis">訂購人數</span>
              <v-chip color="secondary" size="large">{{ monthlyTotalUsers }} 人</v-chip>
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
        <!-- 部門為大分類 -->
        <v-expansion-panels v-else variant="accordion" multiple>
          <v-expansion-panel v-for="dept in otData" :key="dept.dept_name">
            <v-expansion-panel-title>
              <div class="d-flex align-center gap-3 w-100">
                <v-icon color="secondary">mdi-office-building</v-icon>
                <span class="font-weight-bold text-body-1">{{ dept.dept_name }}</span>
                <v-chip size="small" color="secondary" variant="tonal">{{ dept.persons.length }} 人</v-chip>
                <v-spacer />
                <v-chip color="primary" variant="tonal" class="me-4">總計 ${{ dept.total_amount }}</v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text class="pa-0">

              <!-- 人員小節 -->
              <div v-for="person in dept.persons" :key="person.person_id" class="mb-1">
                <div class="d-flex align-center gap-2 px-4 py-1 bg-blue-grey-lighten-5">
                  <v-icon size="14" color="grey">mdi-account</v-icon>
                  <span class="text-body-2 font-weight-medium">
                    {{ person.person_id }}
                    <span v-if="person.person_name" class="text-medium-emphasis ms-1">{{ person.person_name }}</span>
                  </span>
                  <v-spacer />
                  <span class="text-body-2 text-primary font-weight-medium">${{ person.person_amount }}</span>
                </div>

                <!-- 訂購細項 -->
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th class="text-left ps-6" style="width:110px">日期</th>
                      <th class="text-left">品項</th>
                      <th class="text-right" style="width:60px">數量</th>
                      <th class="text-right pe-4" style="width:80px">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(it, i) in person.items" :key="i">
                      <td class="ps-6 text-no-wrap text-caption text-medium-emphasis">{{ it.order_date }}</td>
                      <td>{{ it.item_name }}</td>
                      <td class="text-right">×{{ it.quantity }}</td>
                      <td class="text-right pe-4 text-primary">${{ it.amount }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>

              <v-divider />

              <!-- 品項數量小計 + 金額小計 -->
              <div class="d-flex flex-wrap align-center gap-x-3 gap-y-1 px-4 py-2 bg-orange-lighten-5">
                <span class="text-caption font-weight-medium text-medium-emphasis">品項小計：</span>
                <span v-for="(t, i) in dept.item_totals" :key="i" class="text-caption">
                  {{ t.item_name }}
                  <strong class="text-primary">×{{ t.quantity }}</strong>
                  <span class="text-medium-emphasis ms-1">${{ t.amount }}</span>
                  <span v-if="i < dept.item_totals.length - 1" class="mx-1 text-medium-emphasis">·</span>
                </span>
                <v-spacer />
                <strong class="text-primary">${{ dept.total_amount }}</strong>
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
const activeTab = ref('monthly');
const exporting = ref('');

const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayStr = localDateStr();

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
  monthlyData.value.reduce((s, g) => s + Number(g.total_amount), 0)
);
const monthlyTotalUsers = computed(() =>
  monthlyData.value.reduce((s, g) => s + g.users.length, 0)
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
  } catch (err) { alert('查詢失敗：' + (err.response?.data?.error || err.message)); }
  finally { otLoading.value = false; }
};

// ── Watchers ──────────────────────────────────────────
watch([selectedYear, selectedMonth], fetchMonthly);
watch(activeTab, (tab) => {
  if (tab === 'monthly' && monthlyData.value.length === 0 && !monthlyLoading.value) fetchMonthly();
  if (tab === 'dept' && !deptLoading.value) fetchDeptSummary();
});

onMounted(fetchMonthly);
</script>

<style scoped>
.gap-3 { gap: 12px; }
.gap-6 { gap: 24px; }
</style>
