<template>
  <v-card-text class="d-flex flex-wrap gap-2">
    <v-btn class="mx-1" icon="mdi-plus-outline" density="comfortable"
           :disabled="!canNewBtn" @click="$emit('new')" />

    <v-btn class="mx-1" icon="mdi-account-search-outline" density="comfortable"
           :disabled="!canSearchBtn" @click="$emit('search')" />

    <v-btn class="mx-1" icon="mdi-trash-can-outline" density="comfortable" color="error"
           :disabled="!canDeleteBtn" @click="$emit('delete')" />

    <v-btn class="mx-1" icon="mdi-content-copy" density="comfortable"
           :disabled="!canCopyBtn" @click="$emit('copy')" />

    <v-btn class="mx-1" icon="mdi-tag-check-outline" density="comfortable" color="success"
           :disabled="!canApproveBtn" @click="$emit('approve')" />

    <v-btn class="mx-1" icon="mdi-tag-remove-outline" density="comfortable" color="warning"
           :disabled="!canUnapproveBtn" @click="$emit('unapprove')" />

    <v-btn class="mx-1" icon="mdi-tag-off-outline" density="comfortable" color="grey"
           :disabled="!canVoidBtn" @click="$emit('void')" />
  </v-card-text>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  isNew: { type: Boolean, default: true },
  // 傳進來單據狀態：'N' | 'Y' | 'V'
  issueState: { type: String, default: 'N' },
})
defineEmits(['new','search','delete','copy','approve','unapprove','void'])

const { perms, manager } = useAuth()
const isManager       = computed(() => String(manager.value) === '1')
const canCreatePerm   = computed(() => isManager.value || !!perms.value.C)
const canReadPerm     = computed(() => isManager.value || !!perms.value.R)
// const canUpdatePerm   = computed(() => isManager.value || !!perms.value.U)
const canDeletePerm   = computed(() => isManager.value || !!perms.value.D)
const canApprovePerm  = computed(() => isManager.value || !!perms.value.A)

const state = computed(() => props.issueState || 'N')

// 按鈕啟用規則（可依你業務調整）
const canNewBtn        = computed(() => canCreatePerm.value)
const canSearchBtn     = computed(() => canReadPerm.value)
const canCopyBtn       = computed(() => canCreatePerm.value && !props.isNew)

const canDeleteBtn     = computed(() => canDeletePerm.value  && !props.isNew && state.value === 'N')
const canApproveBtn    = computed(() => canApprovePerm.value && !props.isNew && state.value === 'N')
const canUnapproveBtn  = computed(() => canApprovePerm.value && !props.isNew && state.value === 'Y')
const canVoidBtn       = computed(() => (isManager.value || canDeletePerm.value) && !props.isNew && state.value !== 'V')

// 若你還需要「修改/儲存」按鈕，可參考：
// const canEditBtn = computed(() => canUpdatePerm.value && !props.isNew && state.value === 'N')
</script>
