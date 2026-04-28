<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container fluid>
    <!-- 無權限 -->
    <v-alert v-if="!loading && !hasPermission" type="error" variant="tonal" class="mt-4">
      {{ $t('bento.overtimeNoPermission') }}
    </v-alert>

    <template v-else-if="hasPermission">
      <div class="d-flex align-center mb-5 gap-3">
        <v-icon color="primary" size="28">mdi-food-takeout-box</v-icon>
        <span class="text-h6 font-weight-bold">{{ $t('bento.overtime') }}</span>
        <v-chip size="small" color="secondary" variant="tonal">
          <v-icon start size="14">mdi-calendar</v-icon>
          {{ todayStr }}
        </v-chip>
        <!-- 目前餐別顯示（依時間自動決定） -->
        <v-chip
          v-if="currentMealType"
          size="small"
          :color="currentMealType === 'lunch' ? 'orange' : 'blue'"
          variant="tonal"
        >
          <v-icon start size="14">{{ currentMealType === 'lunch' ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}</v-icon>
          {{ $t(currentMealType === 'lunch' ? 'bento.lunch' : 'bento.dinner') }}
        </v-chip>
      </div>

      <!-- 時間限制警告 -->
      <v-alert
        v-if="settingsLoaded && !currentMealType"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ $t('bento.orderTimeExpired') }}
      </v-alert>

      <!-- ── 訂購明細 ── -->
      <v-card class="mb-4" elevation="1">
        <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">
          <v-icon start color="orange">mdi-silverware-fork-knife</v-icon>
          {{ $t('bento.overtimeDetails') }}
        </v-card-title>
        <v-card-text class="pa-4 pt-2">
          <v-row
            v-for="(row, i) in orderRows"
            :key="i"
            align="start"
            class="mb-3 row-divider"
            dense
          >
            <!-- ① 人員類型 + 人員輸入（同一行） -->
            <v-col cols="12" sm="3">
              <div class="d-flex align-center gap-2">
                <v-btn-toggle
                  v-model="row.personType"
                  mandatory
                  density="compact"
                  variant="outlined"
                  color="primary"
                  class="flex-shrink-0"
                  @update:model-value="onPersonTypeChange(row)"
                >
                  <v-btn value="worker" size="small">{{ $t('bento.personWorker') }}</v-btn>
                  <v-btn value="guest"  size="small">{{ $t('bento.personGuest') }}</v-btn>
                  <v-btn value="vendor" size="small">{{ $t('bento.personVendor') }}</v-btn>
                </v-btn-toggle>

                <div style="width: 300px; min-width: 0; flex-shrink: 1">
                  <!-- 加班者搜尋 -->
                  <v-autocomplete
                    v-if="row.personType === 'worker'"
                    v-model="row._personModel"
                    :search="row._personSearch"
                    :items="row._personSuggestions"
                    item-title="label"
                    :label="$t('bento.searchEmployee')"
                    density="compact"
                    variant="outlined"
                    no-filter
                    return-object
                    clearable
                    :loading="row._personLoading"
                    :error="!!row.itemName && !row.personId"
                    hide-details="auto"
                    @update:search="q => handlePersonSearch(row, q, 'employee')"
                    @update:model-value="p => onPersonSelect(row, p)"
                  />

                  <!-- 廠商搜尋 -->
                  <v-autocomplete
                    v-else-if="row.personType === 'vendor'"
                    v-model="row._personModel"
                    :search="row._personSearch"
                    :items="row._personSuggestions"
                    item-title="label"
                    :label="$t('bento.searchVendorRep')"
                    density="compact"
                    variant="outlined"
                    no-filter
                    return-object
                    clearable
                    :loading="row._personLoading"
                    :error="!!row.itemName && !row.personId"
                    hide-details="auto"
                    @update:search="q => handlePersonSearch(row, q, 'vendor')"
                    @update:model-value="p => onPersonSelect(row, p)"
                  />

                  <!-- 客人：人數輸入 -->
                  <v-text-field
                    v-else
                    v-model.number="row.guestCount"
                    type="number"
                    min="1"
                    :label="$t('bento.guestCount')"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </div>
              </div>
            </v-col>

            <!-- ② 店家 -->
            <v-col cols="12" sm="2">
              <v-select
                v-model="row.vendorName"
                :items="vendors"
                :label="$t('bento.vendor')"
                density="compact"
                variant="outlined"
                hide-details
                @update:model-value="() => { row.itemName = ''; row.price = 0; }"
              />
            </v-col>

            <!-- ③ 品項 -->
            <v-col cols="12" sm="3">
              <v-select
                v-model="row.itemName"
                :items="itemsFor(row.vendorName)"
                item-title="displayName"
                item-value="item_name"
                :label="$t('bento.item')"
                density="compact"
                variant="outlined"
                hide-details
                :disabled="!row.vendorName"
                @update:model-value="val => setPrice(row, val)"
              />
            </v-col>

            <!-- ④ 數量 + 小計 + 刪除 -->
            <v-col cols="12" sm="3" class="d-flex align-start gap-2">
              <v-text-field
                v-model.number="row.quantity"
                type="number"
                :min="row.personType === 'worker' && row.quantityBy3 ? 3 : 1"
                :step="row.personType === 'worker' && row.quantityBy3 ? 3 : 1"
                :label="$t('bento.quantity')"
                density="compact"
                variant="outlined"
                style="max-width: 90px"
                :error-messages="row.personType === 'worker' && row.quantityBy3 && row.quantity > 0 && row.quantity % 3 !== 0
                  ? [$t('bento.quantityMustBeMultipleOf3')] : []"
                hide-details="auto"
              />
              <div class="d-flex align-center flex-1-1 justify-end gap-2 mt-1">
                <span class="text-primary font-weight-medium text-body-2 text-no-wrap">
                  ${{ row.price * (row.quantity || 0) }}
                </span>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  color="error"
                  density="compact"
                  size="small"
                  :disabled="orderRows.length === 1"
                  @click="removeRow(i)"
                />
              </div>
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
            {{ $t('bento.addRow') }}
          </v-btn>
        </v-card-text>

        <!-- 合計列 -->
        <v-divider />
        <div class="d-flex justify-end align-center pa-4 gap-4">
          <span class="text-body-2 text-medium-emphasis">{{ $t('bento.grandTotal') }}</span>
          <v-chip color="primary" size="large" class="font-weight-bold">${{ grandTotal }}</v-chip>
        </div>
      </v-card>

      <!-- ── 備註 ── -->
      <v-card class="mb-5" elevation="1">
        <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">
          <v-icon start color="grey">mdi-note-text</v-icon>{{ $t('bento.remark') }}
        </v-card-title>
        <v-card-text class="pa-4 pt-2">
          <v-textarea
            v-model="remark"
            variant="outlined"
            rows="3"
            hide-details
            :placeholder="$t('bento.remarkPlaceholder')"
          />
        </v-card-text>
      </v-card>

      <!-- ── 提交 ── -->
      <div class="d-flex justify-end gap-3">
        <v-btn variant="text" @click="resetForm">{{ $t('bento.clear') }}</v-btn>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-send"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submitOrder"
        >
          {{ $t('bento.submitOvertimeOrder') }}
        </v-btn>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/utils/api';
import { globalLang } from '@/composables/useLang';

const { t } = useI18n();

const loading        = ref(true);
const hasPermission  = ref(false);
const menuItems      = ref([]);
const submitting     = ref(false);
const settingsLoaded = ref(false);
const settings       = ref({});

const todayStr = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();

// ── 菜單（多語系） ─────────────────────────────────────
const localizedMenuItems = computed(() =>
  menuItems.value.map(item => ({
    ...item,
    displayName: globalLang.value === 'id' ? (item.item_idname || item.item_name)
               : globalLang.value === 'vi' ? (item.item_viname || item.item_name)
               : item.item_name,
  }))
);

const vendors  = computed(() => [...new Set(localizedMenuItems.value.map(i => i.vendor_name))]);
const itemsFor = (vendorName) => localizedMenuItems.value.filter(i => i.vendor_name === vendorName);

const setPrice = (row, itemName) => {
  const found = menuItems.value.find(i => i.item_name === itemName && i.vendor_name === row.vendorName);
  row.price       = found ? Number(found.price) : 0;
  row.quantityBy3 = found ? !!found.quantity_by_3 : false;
};

// ── 依當前時間自動決定餐別（null = 不在訂購窗口） ───────
const currentMealType = computed(() => {
  const s = settings.value;
  if (!s.lunch_end) return null; // 設定尚未載入
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = fmt.format(new Date()).split(':').map(Number);
  const now   = h * 60 + m;
  const toMin = ts => { const [hh, mm] = (ts || '00:00').split(':').map(Number); return hh * 60 + mm; };
  if (now <= toMin(s.lunch_end)) return 'lunch';
  if (now >= toMin(s.dinner_start || '13:00') && now < toMin(s.dinner_end || '16:00')) return 'dinner';
  return null;
});

// ── 每列資料 ──────────────────────────────────────────
const makeRow = () => ({
  personType:  'worker',  // 'worker' | 'guest' | 'vendor'
  personId:    '',
  personName:  '',
  guestCount:  1,
  _personModel:       null,
  _personSearch:      '',
  _personSuggestions: [],
  _personLoading:     false,
  vendorName:  '',
  itemName:    '',
  price:       0,
  quantity:    1,
  quantityBy3: false,     // 由所選品項的 quantity_by_3 決定
});

const orderRows = ref([makeRow()]);
const addRow    = () => orderRows.value.push(makeRow());
const removeRow = (i) => orderRows.value.splice(i, 1);

const grandTotal = computed(() =>
  orderRows.value.reduce((s, r) => s + r.price * (r.quantity || 0), 0)
);

// ── 人員類型切換 ──────────────────────────────────────
const onPersonTypeChange = (row) => {
  row.personId        = '';
  row.personName      = '';
  row._personModel    = null;
  row._personSearch   = '';
  row._personSuggestions = [];
  row.guestCount      = 1;
  row.quantity    = 1;
  row.quantityBy3 = false;
};

// ── 人員搜尋（WeakMap 以 row 物件為 key 儲存 debounce timer） ──
const searchTimers = new WeakMap();

// 中文字元 → 搜尋名稱；英文/數字 → 搜尋編號
const detectSearchBy = (q) => /[一-鿿㐀-䶿]/.test(q) ? 'name' : 'id';

const handlePersonSearch = (row, q, type) => {
  const upper = q ? q.toUpperCase() : q;
  row._personSearch = upper;
  onPersonSearch(row, upper, type);
};

const onPersonSearch = (row, q, type) => {
  q = (q || '').trim();
  if (searchTimers.has(row)) clearTimeout(searchTimers.get(row));
  if (!q || q.length < 2) { row._personSuggestions = []; return; }

  const by = detectSearchBy(q);

  searchTimers.set(row, setTimeout(async () => {
    row._personLoading = true;
    try {
      const endpoint = type === 'employee' ? '/bento/employee/search' : '/bento/vendor/search';
      const { data } = await api.get(endpoint, { params: { q, by } }).catch(() => ({ data: [] }));
      row._personSuggestions = data.map(e => ({ id: e.id, name: e.name, label: `${e.id}　${e.name}` }));
    } finally {
      row._personLoading = false;
    }
  }, 200));
};

const onPersonSelect = (row, person) => {
  if (person) {
    row.personId   = person.id;
    row.personName = person.name;
  } else {
    // clearable × 點擊
    row.personId          = '';
    row.personName        = '';
    row._personSuggestions = [];
  }
};

// ── 備註 ──────────────────────────────────────────────
const remark = ref('');

// ── 驗證 ──────────────────────────────────────────────
const canSubmit = computed(() => {
  if (!currentMealType.value) return false; // 不在訂購時間內
  const valid = orderRows.value.filter(r => r.itemName && r.quantity > 0);
  if (!valid.length) return false;
  return valid.every(r => {
    if (r.personType === 'worker') return !!r.personId && (!r.quantityBy3 || r.quantity % 3 === 0);
    if (r.personType === 'vendor') return !!r.personId;                          // 必選廠商
    return true; // guest 只需人數
  });
});

// ── 送出 ──────────────────────────────────────────────
const submitOrder = async () => {
  const items = orderRows.value
    .filter(r => r.itemName && r.quantity > 0)
    .map(r => ({
      mealType:   currentMealType.value, // 依當前時間自動決定
      personType: r.personType,
      personId:   r.personId,
      personName: r.personName,
      guestCount: r.personType === 'guest' ? (r.guestCount || 1) : 0,
      vendorName: r.vendorName,
      itemName:   r.itemName,
      price:      r.price,
      quantity:   r.quantity,
    }));

  submitting.value = true;
  try {
    await api.post('/bento/overtime/order', { items, remark: remark.value });
    alert(t('bento.overtimeSuccess'));
    resetForm();
  } catch (err) {
    alert(t('bento.overtimeFailed', { error: err.response?.data?.error || err.message }));
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  orderRows.value = [makeRow()];
  remark.value    = '';
};

// ── 初始化 ────────────────────────────────────────────
onMounted(async () => {
  try {
    const permRes    = await api.get('/bento/overtime/permission');
    hasPermission.value = permRes.data.hasPermission;
  } catch {
    hasPermission.value = false;
  } finally {
    loading.value = false;
  }
  try {
    const [menuRes, settingsRes] = await Promise.all([
      api.get('/bento/menu', { params: { overtime: '1' } }),
      api.get('/bento/settings'),
    ]);
    menuItems.value      = menuRes.data;
    settings.value       = settingsRes.data;
    settingsLoaded.value = true;
  } catch { /* 菜單或設定載入失敗不影響權限 */ }
});
</script>

<style scoped>
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }位
.gap-4 { gap: 16px; }
.flex-1-1 { flex: 1 1 0; min-width: 0; }
.row-divider {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 10px;
}
</style>
