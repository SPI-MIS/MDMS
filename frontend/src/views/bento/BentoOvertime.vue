<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid>
    <!-- 無權限 -->
    <v-alert v-if="!loading && !hasPermission" type="error" variant="tonal" class="mt-4">
      您無加班便當訂購權限，請洽管理員申請。
    </v-alert>

    <template v-else-if="hasPermission">
      <div class="d-flex align-center mb-5 gap-3">
        <v-icon color="primary" size="28">mdi-food-takeout-box</v-icon>
        <span class="text-h6 font-weight-bold">加班便當訂購</span>
        <v-chip size="small" color="secondary" variant="tonal">
          <v-icon start size="14">mdi-calendar</v-icon>
          {{ todayStr }}
        </v-chip>
      </div>

      <!-- ── 訂購明細 ── -->
      <v-card class="mb-4" elevation="1">
        <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">
          <v-icon start color="orange">mdi-silverware-fork-knife</v-icon>
          訂購明細
        </v-card-title>
        <v-card-text class="pa-4 pt-2">
          <v-row
            v-for="(row, i) in orderRows"
            :key="i"
            align="center"
            class="mb-1"
            dense
          >
            <!-- 餐別 -->
            <v-col cols="12" sm="2">
              <v-btn-toggle
                v-model="row.mealType"
                mandatory
                density="compact"
                variant="outlined"
                color="primary"
                class="w-100"
              >
                <v-btn value="lunch" size="small">
                  <v-icon size="14" color="orange" class="me-1">mdi-white-balance-sunny</v-icon>午
                </v-btn>
                <v-btn value="dinner" size="small">
                  <v-icon size="14" color="blue" class="me-1">mdi-weather-night</v-icon>晚
                </v-btn>
              </v-btn-toggle>
            </v-col>

            <!-- 店家 -->
            <v-col cols="12" sm="3">
              <v-select
                v-model="row.vendorName"
                :items="vendors"
                label="店家"
                density="compact"
                variant="outlined"
                hide-details
                @update:model-value="row.itemName = ''"
              />
            </v-col>

            <!-- 品項 -->
            <v-col cols="12" sm="3">
              <v-select
                v-model="row.itemName"
                :items="itemsFor(row.vendorName)"
                item-title="item_name"
                item-value="item_name"
                label="品項"
                density="compact"
                variant="outlined"
                hide-details
                :disabled="!row.vendorName"
                @update:model-value="val => setPrice(row, val)"
              />
            </v-col>

            <!-- 數量 -->
            <v-col cols="6" sm="2">
              <v-text-field
                v-model.number="row.quantity"
                type="number"
                min="1"
                label="數量"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>

            <!-- 小計 -->
            <v-col cols="4" sm="1" class="text-right">
              <span class="text-primary font-weight-medium text-body-2">
                ${{ row.price * (row.quantity || 0) }}
              </span>
            </v-col>

            <!-- 刪除 -->
            <v-col cols="2" sm="1" class="text-center">
              <v-btn
                icon="mdi-close"
                variant="text"
                color="error"
                density="compact"
                size="small"
                :disabled="orderRows.length === 1"
                @click="removeRow(i)"
              />
            </v-col>
          </v-row>

          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            class="mt-2"
            @click="addRow"
          >
            新增一筆
          </v-btn>
        </v-card-text>

        <!-- 合計列 -->
        <v-divider />
        <div class="d-flex justify-end align-center pa-4 gap-4">
          <span class="text-body-2 text-medium-emphasis">訂購合計</span>
          <v-chip color="primary" size="large" class="font-weight-bold">${{ grandTotal }}</v-chip>
        </div>
      </v-card>

      <!-- ── 加班人員 ── -->
      <v-card class="mb-4" elevation="1">
        <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">
          <v-icon start color="secondary">mdi-account-group</v-icon>
          加班人員 / 客人(Guest) / 廠商
          <span class="text-caption text-medium-emphasis ms-2">（輸入工號 / Guest / 廠商編號後按 Enter 新增）</span>
        </v-card-title>
        <v-card-text class="pa-4 pt-2">
          <!-- 已新增的人員 chips -->
          <div v-if="overtimeWorkers.length" class="mb-3 d-flex flex-wrap gap-2">
            <v-chip
              v-for="(w, i) in overtimeWorkers"
              :key="w.id"
              closable
              color="secondary"
              variant="tonal"
              @click:close="overtimeWorkers.splice(i, 1)"
            >
              <v-icon start size="14">mdi-account</v-icon>
              {{ w.id }} {{ w.name }}
            </v-chip>
          </div>

          <!-- 工號輸入 -->
          <div class="d-flex gap-2 align-start">
            <v-text-field
              v-model="empInput"
              label="輸入工號 / 廠商代號"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :error-messages="empError"
              style="max-width: 240px; text-transform: uppercase"
              autocapitalize="characters"
              autocorrect="off"
              @keyup.enter="lookupEmployee"
              @input="empInput = empInput.toUpperCase(); empError = ''"
            />
            <v-btn
              variant="tonal"
              color="secondary"
              :loading="empLooking"
              @click="lookupEmployee"
            >
              新增
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- ── 備註 ── -->
      <v-card class="mb-5" elevation="1">
        <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">
          <v-icon start color="grey">mdi-note-text</v-icon>備註
        </v-card-title>
        <v-card-text class="pa-4 pt-2">
          <v-textarea
            v-model="remark"
            variant="outlined"
            rows="3"
            hide-details
            placeholder="如有其他說明請填寫於此"
          />
        </v-card-text>
      </v-card>

      <!-- ── 提交 ── -->
      <div class="d-flex justify-end gap-3">
        <v-btn variant="text" @click="resetForm">清除</v-btn>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-send"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submitOrder"
        >
          送出訂購
        </v-btn>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/api';

// ── 狀態 ──────────────────────────────────────────────
const loading = ref(true);
const hasPermission = ref(false);
const menuItems = ref([]);
const submitting = ref(false);

// ── 日期 ──────────────────────────────────────────────
const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();

// ── 菜單 ──────────────────────────────────────────────
const vendors = computed(() => [...new Set(menuItems.value.map(i => i.vendor_name))]);

const itemsFor = (vendorName) => menuItems.value.filter(i => i.vendor_name === vendorName);

const setPrice = (row, itemName) => {
  const found = menuItems.value.find(i => i.item_name === itemName && i.vendor_name === row.vendorName);
  row.price = found ? Number(found.price) : 0;
};

// ── 訂購明細列 ────────────────────────────────────────
const makeRow = () => ({ mealType: 'lunch', vendorName: '', itemName: '', price: 0, quantity: 1 });
const orderRows = ref([makeRow()]);
const addRow = () => orderRows.value.push(makeRow());
const removeRow = (i) => orderRows.value.splice(i, 1);

const grandTotal = computed(() =>
  orderRows.value.reduce((s, r) => s + r.price * (r.quantity || 0), 0)
);

// ── 加班人員 ──────────────────────────────────────────
const overtimeWorkers = ref([]);
const empInput = ref('');
const empError = ref('');
const empLooking = ref(false);

const lookupEmployee = async () => {
  const q = empInput.value.trim();
  if (!q) return;
  if (overtimeWorkers.value.some(w => w.id === q)) {
    empError.value = '已在清單中';
    return;
  }
  // 輸入 GUEST 直接加入，不查資料庫
  if (q === 'GUEST') {
    overtimeWorkers.value.push({ id: 'GUEST', name: '客人' });
    empInput.value = '';
    return;
  }
  empLooking.value = true;
  empError.value = '';
  try {
    // 同時搜尋員工（CMSMV）與廠商（PURMA）
    const [empRes, vendorRes] = await Promise.all([
      api.get('/bento/employee/search', { params: { q } }).catch(() => ({ data: [] })),
      api.get('/bento/vendor/search',   { params: { q } }).catch(() => ({ data: [] })),
    ]);

    const exactEmp    = empRes.data.find(r => r.id === q);
    const exactVendor = vendorRes.data.find(r => r.id === q);

    if (exactEmp) {
      overtimeWorkers.value.push({ id: exactEmp.id, name: exactEmp.name });
      empInput.value = '';
    } else if (exactVendor) {
      overtimeWorkers.value.push({ id: exactVendor.id, name: exactVendor.name });
      empInput.value = '';
    } else if (empRes.data.length === 1 && vendorRes.data.length === 0) {
      overtimeWorkers.value.push({ id: empRes.data[0].id, name: empRes.data[0].name });
      empInput.value = '';
    } else if (vendorRes.data.length === 1 && empRes.data.length === 0) {
      overtimeWorkers.value.push({ id: vendorRes.data[0].id, name: vendorRes.data[0].name });
      empInput.value = '';
    } else if (empRes.data.length === 0 && vendorRes.data.length === 0) {
      empError.value = `找不到工號或廠商代號「${q}」`;
    } else {
      const total = empRes.data.length + vendorRes.data.length;
      empError.value = `請輸入完整代號（員工 ${empRes.data.length} 筆、廠商 ${vendorRes.data.length} 筆，共 ${total} 筆）`;
    }
  } catch {
    empError.value = '查詢失敗';
  } finally {
    empLooking.value = false;
  }
};

// ── 備註 ──────────────────────────────────────────────
const remark = ref('');

// ── 驗證 ──────────────────────────────────────────────
const canSubmit = computed(() =>
  orderRows.value.some(r => r.itemName && r.quantity > 0)
);

// ── 送出 ──────────────────────────────────────────────
const submitOrder = async () => {
  const items = orderRows.value
    .filter(r => r.itemName && r.quantity > 0)
    .map(r => ({
      mealType: r.mealType,
      vendorName: r.vendorName,
      itemName: r.itemName,
      price: r.price,
      quantity: r.quantity,
    }));

  submitting.value = true;
  try {
    await api.post('/bento/overtime/order', {
      items,
      overtimeWorkers: overtimeWorkers.value,
      remark: remark.value,
    });
    alert('訂購成功！');
    resetForm();
  } catch (err) {
    alert('訂購失敗：' + (err.response?.data?.error || err.message));
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  orderRows.value = [makeRow()];
  overtimeWorkers.value = [];
  remark.value = '';
  empInput.value = '';
  empError.value = '';
};

// ── 初始化 ────────────────────────────────────────────
onMounted(async () => {
  try {
    const [permRes, menuRes] = await Promise.all([
      api.get('/bento/overtime/permission'),
      api.get('/bento/menu'),
    ]);
    hasPermission.value = permRes.data.hasPermission;
    menuItems.value = menuRes.data;
  } catch {
    hasPermission.value = false;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
</style>
