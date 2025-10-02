<template>
  <v-card-text class="d-flex flex-wrap gap-2">
    <v-tooltip text="新增">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-plus-outline" density="comfortable" :disabled="!canNewBtn" @click="$emit('new')" />
        </span>
      </template>
    </v-tooltip>

    <v-tooltip text="查詢">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-account-search-outline" density="comfortable" :disabled="!canSearchBtn || !isLoggedIn" @click="$emit('search')" />
        </span>
        </template>
    </v-tooltip>

    <v-tooltip text="刪除">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-trash-can-outline" density="comfortable" color="error" :disabled="!canDelete" @click="$emit('delete')" />
        </span>
        </template>
    </v-tooltip>

    <v-tooltip text="複製">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-content-copy" density="comfortable" :disabled="!canCopy" @click="$emit('copy')" />
        </span>
        </template>
    </v-tooltip>

    <v-tooltip text="核准">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-tag-check-outline" density="comfortable" color="success" :disabled="!canApprove" @click="$emit('approve')" />
        </span>
      </template>
    </v-tooltip>

    <v-tooltip text="取消核准">
      <template #activator="{ props }">
        <span v-bind="props">
          <v-btn class="mx-1" icon="mdi-tag-remove-outline" density="comfortable" color="warning" :disabled="!canUnapprove" @click="$emit('unapprove')" />
        </span>
        </template>
    </v-tooltip>

    <v-tooltip text="作廢">
      <template #activator="{ props }">
        <span>
          <v-btn v-bind="props" class="mx-1" icon="mdi-tag-off-outline" density="comfortable" color="brown" v-ripple="{ class: 'text-red' }" :disabled="!canVoid" @click="$emit('void')" />
        </span>
      </template>
    </v-tooltip>
  </v-card-text>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { perms, manager, isLoggedIn } = useAuth()
const props = defineProps({
  isNew: { type: Boolean, default: true },
  issueState: { type: String, default: 'N' },

  canNew:       Boolean,
  canSearch:    Boolean,
  canDelete:    Boolean,
  canCopy:      Boolean,
  canApprove:   Boolean,
  canUnapprove: Boolean,
  canVoid:      Boolean,
})

console.log('props:', props);
defineEmits(['new','search','delete','copy','approve','unapprove','void'])

// ① 加：由父層帶進來的核準狀態（沒值預設 N）
const state = computed(() => (props.issueState || 'N').toUpperCase())

// ② 加：把「狀態鎖」集中定義（可依規則調整）
const stateAllow = computed(() => ({
  approve:  state.value === 'N',
  unapprove:state.value === 'Y',
  void:     state.value !== 'V',
}))

const isManager       = computed(() => String(manager.value) === '1')
const canCreatePerm   = computed(() => isManager.value || !!perms.value.C)
const canReadPerm     = computed(() => isManager.value || !!perms.value.R)
//const canUpdatePerm   = computed(() => isManager.value || !!perms.value.U)
const canDeletePerm   = computed(() => isManager.value || !!perms.value.D)
const canApprovePerm  = computed(() => isManager.value || !!perms.value.A)

// 按鈕啟用規則（可依你業務調整）
const canNewBtn        = computed(() => canCreatePerm.value)
const canSearchBtn     = computed(() => canReadPerm.value)
const canCopy       = computed(() => canCreatePerm.value && !props.isNew)
const canDelete     = computed(() => canDeletePerm.value  && !props.isNew)
const canApprove    = computed(() => canApprovePerm.value && !props.isNew && stateAllow.value.approve)
const canUnapprove  = computed(() => canApprovePerm.value && !props.isNew && stateAllow.value.unapprove)
const canVoid       = computed(() => isManager.value && !props.isNew && stateAllow.value.void)
//const canEditBtn = computed(() => canUpdatePerm.value && !props.isNew && state.value === 'N')
</script>
