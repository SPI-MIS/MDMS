<template>
  <v-dialog v-model="isOpen" max-width="800">
    <v-card v-if="vote && statistics">
      <v-card-title>{{ t('vote.voteStatistics') }} - {{ vote.activityName }}</v-card-title>

      <v-card-text class="py-6">
        <!-- 統計摘要 -->
        <div class="mb-6">
          <v-row>
            <v-col cols="12" md="4">
              <v-card class="text-center pa-4" color="primary" dark>
                <p class="text-caption">{{ t('vote.totalVotes') }}</p>
                <p class="text-h4 font-weight-bold">{{ statistics.totalVotes || 0 }}</p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card class="text-center pa-4" color="info" dark>
                <p class="text-caption">{{ t('vote.totalParticipants') }}</p>
                <p class="text-h4 font-weight-bold">{{ statistics.totalParticipants || 0 }}</p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card class="text-center pa-4" color="success" dark>
                <p class="text-caption">{{ t('vote.participationRate') }}</p>
                <p class="text-h4 font-weight-bold">
                  {{ statistics.totalParticipants > 0 ? Math.round((statistics.totalVotes / statistics.totalParticipants) * 100) : 0 }}%
                </p>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <!-- 選項統計 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.optionStatistics') }}</h3>
          
          <div v-for="option in optionStatistics" :key="option.optionId" class="mb-6">
            <!-- 選項標題 -->
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body2 font-weight-bold">{{ option.optionText }}</span>
              <span class="text-caption font-weight-bold text-primary">
                {{ option.percentage }}% ({{ option.voteCount }}/{{ statistics.totalVotes || 0 }})
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

        <!-- 投票者清單（不記名投票除外） -->
        <div v-if="!vote.allowAnonymous && votersList.length > 0" class="mb-6">
          <v-divider class="my-4" />
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.votersList') }}</h3>
          
          <v-table dense>
            <thead>
              <tr>
                <th>{{ t('vote.userId') }}</th>
                <th>{{ t('vote.selectedOption') }}</th>
                <th>{{ t('vote.votedAt') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="voter in votersList" :key="voter.voteRecordId">
                <td>{{ voter.userId }}</td>
                <td>{{ voter.optionText }}</td>
                <td>{{ formatDateTime(voter.votedAt) }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- 匿名提示 -->
        <v-alert
          v-if="vote.allowAnonymous"
          type="info"
          class="mt-4"
          icon="mdi-information-outline"
        >
          {{ t('vote.anonymousVoteWarning') }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn
          color="primary"
          variant="elevated"
          size="small"
          @click="exportData"
        >
          {{ t('vote.exportData') }}
        </v-btn>
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
  },
  statistics: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

// 狀態
const optionStatistics = ref([])
const votersList = ref([])

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const onClose = () => {
  emit('close')
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateStatistics = () => {
  if (!props.statistics || !props.vote?.optionDetails) {
    return
  }

  const totalVotes = props.statistics.totalVotes || 0
  optionStatistics.value = (props.vote.optionDetails || []).map(option => ({
    ...option,
    percentage: totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0
  }))

  // 獲取投票者清單
  if (props.statistics.votersList) {
    votersList.value = props.statistics.votersList
  }
}

const exportData = () => {
  if (!props.vote || !props.statistics) return

  // 準備 CSV 資料
  const headers = [t('vote.optionText'), t('vote.voteCount'), t('vote.percentage')]
  const rows = optionStatistics.value.map(opt => [
    opt.optionText,
    opt.voteCount,
    `${opt.percentage}%`
  ])

  const csvContent = [
    [t('vote.voteStatistics'), props.vote.activityName],
    [''],
    headers,
    ...rows,
    [''],
    [t('vote.totalVotes'), props.statistics.totalVotes],
    [t('vote.totalParticipants'), props.statistics.totalParticipants]
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  // 建立下載連結
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `vote_statistics_${props.vote.voteId}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 監視統計資料變化
watch(
  () => props.statistics,
  () => {
    calculateStatistics()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.text-primary {
  color: #1976d2;
}

.text-white {
  color: white;
}

.text-caption {
  font-size: 12px;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
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

.my-4 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.py-6 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.pa-4 {
  padding: 1rem;
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

.dark {
  color: white;
}
</style>
