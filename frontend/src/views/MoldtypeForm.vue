<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <v-card>
      <v-card-title class="text-h6">模具種類維護</v-card-title>

      <!-- 工具列 -->
      <v-card-text class="d-flex flex-wrap gap-2">
        <v-btn density="comfortable" @click="onNew">新增</v-btn>
        <v-btn density="comfortable" :disabled="!canSave" @click="onSave">修改</v-btn>
        <v-btn density="comfortable" @click="searchDialog = true">查詢</v-btn>
        <v-btn density="comfortable" color="error" :disabled="!canDelete" @click="onDelete">刪除</v-btn>
        <v-btn density="comfortable" @click="onCopy">複製</v-btn>
        <v-btn density="comfortable" color="success" :disabled="!canApprove" @click="onApprove">核准</v-btn>
        <v-btn density="comfortable" color="warning" :disabled="!canUnapprove" @click="onUnapprove">取消核准</v-btn>
        <v-btn density="comfortable" color="grey" :disabled="!canVoid" @click="onVoid">作廢</v-btn>
      </v-card-text>

      <v-divider />

      <!-- 表單 -->
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.MA001" label="模具種類" :readonly="!isNew" />
          </v-col>

          <v-col cols="12" md="6" class="d-flex align-center">
            <div class="mr-4">組合式模具</div>
            <v-checkbox v-model="ma002Bool" label="是" :true-value="true" :false-value="false" />
          </v-col>

          <v-col cols="12">
            <v-textarea v-model="form.MA003" label="說明" rows="3" auto-grow />
          </v-col>

          <v-col cols="12" md="6">
            <v-select v-model="form.IssueState" :items="stateItems" label="簽核狀態" readonly />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field v-model="form.Creator" label="建立人" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.CreateDate" label="建立日期" readonly />
          </v-col>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" @click="onSave">儲存</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 查詢 Dialog -->
    <v-dialog v-model="searchDialog" max-width="780">
      <v-card>
        <v-card-title>查詢</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="q" label="關鍵字（種類/說明）" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="qState" :items="stateItems" label="狀態(可選)" />
            </v-col>
          </v-row>

          <v-data-table :headers="listHeaders" :items="resultList" height="180" hide-default-header>
            <template v-slot:[`item.pick`]="{ item }">
              <v-btn size="small" @click="pick(item)">選取</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="doSearch">查詢</v-btn>
          <v-btn text @click="searchDialog = false">關閉</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref,computed } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';

const { userId, userName, manager } = useAuth();

/* ===== 小工具：登入者、現在時間字串 ===== */
const currentCreator = computed(() => userId.value || userName.value || 'SYSTEM');
function nowString() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ===== 狀態/資料 ===== */
const form = ref(empty());
const isNew = ref(true);

const searchDialog = ref(false);
const q = ref('');
const qState = ref('');
const resultList = ref([]);

const stateItems = [
  { title: 'N：未確認', value: 'N' },
  { title: 'Y：已確認', value: 'Y' },
  { title: 'V：作廢', value: 'V' }
];

const listHeaders = [
  { text: '選取', value: 'pick', sortable: false, width: 80 },
  { text: '模具種類', value: 'MA001' },
  { text: '組合式', value: 'MA002' },
  { text: '說明', value: 'MA003' },
  { text: '狀態', value: 'IssueState' },
  { text: '建立人', value: 'Creator' },
  { text: '建立日', value: 'CreateDate' }
];

/* MA002 與 checkbox 映射 */
const ma002Bool = computed({
  get: () => form.value.MA002 === 'Y',
  set: (v) => (form.value.MA002 = v ? 'Y' : 'N')
});

/* ===== 權限與狀態：把 manager 納入判斷 ===== */
const isManager    = computed(() => String(manager) === '1');
const canSave      = computed(() => !isNew.value && form.value.IssueState === 'N');                  // 修改(僅 N)
const canDelete    = computed(() => !isNew.value && form.value.IssueState === 'N' && isManager.value);
const canApprove   = computed(() => !isNew.value && form.value.IssueState === 'N' && isManager.value);
const canUnapprove = computed(() => !isNew.value && form.value.IssueState === 'Y' && isManager.value);
const canVoid      = computed(() => !isNew.value && form.value.IssueState !== 'V' && isManager.value);

/* ===== 動作 ===== */
function empty() {
  return {
    MA001: '',
    MA002: 'N',
    MA003: '',
    IssueState: 'N',
    Creator: currentCreator.value,   // 新增時預帶登入者（顯示用）
    CreateDate: nowString()          // 新增時預帶目前時間（顯示用）
  };
}

function onNew() {
  form.value = empty();
  isNew.value = true;
}

async function onSave() {
  try {
    if (isNew.value) {
      // 新增：檢查資料
      const payload = {
        MA001: form.value.MA001,
        MA002: form.value.MA002,
        MA003: form.value.MA003,
        Creator: currentCreator.value
      };
      
      console.log('新增資料:', payload);
      
      // 驗證必要欄位
      if (!payload.MA001 || !payload.MA001.trim()) {
        alert('模具種類不能為空');
        return;
      }
      
      const response = await axios.post('/api/molds', payload);
      console.log('新增回應:', response.data);
      
      isNew.value = false;
      await loadOne(form.value.MA001);
      
      alert('新增成功！');
      
    } else if (canSave.value) {
      // 修改：檢查資料
      const payload = {
        MA002: form.value.MA002,
        MA003: form.value.MA003
      };
      
      console.log('修改資料:', payload);
      console.log('修改ID:', form.value.MA001);
      
      const response = await axios.put(`/api/molds/${form.value.MA001}`, payload);
      console.log('修改回應:', response.data);
      
      await loadOne(form.value.MA001);
      
      alert('修改成功！');
    }
  } catch (error) {
    console.error('onSave 錯誤:', error);
    
    if (error.response) {
      // 後端回傳的錯誤
      console.error('後端錯誤:', error.response.data);
      alert(`操作失敗: ${error.response.data.error || '未知錯誤'}`);
    } else {
      // 網路或其他錯誤
      alert(`操作失敗: ${error.message}`);
    }
  }
}

async function onDelete() {
  if (!canDelete.value) return;
  if (!confirm('確定刪除？')) return;
  await axios.delete(`/api/molds/${form.value.MA001}`);
  onNew();
}

async function onCopy() {
  const newId = prompt('請輸入新模具種類代碼（MA001）');
  if (!newId) return;
  await axios.post(`/api/molds/${form.value.MA001}/copy`, { newId });
  await loadOne(newId);
  isNew.value = false;
}

async function onApprove() {
  if (!canApprove.value) return;
  await axios.post(`/api/molds/${form.value.MA001}/approve`);
  await loadOne(form.value.MA001);
}

async function onUnapprove() {
  if (!canUnapprove.value) return;
  await axios.post(`/api/molds/${form.value.MA001}/unapprove`);
  await loadOne(form.value.MA001);
}

async function onVoid() {
  if (!canVoid.value) return;
  if (!confirm('作廢後不可修改，確定？')) return;
  await axios.post(`/api/molds/${form.value.MA001}/void`);
  await loadOne(form.value.MA001);
}

async function loadOne(id) {
  const { data } = await axios.get(`/api/molds/${id}`);
  form.value = data; // 這裡會把 DB 的 CreateDate 覆蓋回來（伺服器時間）
}

/* ===== 查詢 ===== */
async function doSearch() {
  const { data } = await axios.get('/api/molds', { params: { q: q.value, state: qState.value } });
  resultList.value = data;
}

function pick(item) {
  searchDialog.value = false;
  isNew.value = false;
  form.value = { ...item };
}
</script>
