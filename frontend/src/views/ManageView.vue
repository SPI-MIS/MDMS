<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <v-card>
      <v-card-title class="text-h6">使用者權限管理</v-card-title>

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

          <v-data-table :headers="listHeaders" :items="resultList" item-key="SA001" height="280" fixed-header >
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
import { ref, computed, unref, watch } from 'vue'
import axios from 'axios'
import ActionButtons from '@/components/ActionButtons.vue'
import { useAuth } from '@/composables/useAuth';

const { userId, userName, manager } = useAuth();

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
