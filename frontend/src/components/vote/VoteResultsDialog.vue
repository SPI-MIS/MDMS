<template>
  <v-dialog v-model="isOpen" max-width="700">
    <v-card>
      <v-card-title>{{ t('vote.voteResults') }}</v-card-title>

      <v-card-text class="py-6">
        <!-- 投票主題 -->
        <div class="mb-6">
          <h3 class="text-h6 font-weight-bold mb-2">{{ vote?.voteTitle }}</h3>
          <div class="text-caption text-gray-600">
            <span class="mr-4">
              <v-icon size="16">mdi-account</v-icon>
              {{ totalVotes }} {{ t('vote.votes') }}
            </span>
            <span>
              <v-icon size="16">mdi-account-multiple</v-icon>
              {{ vote?.participants?.length || 0 }} {{ t('vote.participants') }}
            </span>
          </div>
        </div>

        <v-divider class="my-4" />

        <!-- 結果圖表 -->
        <div>
          <p class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.resultSummary') }}:</p>

          <div v-for="option in resultDetails" :key="option.optionId" class="mb-6">
            <!-- 選項標題 -->
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body2 font-weight-bold">{{ option.optionText }}</span>
              <span class="text-caption font-weight-bold text-primary">
                {{ option.percentage }}% ({{ option.voteCount }})
              </span>
            </div>

            <!-- 進度條 -->
            <v-progress-linear
              :value="option.percentage"
              height="24"
              color="primary"
              striped
            >
              <span class="text-caption font-weight-bold text-white">
                {{ option.percentage }}%
              </span>
            </v-progress-linear>
          </div>
        </div>

        <!-- 投票狀態信息 -->
        <v-alert
          v-if="vote?.voteStatus === 'Closed'"
          type="warning"
          class="mt-6"
          icon="mdi-information-outline"
        >
          {{ t('vote.votingHasEnded') }}
        </v-alert>

        <v-alert
          v-if="userHasVoted"
          type="info"
          class="mt-6"
          icon="mdi-check-circle"
        >
          {{ t('vote.youHaveVoted') }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn color="primary" variant="text" @click="onClose">
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const emit = defineEmits(['update:modelValue', 'close'])

// 狀態
const resultDetails = ref([])
const totalVotes = ref(0)
const userHasVoted = ref(false)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const onClose = () => {
  emit('close')
}

const calculateResults = () => {
  if (!props.vote?.optionDetails) {
    return
  }

  const options = props.vote.optionDetails || []
  totalVotes.value = options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0)

  resultDetails.value = options.map(option => ({
    ...option,
    percentage:
      totalVotes.value > 0
        ? Math.round((option.voteCount / totalVotes.value) * 100)
        : 0
  }))

  // 檢查當前用戶是否已投票
  const userId = localStorage.getItem('userId')
  userHasVoted.value = props.vote?.userVotes?.includes(userId) || false
}

// 當投票改變時，計算結果
watch(
  () => props.vote,
  () => {
    calculateResults()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.text-gray-600 {
  color: rgba(0, 0, 0, 0.6);
}

.text-primary {
  color: #1976d2;
}

.text-white {
  color: white;
}

.mr-4 {
  margin-right: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mt-6 {
  margin-top: 1.5rem;
}

.d-flex {
  display: flex;
}

.justify-space-between {
  justify-content: space-between;
}

.align-center {
  align-items: center;
}
</style>
