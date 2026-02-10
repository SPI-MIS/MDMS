<template>
  <v-dialog v-model="isOpen" max-width="600">
    <v-card>
      <v-card-title>{{ t('vote.submitYourVote') }}</v-card-title>

      <v-card-text class="py-6">
        <!-- 投票主題 -->
        <div class="mb-6">
          <h3 class="text-h6 font-weight-bold mb-2">{{ vote?.voteTitle }}</h3>
          <p v-if="vote?.voteDescription" class="text-body2 text-gray-700">
            {{ vote.voteDescription }}
          </p>
        </div>

        <v-divider class="my-4" />

        <!-- 投票選項 -->
        <div>
          <p class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.selectYourChoice') }}:</p>

          <!-- 單選模式 -->
          <div v-if="!vote?.allowMultiple">
            <v-radio-group v-model="selectedOption" class="mt-0">
              <v-radio
                v-for="option in voteOptions"
                :key="option.optionId"
                :label="option.optionText"
                :value="option.optionId"
              />
            </v-radio-group>
          </div>

          <!-- 複選模式 -->
          <div v-else>
            <v-checkbox
              v-for="option in voteOptions"
              :key="option.optionId"
              v-model="selectedOptions"
              :label="option.optionText"
              :value="option.optionId"
            />
          </div>
        </div>

        <!-- 匿名投票提示 -->
        <v-alert
          v-if="vote?.allowAnonymous"
          type="info"
          class="mt-6"
          icon="mdi-information-outline"
        >
          {{ t('vote.anonymousVotingWarning') }}
        </v-alert>

        <!-- 驗證錯誤提示 -->
        <v-alert v-if="errorMessage" type="error" class="mt-4" closable>
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="onCancel">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!isValid || isSubmitting"
          :loading="isSubmitting"
          @click="onSubmit"
        >
          {{ t('vote.submitVote') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { formatDateTimeForSubmit } from '@/utils/time'

const { t } = useI18n()
const { userId } = useAuth()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  vote: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'submit', 'close'])

// 狀態
const selectedOption = ref(null)
const selectedOptions = ref([])
const errorMessage = ref('')
const isSubmitting = ref(false)
const voteOptions = ref([])

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isValid = computed(() => {
  if (!props.vote?.allowMultiple) {
    return !!selectedOption.value
  } else {
    return selectedOptions.value.length > 0
  }
})

// 方法
const onCancel = () => {
  resetForm()
  emit('close')
}

const onSubmit = async () => {
  errorMessage.value = ''

  if (!isValid.value) {
    errorMessage.value = t('vote.pleaseSelectOption')
    return
  }

  if (!userId.value) {
    errorMessage.value = t('vote.loginRequired')
    return
  }

  isSubmitting.value = true

  try {
    const voteData = {
      voteId: props.vote.voteId,
      selectedOptions: props.vote.allowMultiple
        ? selectedOptions.value
        : [selectedOption.value],
      userId: userId.value,
      anonymous: props.vote.allowAnonymous,
      votedAt: formatDateTimeForSubmit(new Date())
    }

    emit('submit', voteData)
    resetForm()
  } catch (error) {
    errorMessage.value = error.message || t('common.error')
    console.error('Error submitting vote:', error)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  selectedOption.value = null
  selectedOptions.value = []
  errorMessage.value = ''
}

// 當投票改變時，重置表單並載入選項
watch(
  () => props.vote,
  (newVote) => {
    resetForm()
    if (newVote?.optionDetails) {
      voteOptions.value = newVote.optionDetails
    } else {
      // 建構選項對象（從 voteOptions 陣列）
      voteOptions.value = (newVote?.voteOptions || []).map((text, index) => ({
        optionId: `opt_${newVote.voteId}_${index}`,
        optionText: text,
        voteCount: 0
      }))
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.text-gray-700 {
  color: rgba(0, 0, 0, 0.54);
}
</style>
