<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="bento-container" fluid>
    <v-row>
      <v-col cols="12">
        <h1>{{ $t('bento.home') }}</h1>
      </v-col>

      <v-col cols="12" v-if="!isValidTime">
        <v-card elevation="2" class="p-4">
          <v-card-title class="d-flex align-center">{{ $t('bento.todayOrdered') }}
            <v-spacer />
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-history"
              @click="router.push('/bento-all-orders')"
            >
              {{ $t('bento.viewAllRecords') }}
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="todayOrders.length === 0">
              <v-alert type="info" text>
                <v-icon>mdi-information</v-icon>
                {{ $t('bento.todayNoOrder') }}
              </v-alert>
            </div>
            <div v-else>
              <v-row>
                <v-col cols="12" md="6" lg="4" v-for="order in todayOrders" :key="order.id">
                  <v-card outlined class="today-order-card">
                    <v-card-title class="pa-3">
                      <div class="d-flex align-center">
                        <v-icon :color="order.meal_type === 'lunch' ? 'orange' : 'blue'" class="me-2">
                          {{ order.meal_type === 'lunch' ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}
                        </v-icon>
                        <span class="text-h6">{{ order.meal_type === 'lunch' ? $t('bento.lunch') : $t('bento.dinner') }}</span>
                      </div>
                      <v-spacer></v-spacer>
                      <v-chip
                        :color="order.meal_type === 'lunch' ? 'orange' : 'blue'"
                        text-color="white"
                        small
                      >
                        {{ formatDate(order.created_at) }}
                      </v-chip>
                    </v-card-title>
                    <v-card-text class="pa-3">
                      <div class="order-items mb-3">
                        <div v-for="item in parseOrderItems(order.items)" :key="item.id" class="item-row">
                          <div class="d-flex justify-space-between align-center">
                            <span class="item-name">{{ item.name }}</span>
                            <div class="item-details">
                              <span class="quantity">x{{ item.quantity }}</span>
                              <span class="price">${{ item.price }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <v-divider class="my-2"></v-divider>
                      <div class="d-flex justify-space-between align-center">
                        <span class="text-body-2 text-medium-emphasis">{{ $t('bento.totalAmount') }}</span>
                        <span class="text-h6 font-weight-bold primary--text">
                          ${{ calculateOrderTotal(order.items) }}
                        </span>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" v-else>
        <v-card elevation="2" class="p-4">
          <v-card-title>{{ $t('bento.selectMeal') }}</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="submitOrder">
              <v-radio-group v-model="orderData.mealType" row>
                <v-radio
                  v-for="mealType in availableMealTypes"
                  :key="mealType.value"
                  :label="mealType.label"
                  :value="mealType.value"
                />
              </v-radio-group>

              <v-select
                :items="vendors"
                v-model="selectedVendor"
                :label="$t('bento.selectVendor')"
                @update:model-value="onVendorChange"
                dense
                outlined
              />

              <v-row v-if="selectedVendor" class="mt-4">
                <v-col cols="12">
                  <v-subheader>{{ $t('bento.vendorMenu', { vendor: selectedVendor }) }}</v-subheader>
                </v-col>
                <v-col cols="12" md="2" v-for="item in filteredItems" :key="item.id">
                  <v-card class="pa-2" outlined>
                    <div class="d-flex justify-space-between align-center">
                      <div>{{ item.displayName }} - ${{ item.price }}</div>
                      <v-text-field
                        type="number"
                        v-model.number="orderData.items[item.id]"
                        min="0"
                        :label="$t('bento.quantity')"
                        dense
                        hide-details
                        style="width:50%"
                        class="ml-2"
                      />
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <v-row v-if="selectedItemsSummary.length > 0" class="mt-4">
                <v-col cols="12">
                  <div class="text-subtitle-2 mb-1">{{ $t('bento.selectedItems') }}</div>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>{{ $t('bento.vendor') }}</th>
                        <th>{{ $t('bento.item') }}</th>
                        <th>{{ $t('bento.quantity') }}</th>
                        <th>{{ $t('bento.subtotal') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in selectedItemsSummary" :key="row.id">
                        <td>{{ row.vendor }}</td>
                        <td>{{ row.name }}</td>
                        <td>{{ row.quantity }}</td>
                        <td>${{ row.price * row.quantity }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-col>
              </v-row>

              <v-row class="mt-4">
                <v-col cols="12">
                  <div v-if="totalAmount > 0" class="total">
                    <v-chip color="primary" text-color="white">{{ $t('bento.totalAmount') }}：${{ totalAmount }}</v-chip>
                  </div>
                </v-col>
                <v-col cols="12">
                  <v-btn type="submit" :disabled="loading || totalAmount === 0" color="primary">
                    {{ $t('bento.submitOrder') }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>

        <v-card elevation="2" class="p-4 mt-4">
          <v-card-title class="d-flex align-center">
            {{ $t('bento.todayRecords') }}
            <v-spacer />
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-history"
              @click="router.push('/bento-all-orders')"
            >
              {{ $t('bento.viewAllRecords') }}
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="todayOrders.length === 0">
              <v-alert type="info" text>
                <v-icon>mdi-information</v-icon>
                {{ $t('bento.todayNoRecords') }}
              </v-alert>
            </div>
            <div v-else class="order-records">
              <v-row>
                <v-col cols="12" md="6" lg="4" v-for="order in todayOrders" :key="order.id" class="mb-3">
                  <v-card outlined class="order-card" :class="{ 'order-expired': !canEditOrder(order) }">
                    <v-card-title class="pa-3">
                      <div class="d-flex align-center">
                        <v-icon :color="order.meal_type === 'lunch' ? 'orange' : 'blue'" class="me-2">
                          {{ order.meal_type === 'lunch' ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}
                        </v-icon>
                        <span class="text-h6">{{ order.meal_type === 'lunch' ? $t('bento.lunch') : $t('bento.dinner') }}</span>
                        <v-chip v-if="!canEditOrder(order)" color="grey" text-color="white" small class="ms-2">{{ $t('bento.expired') }}</v-chip>
                      </div>
                      <v-spacer></v-spacer>
                      <v-chip
                        :color="order.meal_type === 'lunch' ? 'orange' : 'blue'"
                        text-color="white"
                        small
                      >
                        {{ formatDate(order.created_at) }}
                      </v-chip>
                    </v-card-title>
                    <v-card-text class="pa-3">
                      <div class="order-items mb-3">
                        <div v-for="item in parseOrderItems(order.items)" :key="item.id" class="item-row">
                          <div class="d-flex justify-space-between align-center">
                            <span class="item-name">{{ item.name }}</span>
                            <div class="item-details">
                              <span class="quantity">x{{ item.quantity }}</span>
                              <span class="price">${{ item.price }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <v-divider class="my-2"></v-divider>
                      <div class="d-flex justify-space-between align-center">
                        <span class="text-body-2 text-medium-emphasis">{{ $t('bento.totalAmount') }}</span>
                        <span class="text-h6 font-weight-bold primary--text">
                          ${{ calculateOrderTotal(order.items) }}
                        </span>
                      </div>
                    </v-card-text>
                    <v-card-actions class="pa-3 pt-0">
                      <v-spacer></v-spacer>
                      <v-btn text small color="warning" :disabled="!canEditOrder(order)" @click="editOrder(order)" >
                        <v-icon small class="me-1">mdi-pencil</v-icon> {{ $t('common.edit') }} </v-btn>
                      <v-btn
                        text
                        small
                        color="error"
                        :disabled="!canEditOrder(order)"
                        @click="deleteOrder(order.id)"
                      >
                        <v-icon small class="me-1">mdi-delete</v-icon> {{ $t('common.delete') }} </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>

        <!-- 編輯訂單對話框 -->
        <v-dialog v-model="editDialog" max-width="600px">
          <v-card>
            <v-card-title>{{ $t('bento.editOrder') }}</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="submitEdit">
                <v-alert type="info" dense text>
                  {{ $t('bento.editOrderFor', { meal: editData.mealType === 'lunch' ? $t('bento.lunch') : $t('bento.dinner') }) }}
                </v-alert>

                <v-select
                  :items="vendors"
                  v-model="editData.selectedVendor"
                  :label="$t('bento.selectVendor')"
                  @update:model-value="onEditVendorChange"
                  dense
                  outlined
                />

                <v-row v-if="editData.selectedVendor" class="mt-4">
                  <v-col cols="12">
                    <v-subheader>{{ editData.selectedVendor }} 的餐點</v-subheader>
                  </v-col>
                  <v-col cols="12" md="4" v-for="item in editFilteredItems" :key="item.id">
                    <v-card class="pa-2" outlined>
                      <div class="d-flex justify-space-between align-center">
                        <div>{{ item.displayName }} - ${{ item.price }}</div>
                        <v-text-field
                          type="number"
                          v-model.number="editData.items[item.id]"
                          min="0"
                          :label="$t('bento.quantity')"
                          dense
                          hide-details
                          style="width:100%"
                        />
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <v-row class="mt-4">
                  <v-col cols="12">
                    <div v-if="editTotalAmount > 0" class="total">
                      <v-chip color="primary" text-color="white">總金額：${{ editTotalAmount }}</v-chip>
                    </div>
                  </v-col>
                  <v-col cols="12">
                    <v-btn type="submit" :disabled="editLoading || editTotalAmount === 0" color="primary">
                      {{ $t('bento.updateOrder') }}
                    </v-btn>
                    <v-btn @click="editDialog = false" class="ml-2">{{ $t('common.cancel') }}</v-btn>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/utils/api';
import { globalLang } from '@/composables/useLang';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const { isLoggedIn } = useAuth();
const { t } = useI18n();
const DRAFT_KEY = 'bento_order_draft';

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
};

const draft = loadDraft();

const orderData = ref({
  mealType: draft?.mealType || 'lunch',
  items: draft?.items || {}
});

const orders = ref([]);
const loading = ref(false);
const menuItems = ref([]);
const selectedVendor = ref(draft?.selectedVendor || '');

// 便當時間設定（預設值；mount 後從 API 覆蓋）
const bentoSettings = ref({ lunch_end: '10:30', dinner_start: '13:00', dinner_end: '16:00' });

const toMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };

const fetchBentoSettings = async () => {
  try {
    const res = await api.get('/bento/settings');
    bentoSettings.value = {
      lunch_end: res.data.lunch_end || '10:30',
      dinner_start: res.data.dinner_start || '13:00',
      dinner_end: res.data.dinner_end || '16:00'
    };
  } catch { /* 保留預設值 */ }
};

// 編輯相關變量
const editDialog = ref(false);
const editData = ref({
  mealType: 'lunch',
  items: {},
  selectedVendor: '',
  orderId: null
});
const editLoading = ref(false);

const localizedMenuItems = computed(() =>
  menuItems.value.map(item => ({
    ...item,
    displayName: globalLang.value === 'id' ? (item.item_idname || item.item_name)
               : globalLang.value === 'vi' ? (item.item_viname || item.item_name)
               : item.item_name,
  }))
);

const vendors = computed(() => {
  return [...new Set(localizedMenuItems.value
    .map(item => String(item.vendor_name || '').trim())
    .filter(name => name.length > 0)
  )];
});

const filteredItems = computed(() => {
  return localizedMenuItems.value.filter(item => item.vendor_name === selectedVendor.value);
});

const totalAmount = computed(() => {
  return Object.entries(orderData.value.items)
    .filter(([, qty]) => qty > 0)
    .reduce((total, [id, qty]) => {
      const item = menuItems.value.find(i => String(i.id) === String(id));
      return total + (item ? Number(item.price) * qty : 0);
    }, 0);
});

const parseDateString = (value) => {
  if (value instanceof Date) return value;
  if (!value) return new Date(NaN);
  if (typeof value !== 'string') return new Date(value);

  let normalized = value.trim();

  // 支援 MySQL DATETIME 格式，如 2026-04-08 14:44:00
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) { normalized = normalized.replace(' ', 'T'); }

  // 支援不含時區的 ISO 格式，視為本地時間
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) { return new Date(normalized); }

  return new Date(normalized);
};

// 獲取當天訂單
const todayOrders = computed(() => {
  const todayString = new Date().toDateString();
  return orders.value.filter(order => {
    const orderDate = parseDateString(order.created_at);
    return orderDate.toDateString() === todayString;
  });
});

// 編輯相關計算屬性
const editFilteredItems = computed(() => { return localizedMenuItems.value.filter(item => item.vendor_name === editData.value.selectedVendor); });

const editTotalAmount = computed(() => {
  return Object.entries(editData.value.items)
    .filter(([, qty]) => qty > 0)
    .reduce((total, [id, qty]) => {
      const item = menuItems.value.find(i => String(i.id) === String(id));
      return total + (item ? Number(item.price) * qty : 0);
    }, 0);
});

const isValidTime = computed(() => {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const s = bentoSettings.value;
  return nowMin <= toMin(s.lunch_end) ||
    (nowMin >= toMin(s.dinner_start) && nowMin < toMin(s.dinner_end));
});

// 根據當前時間決定可訂購的餐點類型
const availableMealTypes = computed(() => {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const s = bentoSettings.value;
  const types = [];
  if (nowMin <= toMin(s.lunch_end)) types.push({ label: t('bento.lunch'), value: 'lunch' });
  if (nowMin >= toMin(s.dinner_start) && nowMin < toMin(s.dinner_end)) types.push({ label: t('bento.dinner'), value: 'dinner' });
  return types;
});

// 所有已選品項（跨店家彙整）
const selectedItemsSummary = computed(() => {
  return Object.entries(orderData.value.items)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = localizedMenuItems.value.find(i => String(i.id) === String(id));
      if (!item) return null;
      return { id, name: item.displayName, vendor: item.vendor_name, price: Number(item.price), quantity: qty };
    })
    .filter(Boolean);
});

const saveDraft = () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    mealType: orderData.value.mealType,
    items: orderData.value.items,
    selectedVendor: selectedVendor.value
  }));
};

const clearDraft = () => { localStorage.removeItem(DRAFT_KEY); };

const onVendorChange = () => { /* 切換店家不清除其他店家已選品項 */ };

const onEditVendorChange = () => { editData.value.items = {}; };  // 清空編輯時的選擇

const submitOrder = async () => {
  if (!isValidTime.value) return;

  const items = Object.entries(orderData.value.items)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = menuItems.value.find(i => String(i.id) === String(id));
      return item ? { id, name: item.item_name, price: Number(item.price), vendor: item.vendor_name, quantity: qty } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    alert(t('bento.selectFoodFirst'));
    return;
  }

  loading.value = true;
  try {
    await api.post('/bento/order', {
      mealType: orderData.value.mealType,
      items
    });

    alert(t('bento.orderSuccess'));
    fetchOrders();
    clearDraft();
    selectedVendor.value = '';
    orderData.value.items = {};
  } catch (err) {
    console.error('submitOrder error', err);
    alert(t('bento.orderFailed', { error: err.response?.data?.error }));
  } finally {
    loading.value = false;
  }
};

const submitEdit = async () => {
  // 找到對應的訂單進行時間檢查
  const order = orders.value.find(o => o.id === editData.value.orderId);
  if (!order) {
    alert(t('bento.orderNotFound'));
    return;
  }

  if (!canEditOrder(order)) {
    alert(t('bento.editTimeExpired'));
    editDialog.value = false;
    return;
  }

  const items = Object.entries(editData.value.items)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = menuItems.value.find(i => String(i.id) === String(id));
      return item ? { id, name: item.item_name, price: Number(item.price), vendor: item.vendor_name, quantity: qty } : null;
    })
    .filter(Boolean);

  if (items.length === 0) {
    alert(t('bento.selectFoodFirst'));
    return;
  }

  editLoading.value = true;
  try {
    await api.put(`/bento/order/${editData.value.orderId}`, {
      mealType: editData.value.mealType,
      items
    });

    alert(t('bento.updateSuccess'));
    editDialog.value = false;
    fetchOrders();
  } catch (err) {
    console.error('更新訂單失敗', err);
    alert(t('bento.updateFailed', { error: err.response?.data?.error }));
  } finally {
    editLoading.value = false;
  }
};

const fetchMenu = async () => {
  try {
    console.log('Fetching menu...');
    const res = await api.get('/bento/menu');
    console.log('Menu data:', res.data);
    menuItems.value = res.data.map(item => ({
      ...item,
      vendor_name: String(item.vendor_name || '').trim()
    }));
  } catch (err) {
    console.error('獲取菜單失敗', err);
  }
};

const fetchOrders = async () => {
  try {
    const res = await api.get('/bento/orders');
    orders.value = res.data;
  } catch (err) {
    console.error('獲取訂單失敗', err);
  }
};

const editOrder = (order) => {
  if (!canEditOrder(order)) {
    alert(t('bento.editTimeExpired'));
    return;
  }

  // 設置編輯數據
  editData.value.mealType = order.meal_type;
  editData.value.orderId = order.id;

  // 將訂單明細陣列轉換為 {menu_item_id: quantity} 物件
  let items = {};
  const orderItems = Array.isArray(order.items) ? order.items : [];
  orderItems.forEach(item => {
    items[item.id] = item.quantity;
  });

  editData.value.items = { ...items };

  // 設置店家，如果所有項目來自同一家店家
  const vendorsInOrder = new Set();
  Object.keys(items).forEach(id => {
    const item = menuItems.value.find(i => String(i.id) === String(id));
    if (item) {
      vendorsInOrder.add(item.vendor_name);
    }
  });
  editData.value.selectedVendor = vendorsInOrder.size === 1 ? [...vendorsInOrder][0] : '';

  editDialog.value = true;
};

const deleteOrder = async (id) => {
  // 找到對應的訂單
  const order = orders.value.find(o => o.id === id);
  if (!order) {
    alert('找不到訂單');
    return;
  }

  if (!canEditOrder(order)) {
    alert(t('bento.deleteTimeExpired'));
    return;
  }

  if (!confirm(t('bento.deleteConfirm'))) return;
  try {
    await api.delete(`/bento/order/${id}`);
    alert(t('bento.deleteSuccess'));
    fetchOrders();
  } catch (err) {
    console.error('刪除訂單失敗', err);
    alert(t('bento.deleteFailed'));
  }
};

// 格式化日期顯示
const formatDate = (dateString) => {
  const date = parseDateString(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const orderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - orderDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) { return '今天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }); } 
  else if (diffDays === 1) { return '昨天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }); } 
  else if (diffDays > 1 && diffDays < 7) { return `${diffDays}天前`; }

  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) +
    ' ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
};

// 解析訂單項目
const parseOrderItems = (items) => {
  if (typeof items === 'string') {
    try { return JSON.parse(items); } 
    catch (e) {
      console.error('解析訂單項目失敗', e);
      return [];
    }
  }
  return Array.isArray(items) ? items : [];
};

// 計算訂單總金額
const calculateOrderTotal = (items) => {
  const parsedItems = parseOrderItems(items);
  return parsedItems.reduce((total, item) => {
    return total + (Number(item.price) * Number(item.quantity));
  }, 0);
};

// 檢查訂單是否可以編輯/刪除
const canEditOrder = (order) => {
  const orderDate = parseDateString(order.created_at);
  const now = new Date();

  if (Number.isNaN(orderDate.getTime())) return false;
  if (orderDate.toDateString() !== now.toDateString()) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const s = bentoSettings.value;

  if (order.meal_type === 'lunch') return nowMin <= toMin(s.lunch_end);
  if (order.meal_type === 'dinner') return nowMin >= toMin(s.dinner_start) && nowMin < toMin(s.dinner_end);
  return false;
};

onMounted(() => {
  fetchBentoSettings();
  fetchMenu();
  if (isLoggedIn.value) { fetchOrders(); }
});

// 監聽可用餐點類型變化，自動設置默認值
watch(availableMealTypes, (newTypes) => {
  if (newTypes.length > 0 && !newTypes.some(type => type.value === orderData.value.mealType)) { orderData.value.mealType = newTypes[0].value; }
}, { immediate: true });

// 自動儲存訂購草稿
watch([orderData, selectedVendor], saveDraft, { deep: true });
</script>

<style scoped>
.bento-container {
  max-width: 100%;
}

.total {
  margin-top: 10px;
}

.v-card { margin-bottom: 16px; }

.order {
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.order-records {
  max-height: 600px;
  overflow-y: auto;
}

.order-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.order-expired {
  opacity: 0.7;
  border-color: #bdbdbd !important;
}

.order-expired:hover {
  transform: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.order-items {
  max-height: 120px;
  overflow-y: auto;
}

.item-row {
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
}

.item-row:last-child { border-bottom: none; }

.item-name {
  font-weight: 500;
  color: #424242;
  flex: 1;
}

.item-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity {
  color: #666;
  font-size: 0.875rem;
}

.price {
  color: #1976d2;
  font-weight: 500;
  font-size: 0.875rem;
}

.order-card .v-card-actions { padding-top: 8px; }

.today-order-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  border-color: #4caf50 !important;
}

.today-order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}
</style>