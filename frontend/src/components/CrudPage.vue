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
          <template v-for="f in renderFields" :key="f.key">
            <v-col :cols="12" :md="f.col ?? 6">
              <component
                :is="componentMap[f.type || 'text']"
                v-model="models[f.key]"
                :label="f.label"
                v-bind="f.props"
                :rules="fieldUiRules(f)" 
                :readonly="resolveReadonly(f)"
                :items="optionsMap[f.key]"
                :item-title="f.itemTitle || 'title'"
                :item-value="f.itemValue || 'value'"
                :type="f.type === 'date' ? 'date' : undefined"
                :hint="fieldHints[f.key] || f.props?.hint"
                :persistent-hint="!!(fieldHints[f.key] || f.props?.['persistent-hint'])"
                @blur="onLookupBlur(f.key)"
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

          <v-data-table :headers="listHeaders" :items="resultList" height="260" fixed-header>
            <template v-slot:[`item.pick`]="{ item }">
              <v-btn size="small" @click="pick(item)">選取</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="doSearch">查詢</v-btn>
          <v-btn text @click="closeSearchDialog">關閉</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import ActionButtons from '@/components/ActionButtons.vue'
import { useAuth } from '@/composables/useAuth'

const fieldHints = reactive({})

// ── 由各頁傳入的差異化參數 ─────────────────────────
const props = defineProps({
  title: String,                  // 頁面標題
  resource: { type: String, required: true }, // 對應 /api/<resource>
  fields: { type: Array, required: true },    // 欄位 schema（見下方用法）
  listHeaders: { type: Array, default: () => ([
    { title: '選取', key: 'pick', sortable: false, width: 80 }
  ])}
})

/* ---------------- 小工具 ---------------- */
function debounce (fn, ms = 300) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms) } }
const getByPath = (o, path) => path.split('.').reduce((x,k)=> (x?.[k]), o)
function today() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}` // YYYY-MM-DD（本地）
}

/* ---------------- 基本狀態 ---------------- */
const { userId, userName } = useAuth()
const form = reactive({
  IssueState: 'N',
  Creator: userId.value || userName.value || 'SYSTEM',
  CreateDate: new Date().toISOString(),
  categoryIds: [],
})
const isNew = ref(true)
const searchDialog = ref(false)
const q = ref('')
const qState = ref('')
const resultList = ref([])

const stateItems = [
  { title: '全部', value: '' },
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
  checkbox: 'v-checkbox',
  combobox:'v-combobox',
  date: 'v-text-field'
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

// 可見性：支援 visible（布林或函式）、hideOnCreate、hideOnEdit
function resolveVisible(f) {
  if (typeof f.visible === 'function') return f.visible({ isNew: isNew.value, form })
  if (typeof f.visible === 'boolean')  return f.visible
  if (f.hideOnCreate && isNew.value)   return false
  if (f.hideOnEdit && !isNew.value)    return false
  return true
}

// 只渲染可見欄位
const renderFields = computed(() => props.fields.filter(resolveVisible))

// —— 驗證工具 —— //
function isBlank(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
}

// UI 規則：把 schema 的 props.rules 與必填規則合併；被隱藏就不附加規則
function fieldUiRules(f) {
  const base = (f.props?.rules || []).slice()
  if (!resolveVisible(f)) return base
  const required = (typeof f.required === 'function') ? f.required(form) : !!f.required
  if (required) {
    base.unshift(v => !isBlank(v) || (f.requiredMsg || `${f.label || f.key} 不能為空`))
  }
  return base
}

// 送出前的 schema 驅動驗證：自動跳過目前不顯示的欄位
function validateBeforeSave() {
  const errors = []
  for (const f of props.fields) {
    if (!resolveVisible(f)) continue

    const required = (typeof f.required === 'function') ? f.required(form) : !!f.required
    if (required && isBlank(form[f.key])) {
      errors.push(f.requiredMsg || `${f.label || f.key} 不能為空`)
      continue
    }
    if (typeof f.validate === 'function') {
      const r = f.validate(form[f.key], form)
      if (r !== true) errors.push(typeof r === 'string' ? r : `${f.label || f.key} 格式不正確`)
    }
  }
  return errors
}

// models：為了支援 Y/N ↔ boolean 等轉換
const models = reactive({})
function bindModels() {
  // 先確保 form 有對應欄位（避免 v-model 綁不到）
  props.fields.forEach(f => {
    const baseDefault =
    f.type === 'date'     ? today() :
    f.type === 'checkbox' ? 'N'     : ''
    form[f.key] = (typeof f.default === 'function')
    ? f.default()
    : (f.default !== undefined ? f.default : baseDefault)
  })

  // 針對每個欄位建立一個 computed ref 代理 transform
  props.fields.forEach(f => {
    if (!models[f.key]) {
      models[f.key] = computed({
        get() {
          const v = form[f.key]
          return f.transform?.get ? f.transform.get(v, form) : v
        },
        set(val) {
          form[f.key] = f.transform?.set ? f.transform.set(val, form) : val
        },
      })
    }
  })
}
const resolveReadonly = (f) => typeof f.readonly === 'function' ? f.readonly({ isNew: isNew.value, form }) : !!f.readonly

// 存每個欄位的 lookup 設定與執行器
const lookupConfigs  = {}   // key -> f.lookup
const lookupFetchers = {}   // key -> doFetch 函數

function onLookupBlur(key) {
  const lk = lookupConfigs[key]
  if (!lk || lk.trigger !== 'blur') return        // 只有 blur 型才處理
  const v = form[key]
  if (!v || !String(v).trim()) return resetTargetsFor(key)
  lookupFetchers[key]?.(v)
}

function resetTargetsFor(key) {
  const lk = lookupConfigs[key]
  if (!lk) return
  if (lk.target) form[lk.target] = ''
  if (lk.targetMap) for (const k of Object.keys(lk.targetMap)) form[k] = ''
  fieldHints[key] = ''                   // ← 清空提示
}

function setupLookups () {
  props.fields.forEach(f => {
    if (!f.lookup) return
    const lk = f.lookup
    lookupConfigs[f.key] = lk

    const src = () => form[f.key]
    const resetTargets = () => resetTargetsFor(f.key)
    const doFetch = debounce(async (val) => {
      const code = (val ?? '').toString().trim()
      if (!code) { resetTargets(); return }
      try {
        const method = (lk.method || 'get').toLowerCase()
        let url = typeof lk.url === 'function' ? lk.url(code, form) : lk.url
        if (typeof url === 'string' && url.includes(':id')) {
          url = url.replace(':id', encodeURIComponent(code))
        }
        const params = typeof lk.params === 'function' ? lk.params(code, form) : (lk.params || {})

        const resp = method === 'post'
          ? await axios.post(url, params)
          : await axios.get(url, { params })

        const raw = Array.isArray(resp.data) ? resp.data[0] : resp.data
        if (!raw) { resetTargets(); return }

        if (lk.target) {
          const v = typeof lk.pick === 'function'
            ? lk.pick(raw, form)
            : typeof lk.pick === 'string'
              ? getByPath(raw, lk.pick)
              : raw
          form[lk.target] = (v ?? '').toString()
        }
        if (lk.targetMap) {
          for (const [dst, srcPathOrFn] of Object.entries(lk.targetMap)) {
            const v = typeof srcPathOrFn === 'function'
              ? srcPathOrFn(raw, form)
              : getByPath(raw, srcPathOrFn)
            form[dst] = (v ?? '').toString()
          }
        }
        // ----- 動態 hint：若有設定 hintPick / hintPrefix 就顯示在同欄位提示 -----
        if (lk.hintPick) {
          const hv = typeof lk.hintPick === 'function'
            ? lk.hintPick(raw, form)
            : lk.hintPick.split('.').reduce((o,k)=>o?.[k], raw)
          const text = hv ?? ''
          fieldHints[f.key] = lk.hintPrefix ? `${lk.hintPrefix}${text}` : String(text)
        }
      } catch (err) {
        resetTargets()
        throw err;
      }
    }, lk.debounce ?? 300)

    // 存起來給 onLookupBlur 用
    lookupFetchers[f.key] = doFetch

    // input 型：即時監看
    if (lk.trigger !== 'blur') {
      watch(src, (v) => {
        if (lk.when && !lk.when(v, form)) return
        if (!v || !String(v).trim()) return resetTargets()
        doFetch(v)
      })
    }

    // immediate：初始化或載入單筆後也先跑一次
    if (lk.immediate) {
      const cur = src()
      if (cur && String(cur).trim()) doFetch(cur)
    }
  })
}

watch(searchDialog, (val) => {
  if (!val) {
    q.value = ''
    qState.value = ''
    resultList.value = []
  }
})


onMounted(async () => {
  bindModels()
  await initOptions()
  setupLookups()
})

// ── CRUD 動作（用 resource 組 RESTful 路徑） ─────────
const apiBase = computed(() => `/api/${props.resource}`)

function buildPayload () {
  const payload = {}
  // 只收集需儲存的欄位（noSave:true 的跳過）
  for (const f of props.fields) {
    if (f.noSave) continue
    payload[f.key] = form[f.key]
  }
  // 固定欄位
  payload.IssueState = form.IssueState
  payload.Creator    = form.Creator
  payload.CreateDate = form.CreateDate
  return payload
}

function onNew() {
  Object.keys(form).forEach(k => delete form[k])
  form.IssueState = 'N'
  form.Creator = userId.value || userName.value || 'SYSTEM'
  form.CreateDate = new Date().toISOString()
  // 依 schema 補預設
  props.fields.forEach(f => {
    const baseDefault =
    f.type === 'date'     ? today() :
    f.type === 'checkbox' ? 'N'     : ''
    form[f.key] = (typeof f.default === 'function')
      ? f.default()
      : (f.default !== undefined ? f.default : baseDefault)
  })
  isNew.value = true
}

async function onSave() {
   // 1) schema 驅動驗證（自動跳過隱藏欄位）
  const errs = validateBeforeSave()
  if (errs.length) { alert(errs.join('\n')); return }
  // 取主鍵（假設第一個欄位為主鍵，或你可在 schema 指定 f.pk=true）
  const pkField = props.fields.find(f => f.pk) || props.fields[0]
  const id = form[pkField.key]
  if (!id || !String(id).trim()) return alert(`${pkField.label} 不能為空`)

  const payload = buildPayload()
  if (isNew.value) await axios.post(apiBase.value, payload)
  else await axios.put(`${apiBase.value}/${id}`, payload)
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

function closeSearchDialog() {
  searchDialog.value = false
  q.value = ''
  qState.value = ''
  resultList.value = []
}


function pick(item) {
  searchDialog.value = false
  isNew.value = false
  Object.assign(form, item)
}
</script>
