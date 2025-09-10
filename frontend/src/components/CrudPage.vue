<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>

      <!-- 工具列 -->
      <ActionButtons
        :is-new="isNew"
        :issue-state="form.IssueState"
        @new="onNew"
        @search="searchDialog = true"
        @delete="onDelete"
        @copy="onCopy"
        @approve="onApprove"
        @unapprove="onUnapprove"
        @void="onVoid"
      />

      <v-divider />

      <!-- 表單（依 schema 渲染） -->
      <v-card-text>
        <v-row class="g-2">
          <template v-for="f in fields" :key="f.key">
            <v-col :cols="12" :md="f.col ?? 6">
              <component
                :is="componentMap[f.type || 'text']"
                v-model="models[f.key]"
                :label="f.label"
                v-bind="f.props"
                :readonly="resolveReadonly(f)"
                :items="optionsMap[f.key]"
                :item-title="f.itemTitle || 'title'"
                :item-value="f.itemValue || 'value'"
              />
            </v-col>
          </template>
          <v-divider />

          <!-- 內建：狀態/建立資訊（若不需要可從 schema 自行定義） -->
          <v-col cols="12" md="6">
            <v-select v-model="form.IssueState" :items="stateItems" label="簽核狀態" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.Creator" label="建立人" readonly />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field :model-value="createDateTW" label="建立日期" readonly />
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
              <v-text-field v-model="q" label="關鍵字" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="qState" :items="stateItems" label="狀態(可選)" />
            </v-col>
          </v-row>

          <v-data-table :headers="listHeaders" :items="resultList" height="320" fixed-header>
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
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'
import ActionButtons from '@/components/ActionButtons.vue'
import { useAuth } from '@/composables/useAuth'

// ── 由各頁傳入的差異化參數 ─────────────────────────
const props = defineProps({
  title: String,                  // 頁面標題
  resource: { type: String, required: true }, // 對應 /api/<resource>
  fields: { type: Array, required: true },    // 欄位 schema（見下方用法）
  listHeaders: { type: Array, default: () => ([
    { title: '選取', key: 'pick', sortable: false, width: 80 }
  ])}
})

// 基本狀態
const { userId, userName } = useAuth()
const form = reactive({
  IssueState: 'N',
  Creator: userId.value || userName.value || 'SYSTEM',
  CreateDate: new Date().toISOString(),
})
const isNew = ref(true)
const searchDialog = ref(false)
const q = ref('')
const qState = ref('')
const resultList = ref([])

const stateItems = [
  { title: 'N：未確認', value: 'N' },
  { title: 'Y：已確認', value: 'Y' },
  { title: 'V：作廢',   value: 'V' }
]

// 日期顯示（本地／台北）
const createDateTW = computed(() =>
  new Intl.DateTimeFormat('zh-TW', {
    dateStyle:'medium', timeStyle:'medium', hour12:false, timeZone:'Asia/Taipei'
  }).format(new Date(form.CreateDate))
)

// ── 動態欄位渲染：component 與 v-model 代理 ─────────
const componentMap = {
  text: 'v-text-field',
  textarea: 'v-textarea',
  select: 'v-select',
  checkbox: 'v-checkbox'
}

// optionsMap：給 select 用的 items（支援 async loader）
const optionsMap = reactive({})
async function initOptions() {
  for (const f of props.fields) {
    if (f.type === 'select') {
      if (Array.isArray(f.options)) optionsMap[f.key] = f.options
      else if (typeof f.options === 'function') {
        const items = await f.options()
        optionsMap[f.key] = items || []
      } else {
        optionsMap[f.key] = []
      }
    }
  }
}

// models：為了支援 Y/N ↔ boolean 等轉換
const models = reactive({})
function bindModels() {
  props.fields.forEach(f => {
    // 建立預設欄位
    if (form[f.key] === undefined) form[f.key] = f.default ?? (f.type==='checkbox' ? 'N' : '')

    // 代理：有 transform 就用 get/set，否則直綁
    Object.defineProperty(models, f.key, {
      get() {
        const v = form[f.key]
        if (f.transform?.get) return f.transform.get(v, form)
        return v
      },
      set(val) {
        if (f.transform?.set) form[f.key] = f.transform.set(val, form)
        else form[f.key] = val
      }
    })
  })
}
const resolveReadonly = (f) => typeof f.readonly === 'function' ? f.readonly({ isNew: isNew.value, form }) : !!f.readonly

onMounted(async () => {
  bindModels()
  await initOptions()
})

// ── CRUD 動作（用 resource 組 RESTful 路徑） ─────────
const apiBase = computed(() => `/api/${props.resource}`)

function onNew() {
  Object.keys(form).forEach(k => delete form[k])
  form.IssueState = 'N'
  form.Creator = userId.value || userName.value || 'SYSTEM'
  form.CreateDate = new Date().toISOString()
  // 依 schema 補預設
  props.fields.forEach(f => (form[f.key] = f.default ?? (f.type==='checkbox' ? 'N' : '')))
  isNew.value = true
}

async function onSave() {
  // 取主鍵（假設第一個欄位為主鍵，或你可在 schema 指定 f.pk=true）
  const pkField = props.fields.find(f => f.pk) || props.fields[0]
  const id = form[pkField.key]
  if (!id || !String(id).trim()) return alert(`${pkField.label} 不能為空`)

  if (isNew.value) {
    await axios.post(apiBase.value, form)
    isNew.value = false
  } else {
    await axios.put(`${apiBase.value}/${id}`, form)
  }
  await loadOne(id)
  alert('儲存成功')
}

async function onDelete() {
  const pkField = props.fields.find(f => f.pk) || props.fields[0]
  const id = form[pkField.key]
  if (!id || !confirm('確定刪除？')) return
  await axios.delete(`${apiBase.value}/${id}`)
  onNew()
}

async function onCopy() {
  const pkField = props.fields.find(f => f.pk) || props.fields[0]
  const id = form[pkField.key]
  const newId = prompt(`請輸入新的 ${pkField.label}`)
  if (!newId) return
  await axios.post(`${apiBase.value}/${id}/copy`, { newId })
  await loadOne(newId)
  isNew.value = false
}

async function onApprove()   { await flowPost('approve') }
async function onUnapprove() { await flowPost('unapprove') }
async function onVoid()      { if (confirm('作廢後不可修改，確定？')) await flowPost('void') }
async function flowPost(action) {
  const pkField = props.fields.find(f => f.pk) || props.fields[0]
  const id = form[pkField.key]
  await axios.post(`${apiBase.value}/${id}/${action}`)
  await loadOne(id)
}

async function loadOne(id) {
  const { data } = await axios.get(`${apiBase.value}/${id}`)
  Object.assign(form, data)
  isNew.value = false
}

/* 查詢 */
async function doSearch() {
  const { data } = await axios.get(apiBase.value, { params: { q: q.value, state: qState.value } })
  resultList.value = data
}
function pick(item) {
  searchDialog.value = false
  isNew.value = false
  Object.assign(form, item)
}
</script>
