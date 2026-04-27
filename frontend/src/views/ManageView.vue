<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <v-card>
      <v-tabs v-model="activeTab" color="primary">
        <v-tab value="users">使用者管理</v-tab>
        <v-tab value="time" v-if="isManager">便當時間設定</v-tab>
        <v-tab value="overtime" v-if="isManager">加班便當名單</v-tab>
      </v-tabs>
      <v-divider />

      <v-window v-model="activeTab">
        <!-- 使用者管理 -->
        <v-window-item value="users">
          <ActionButtons
            :isNew="isNew"
            :canDelete="canDelete"
            :canApprove="canApprove"
            :canUnapprove="canUnapprove"
            :canVoid="canVoid"
            @new="onNew"
            @search="searchDialog = true"
            @delete="onDelete"
            @copy="onCopy"
            @approve="onApprove"
            @unapprove="onUnapprove"
            @void="onVoid"
          />
          <v-divider />

          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.SA002" label="姓名" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.SA001" label="帳號 (PK)" :readonly="!isNew" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.SA003" label="密碼" />
              </v-col>
              <v-col cols="12" md="4">
                <v-select v-model="form.SA004" :items="roleItems" label="角色" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.SA005" :items="roleItems" label="信箱" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.SA006" :items="roleItems" label="手機號碼" />
              </v-col>

              <v-col cols="12" class="mt-2">
                <div class="text-subtitle-2 mb-1">權限設定</div>
                <v-row>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permC" :disabled="isManagerRole" label="新增 (C)" />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permR" :disabled="isManagerRole" label="查詢 (R)" />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permU" :disabled="isManagerRole" label="修改 (U)" />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permD" :disabled="isManagerRole" label="刪除(D)" />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permA" :disabled="isManagerRole" label="核准(A)" />
                  </v-col>
                  <v-col cols="6" md="2">
                    <v-checkbox v-model="permCA" :disabled="isManagerRole" label="取消核准(CA)" />
                  </v-col>
                </v-row>
                <div class="text-caption text-medium-emphasis">
                  * 角色選取「管理者」將自動擁有所有權限，且上述勾選會鎖定。
                </div>
              </v-col>

              <v-col cols="12" class="d-flex justify-end">
                <v-btn color="primary" @click="onSave" :disabled="isNew ? !form.SA001 : !canSave">儲存</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-window-item>

        <!-- 加班便當名單 -->
        <v-window-item value="overtime">
          <v-card-text>
            <div class="text-subtitle-1 mb-1">加班便當適用人員名單</div>
            <div class="text-caption text-medium-emphasis mb-4">輸入工號查詢後自動加入待新增清單，確認無誤後統一加入。</div>

            <!-- 輸入列 -->
            <v-row align="center" class="mb-2" dense>
              <v-col cols="12" sm="auto">
                <v-text-field
                  ref="otInputRef"
                  v-model="otInput"
                  label="工號"
                  density="compact"
                  variant="outlined"
                  :hide-details="!otError"
                  :error-messages="otError"
                  style="width:160px"
                  @keyup.enter="lookupOT"
                  @input="otError = ''"
                />
              </v-col>
              <v-col cols="12" sm="auto">
                <v-btn variant="tonal" color="primary" :loading="otLooking" @click="lookupOT">查詢</v-btn>
              </v-col>
            </v-row>

            <!-- 待新增清單 -->
            <template v-if="otPending.length">
              <div class="text-subtitle-2 mb-2 mt-3">
                待新增（{{ otPending.length }} 筆）
                <v-btn variant="text" size="x-small" color="error" class="ms-2" @click="otPending = []">全部清除</v-btn>
              </div>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <v-chip
                  v-for="(p, i) in otPending"
                  :key="p.user_id"
                  closable
                  color="primary"
                  variant="tonal"
                  @click:close="otPending.splice(i, 1)"
                >
                  <v-icon start size="14">mdi-account</v-icon>
                  {{ p.user_id }} {{ p.user_name }}
                </v-chip>
              </div>
              <v-btn
                color="success"
                variant="tonal"
                prepend-icon="mdi-check-all"
                :loading="otAdding"
                @click="commitOT"
              >
                加入名單（{{ otPending.length }} 筆）
              </v-btn>
              <v-divider class="my-4" />
            </template>

            <!-- 已儲存名單表格 -->
            <v-data-table
              :headers="otHeaders"
              :items="otList"
              :loading="otListLoading"
              density="compact"
              items-per-page="50"
              :items-per-page-options="[20, 50, 100]"
              hover
            >
              <template #item="{ item }">
                <tr>
                  <td class="text-no-wrap">{{ item.user_id }}</td>
                  <td>{{ item.user_name }}</td>
                  <td class="text-caption text-medium-emphasis text-no-wrap">
                    {{ item.created_at ? String(item.created_at).slice(0, 10) : '' }}
                  </td>
                  <td>
                    <v-btn
                      icon="mdi-delete-outline"
                      variant="text"
                      color="error"
                      density="compact"
                      size="small"
                      @click="removeOT(item.user_id)"
                    />
                  </td>
                </tr>
              </template>
              <template #no-data>
                <div class="text-center py-6 text-medium-emphasis">尚無名單資料</div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-window-item>

        <!-- 便當時間設定 -->
        <v-window-item value="time">
          <v-card-text>
            <div class="text-subtitle-1 mb-4">便當訂購時間設定</div>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="timeSettings.lunch_end"
                  label="午餐訂購截止時間"
                  type="time"
                  hint="員工可在此時間前訂購午餐"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="timeSettings.dinner_start"
                  label="晚餐訂購開始時間"
                  type="time"
                  hint="員工可開始訂購晚餐的時間"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="timeSettings.dinner_end"
                  label="晚餐訂購截止時間"
                  type="time"
                  hint="員工可在此時間前訂購晚餐"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" class="mt-2">
                <v-alert type="info" variant="tonal" density="compact">
                  目前設定：午餐於 {{ timeSettings.lunch_end }} 前可訂購；
                  晚餐於 {{ timeSettings.dinner_start }} ~ {{ timeSettings.dinner_end }} 可訂購
                </v-alert>
              </v-col>
              <v-col cols="12" class="d-flex justify-end">
                <v-btn color="primary" @click="saveTimeSettings" :loading="timeSaving">儲存設定</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- 查詢 Dialog -->
    <v-dialog v-model="searchDialog" max-width="860">
      <v-card>
        <v-card-title>查詢使用者</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field v-model="q" label="關鍵字（帳號/姓名/角色）" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="qState" :items="stateItems" label="狀態(可選)" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="qRole" :items="roleItems" label="角色(可選)" />
            </v-col>
          </v-row>

          <v-data-table :headers="listHeaders" :items="resultList" item-key="SA001" height="280" fixed-header>
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
import { ref, computed, unref, watch, onMounted } from 'vue'
import axios from 'axios'
import api from '@/utils/api'
import ActionButtons from '@/components/ActionButtons.vue'
import { useAuth } from '@/composables/useAuth';

const { userId, userName, manager } = useAuth();

// 頁籤
const activeTab = ref('users')

// 便當時間設定
const timeSettings = ref({ lunch_end: '10:30', dinner_start: '13:00', dinner_end: '16:00' })
const timeSaving = ref(false)

async function loadTimeSettings() {
  try {
    const { data } = await api.get('/bento/settings')
    timeSettings.value = {
      lunch_end: data.lunch_end || '10:30',
      dinner_start: data.dinner_start || '13:00',
      dinner_end: data.dinner_end || '16:00'
    }
  } catch { /* 載入失敗保留預設值 */ }
}

async function saveTimeSettings() {
  timeSaving.value = true
  try {
    await api.put('/bento/settings', timeSettings.value)
    alert('便當時間設定已更新！')
  } catch (err) {
    alert(`儲存失敗: ${err.response?.data?.error || err.message}`)
  } finally {
    timeSaving.value = false
  }
}

// ── 加班便當名單 ──────────────────────────────────────
const otList = ref([])
const otListLoading = ref(false)
const otInput = ref('')
const otPending = ref([])   // 待新增暫存區
const otError = ref('')
const otLooking = ref(false)
const otAdding = ref(false)
const otInputRef = ref(null)

const otHeaders = [
  { title: '工號',     key: 'user_id',    width: '120px' },
  { title: '姓名',     key: 'user_name'  },
  { title: '新增日期', key: 'created_at', width: '120px' },
  { title: '',         key: 'action',     width: '60px', sortable: false },
]

async function loadOTList() {
  otListLoading.value = true
  try {
    const { data } = await api.get('/bento/overtime/eligible')
    otList.value = data
  } catch { /* ignore */ } finally {
    otListLoading.value = false
  }
}

async function lookupOT() {
  const q = otInput.value.trim()
  if (!q) return
  otError.value = ''
  otLooking.value = true
  try {
    const { data } = await api.get('/bento/employee/search', { params: { q } })
    const exact = data.find(r => r.id === q)
    const found = exact ?? (data.length === 1 ? data[0] : null)
    if (found) {
      const entry = { user_id: found.id, user_name: found.name }
      const alreadySaved = otList.value.some(r => r.user_id === entry.user_id)
      const alreadyPending = otPending.value.some(r => r.user_id === entry.user_id)
      if (alreadySaved) {
        otError.value = `${entry.user_id} 已在名單中`
      } else if (alreadyPending) {
        otError.value = `${entry.user_id} 已在待新增清單中`
      } else {
        otPending.value.push(entry)
        otInput.value = ''
        otInputRef.value?.focus()
      }
    } else if (data.length === 0) {
      otError.value = `找不到工號 ${q}`
    } else {
      otError.value = `請輸入完整工號（符合 ${data.length} 筆）`
    }
  } catch { otError.value = '查詢失敗' } finally { otLooking.value = false }
}

async function commitOT() {
  if (!otPending.value.length) return
  otAdding.value = true
  try {
    for (const p of otPending.value) {
      await api.post('/bento/overtime/eligible', { userId: p.user_id, userName: p.user_name })
    }
    otPending.value = []
    await loadOTList()
  } catch (err) {
    alert('新增失敗：' + (err.response?.data?.error || err.message))
  } finally { otAdding.value = false }
}

async function removeOT(userId) {
  if (!confirm(`確定從名單移除 ${userId}？`)) return
  try {
    await api.delete(`/bento/overtime/eligible/${userId}`)
    await loadOTList()
  } catch (err) {
    alert('移除失敗：' + (err.response?.data?.error || err.message))
  }
}

watch(activeTab, (tab) => {
  if (tab === 'overtime' && otList.value.length === 0) loadOTList()
})

onMounted(() => {
  if (isManager.value) loadTimeSettings()
})

const currentCreator = computed(() => (unref(userId) || unref(userName) || 'SYSTEM'))
function nowString () {
  const d = new Date(); const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const form = ref(empty())
const isNew = ref(true)

const searchDialog = ref(false)
const q = ref('')
const qState = ref('')
const qRole = ref('')
const resultList = ref([])

const roleItems = ['admin', 'manager', 'user']
const stateItems = [
  { title: 'N：未確認', value: 'N' },
  { title: 'Y：已確認', value: 'Y' },
  { title: 'V：作廢', value: 'V' }
]

// Vuetify 3 header: { title, key }
const listHeaders = [
  { title: '選取',    key: 'pick', sortable: false, width: 80 },
  { title: '帳號',    key: 'SA001' },
  { title: '姓名',    key: 'SA002' },
  { title: '密碼',    key: 'SA003' },
  { title: '角色',    key: 'SA004' },
  { title: '信箱',    key: 'SA005' },
  { title: '手機',    key: 'SA006' },
  { title: '狀態',    key: 'IssueState' },
  { title: '建立人',  key: 'Creator' },
  { title: '建立日',  key: 'CreateDate' }
]

// 權限
const isManager = computed(() => String(unref(manager)) === '1')
const isManagerRole = computed(() => form.value.SA004 === 'manager')
const canSave      = computed(() => !isNew.value && form.value.IssueState === 'N')
const canDelete    = computed(() => !isNew.value && form.value.IssueState === 'N' && isManager.value)
const canApprove   = computed(() => !isNew.value && form.value.IssueState === 'N' && isManager.value)
const canUnapprove = computed(() => !isNew.value && form.value.IssueState === 'Y' && isManager.value)
const canVoid      = computed(() => !isNew.value && form.value.IssueState !== 'V' && isManager.value)

// ✅ 五顆 computed，分別對應 C/R/U/D/A
const permC = computed({
  get: () => form.value.SA008 === 'Y',
  set: (v) => { form.value.SA008 = v ? 'Y' : 'N' }
})
const permR = computed({
  get: () => form.value.SA009 === 'Y',
  set: (v) => { form.value.SA009 = v ? 'Y' : 'N' }
})
const permU = computed({
  get: () => form.value.SA0010 === 'Y',
  set: (v) => { form.value.SA0010 = v ? 'Y' : 'N' }
})
const permD = computed({
  get: () => form.value.SA0011 === 'Y',
  set: (v) => { form.value.SA0011 = v ? 'Y' : 'N' }
})
const permA = computed({
  get: () => form.value.SA0012 === 'Y',
  set: (v) => { form.value.SA0012 = v ? 'Y' : 'N' }
})

const permCA = computed({
  get: () => form.value.SA0013 === 'Y',
  set: (v) => { form.value.SA0013 = v ? 'Y' : 'N' }
})

watch(() => form.value.SA004, (role) => {
  if (role === 'manager') {
    Object.assign(form.value, {
      SA008:'Y', SA009:'Y', SA0010:'Y', SA0011:'Y', SA0012:'Y', SA0013:'Y'
    })
  }
  else{
    Object.assign(form.value, {
      SA008:'N', SA009:'Y', SA0010:'N', SA0011:'N', SA0012:'N', SA0013:'N'
    })
  }
}, { immediate: true })

function empty () {
  return {
    SA001: '',
    SA002: '',
    SA003: '',
    SA004: 'user',
    SA005: '',
    SA006: '',
    SA008: 'N', SA009: 'Y', SA0010: 'N', SA0011: 'N', SA0012: 'N', SA0013: 'N', // C/R/U/D/A/CA
    IssueState: 'N',
    Creator: currentCreator.value,
    CreateDate: nowString()
  }
}

function onNew () {
  form.value = empty()
  isNew.value = true
}

async function onSave () {
  try {
    if (isNew.value) {
      const payload = {
        SA001: form.value.SA001,
        SA002: form.value.SA002,
        SA003: form.value.SA003,
        SA004: form.value.SA004,
        SA005: form.value.SA005,
        SA006: form.value.SA006,
        SA008: form.value.SA008,
        SA009: form.value.SA009,
        SA0010: form.value.SA0010,
        SA0011: form.value.SA0011,
        SA0012: form.value.SA0012,
        SA0013: form.value.SA0013,
        Creator: currentCreator.value
      }
      
      if (!payload.SA001 || !payload.SA001.trim()) {
        alert('帳號不可為空')
        return
      }
      // console.log('payload:', payload);
      await axios.post('/api/user', payload)
      isNew.value = false
      await loadOne(form.value.SA001)
      alert('新增成功！')
    } else if (canSave.value) {
      const payload = {
        SA002: form.value.SA002,
        SA003: form.value.SA003,
        SA004: form.value.SA004,
        SA005: form.value.SA005,
        SA006: form.value.SA006,
        SA008: form.value.SA008,
        SA009: form.value.SA009,
        SA0010: form.value.SA0010,
        SA0011: form.value.SA0011,
        SA0012: form.value.SA0012,
        SA0013: form.value.SA0013
      }
      await axios.put(`/api/user/${form.value.SA001}`, payload)
      await loadOne(form.value.SA001)
      alert('修改成功！')
    }
  } catch (err) {
    alert(`操作失敗: ${err.response?.data?.message || err.response?.data?.error || err.message}`)
  }
}

async function onDelete () {
  if (!canDelete.value) return
  if (!confirm('確定刪除？')) return
  await axios.delete(`/api/user/${form.value.SA001}`)
  onNew()
}

async function onCopy () {
  if (isNew.value) return
  const newId = prompt('請輸入新帳號（SA001）')
  if (!newId) return
  // 直接以目前表單內容建立新使用者
  const payload = {
    SA001: newId,
    SA002: form.value.SA002,
    SA003: form.value.SA003,
    SA004: form.value.SA004,
    Creator: currentCreator.value
  }
  await axios.post('/api/user', payload)
  await loadOne(newId)
  isNew.value = false
}

async function onApprove () {
  if (!canApprove.value) return
  await axios.post(`/api/user/${form.value.SA001}/approve`)
  await loadOne(form.value.SA001)
}

async function onUnapprove () {
  if (!canUnapprove.value) return
  await axios.post(`/api/user/${form.value.SA001}/unapprove`)
  await loadOne(form.value.SA001)
}

async function onVoid () {
  if (!canVoid.value) return
  if (!confirm('作廢後不可修改，確定？')) return
  await axios.post(`/api/user/${form.value.SA001}/void`)
  await loadOne(form.value.SA001)
}

async function loadOne (id) {
  const { data } = await axios.get(`/api/user/${id}`)
  form.value = data
}

async function doSearch () {
  const { data } = await axios.get('/api/user', { params: { q: q.value, state: qState.value, role: qRole.value } })
  resultList.value = data
}

function pick (item) {
  searchDialog.value = false
  isNew.value = false
  form.value = { ...item }
}
</script>
