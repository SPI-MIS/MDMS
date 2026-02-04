<template>
  <div>
    <!-- 標題區 (移到外層，只顯示一次) -->
    <v-card-title v-if="title" class="text-h6">{{ title }}</v-card-title>

    <!-- 每一列的卡片 -->
    <v-card v-for="(row, rowIndex) in rows" :key="rowIndex" flat class="mb-2">
      <v-card-text class="py-2">
        <v-container fluid>
          <v-row class="mb-1 align-center">
            <v-col cols="12" class="py-0">
              <div class="text-subtitle-2 text-grey-darken-1">第 {{ rowIndex + 1 }} 筆</div>
            </v-col>
          </v-row>
          <v-row class="align-center" dense>
            <template v-for="field in schema" :key="field.key">
              <v-col :cols="field.cols || field.col || 4">
                <!-- text -->
                <v-text-field 
                  v-if="field.type === 'text'" 
                  v-model="rows[rowIndex][field.key]" 
                  :label="field.label" 
                  density="compact"
                  :disabled="getFieldDisabled(field, rowIndex)"
                />

                <!-- textarea -->
                <v-textarea 
                  v-else-if="field.type === 'textarea'" 
                  v-model="rows[rowIndex][field.key]" 
                  :label="field.label" 
                  rows="2" 
                  density="compact"
                  hide-details
                  class="mb-2"
                  :disabled="getFieldDisabled(field, rowIndex)"
                />

                <!-- date -->
                <v-text-field 
                  v-else-if="field.type === 'date'" 
                  v-model="rows[rowIndex][field.key]" 
                  type="date" 
                  :label="field.label" 
                  density="compact"
                  :disabled="getFieldDisabled(field, rowIndex)"
                />

                <!-- select -->
                <v-select
                  v-else-if="field.type === 'select'" 
                  v-model="rows[rowIndex][field.key]" 
                  :label="field.label" 
                  :items="selectOptions[field.key]" 
                  density="compact"
                  :disabled="getFieldDisabled(field, rowIndex)"
                  @update:model-value="onSelectChange(field, rowIndex)"
                />

                <!-- duration -->
                <v-text-field 
                  v-else-if="field.type === 'duration'" 
                  v-model="rows[rowIndex][field.key]" 
                  :label="field.label" 
                  readonly 
                  density="compact" 
                  append-inner-icon="mdi-clock-outline"
                  :disabled="getFieldDisabled(field, rowIndex)"
                  @click="openDuration(rowIndex)" 
                />
              </v-col>
            </template>

            <v-col cols="1" class="d-flex justify-center">
              <v-btn 
                icon="mdi-delete" 
                color="warning" 
                variant="text" 
                @click="removeRow(rowIndex)" 
              />
            </v-col>
          </v-row>

          <!-- 分隔線 -->
          <v-divider v-if="rowDivider && rowIndex < rows.length - 1" class="mt-2" />
        </v-container>
      </v-card-text>
    </v-card>

    <!-- 操作按鈕 (移到外層，只顯示一次) -->
    <v-container fluid>
      <v-btn prepend-icon="mdi-plus" variant="outlined" color="primary" @click="addRow" > 新增一筆 </v-btn>
      <v-btn color="success" class="ml-4" @click="submitAll" > 儲存全部 </v-btn>
    </v-container>
  </div>

  <!-- Duration Dialog -->
  <v-dialog v-model="durationDialog" width="420">
    <v-card>
      <v-card-title>計算時長</v-card-title>
      <v-card-text>
        <v-text-field  v-model="durationStart" label="起始時間" type="datetime-local" density="compact"  />
        <v-text-field v-model="durationEnd" label="結束時間" type="datetime-local" density="compact"  />
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="durationDialog = false">取消</v-btn>
        <v-btn color="primary" @click="confirmDuration">確定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import dayjs from 'dayjs'

/* ================= props / emits ================= */
const props = defineProps({
  schema: {
    type: Array,
    default: () => [],
    required: false
  },
  fields: { 
    type: Array, 
    default: null 
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  },
  rowDivider: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const schema = computed(() => (props.schema && props.schema.length) ? props.schema : (props.fields || []))

/* ================= 建立空白列 ================= */
function createEmptyRow() {
  const row = {}

  if (!Array.isArray(schema.value)) {
    return row
  }

  schema.value.forEach(field => {
    if (!field || !field.key) return

    if (field.type === 'date' && field.default === 'today') {
      row[field.key] = dayjs().format('YYYY-MM-DD')
    } else if (field.default !== undefined) {
      row[field.key] = typeof field.default === 'function' ? field.default() : field.default
    } else {
      row[field.key] = null
    }
  })

  return row
}

/* ================= rows ================= */
const rows = ref(
  props.modelValue.length
    ? props.modelValue
    : [createEmptyRow()]
)

watch(
  rows,
  () => emit('update:modelValue', rows.value),
  { deep: true }
)

function addRow() {
  rows.value.push(createEmptyRow())
}

function removeRow(index) {
  rows.value.splice(index, 1)
}

/* ================= select options ================= */
const selectOptions = reactive({})

async function loadSelectOptions() {
  for (const field of schema.value) {
    if (field.type === 'select') {
      if (field.optionSource?.type === 'api') {
        // 如果有 dependsOn，則跳過初始加載，等待依賴欄位變化時再加載
        if (field.dependsOn) {
          selectOptions[field.key] = []
          continue
        }
        
        try {
          const res = await fetch(field.optionSource.url)
          if (!res.ok) {
            console.warn('[MultiBulkInput] option fetch not ok', field.optionSource.url, res.status)
            selectOptions[field.key] = []
            continue
          }
          let data = []
          try { 
            data = await res.json() 
          } catch (parseErr) { 
            console.warn('[MultiBulkInput] option parse failed', parseErr)
            selectOptions[field.key] = []
            continue 
          }
          selectOptions[field.key] = data.map(item => ({
            title: item[field.optionSource.labelKey],
            value: item[field.optionSource.valueKey]
          }))
        } catch (err) {
          console.error('[MultiBulkInput] load select options failed', err)
          selectOptions[field.key] = []
        }
      } else if (Array.isArray(field.options)) {
        selectOptions[field.key] = field.options.map(v => (typeof v === 'string' ? { title: v, value: v } : v))
      } else {
        selectOptions[field.key] = []
      }
    }
  }
}

// 新增：根據依賴欄位動態加載選項
async function loadDependentOptions(field, rowIndex) {
  if (!field.optionSource?.dependsOn) return
  
  const dependsOnValue = rows.value[rowIndex]?.[field.optionSource.dependsOn]
  if (!dependsOnValue) {
    selectOptions[field.key] = []
    return
  }
  
  try {
    let url = field.optionSource.url
    
    // 使用 buildUrl 函數或默認添加查詢參數
    if (field.optionSource.buildUrl) {
      url = field.optionSource.buildUrl(field.optionSource.url, rows.value[rowIndex])
    } else {
      // 默認行為：添加依賴欄位作為查詢參數
      const paramName = field.optionSource.dependsOn
      url = `${url}?${paramName}=${encodeURIComponent(dependsOnValue)}`
    }
      
    console.log('[MultiBulkInput] loading dependent options:', url)
    
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('[MultiBulkInput] dependent option fetch not ok', url, res.status)
      selectOptions[field.key] = []
      return
    }
    
    const data = await res.json()
    selectOptions[field.key] = data.map(item => ({
      title: item[field.optionSource.labelKey] || item.title,
      value: item[field.optionSource.valueKey] || item.value
    }))
    
    console.log('[MultiBulkInput] loaded options count:', selectOptions[field.key].length)
  } catch (err) {
    console.error('[MultiBulkInput] load dependent options failed', err)
    selectOptions[field.key] = []
  }
}

onMounted(loadSelectOptions)

watch(schema, (newSchema) => {
  if (!Array.isArray(newSchema)) return
  for (let i = 0; i < rows.value.length; i++) {
    if (!rows.value[i]) rows.value[i] = createEmptyRow()
    for (const field of newSchema) {
      if (!field || !field.key) continue
      if (rows.value[i][field.key] === undefined) {
        if (field.type === 'date' && field.default === 'today') {
          rows.value[i][field.key] = dayjs().format('YYYY-MM-DD')
        } else if (field.default !== undefined) {
          rows.value[i][field.key] = typeof field.default === 'function' ? field.default() : field.default
        } else {
          rows.value[i][field.key] = null
        }
      }
    }
  }

  loadSelectOptions()
}, { immediate: true })

/* ================= duration dialog ================= */
const durationDialog = ref(false)
const activeRowIndex = ref(null)
const durationStart = ref('')
const durationEnd = ref('')

function openDuration(rowIndex) {
  activeRowIndex.value = rowIndex
  durationStart.value = ''
  durationEnd.value = ''
  durationDialog.value = true
}

function submitAll() {
  emit('submit', rows.value)
}

function confirmDuration() {
  if (!durationStart.value || !durationEnd.value) return

  const start = dayjs(durationStart.value)
  const end = dayjs(durationEnd.value)
  const minutes = end.diff(start, 'minute')

  if (minutes < 0) return

  rows.value[activeRowIndex.value].duration = minutes
  durationDialog.value = false
}

// 處理 select 變化，觸發依賴欄位重新加載
function onSelectChange(field, rowIndex) {
  // 找出依賴此欄位的其他欄位
  schema.value.forEach(f => {
    if (f.optionSource?.dependsOn === field.key) {
      // 清空依賴欄位的值
      rows.value[rowIndex][f.key] = null
      // 重新加載選項
      loadDependentOptions(f, rowIndex)
    }
  })
}

// 判斷欄位是否應該 disabled
function getFieldDisabled(field, rowIndex) {
  if (!field.disabled) return false
  
  // 確保 rowIndex 有效
  if (!rows.value[rowIndex]) return false
  
  // 如果 disabled 是函數，調用它
  if (typeof field.disabled === 'function') {
    const result = field.disabled(rows.value[rowIndex])
    return result
  }
  
  // 如果是布林值，直接返回
  return Boolean(field.disabled)
}
</script>