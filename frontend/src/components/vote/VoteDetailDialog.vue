<template>
  <v-dialog v-model="isOpen" max-width="700">
    <v-card v-if="vote">
      <v-card-title>{{ t('vote.voteDetails') }}</v-card-title>

      <v-card-text class="py-6">
        <!-- 基本資訊 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.basicInfo') }}</h3>
          <v-row>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.activityCode') }}</p>
              <p class="text-body2 font-weight-bold">{{ vote.activityCode }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.activityName') }}</p>
              <p class="text-body2 font-weight-bold">{{ vote.activityName }}</p>
            </v-col>
            <v-col cols="12">
              <p class="text-caption text-gray-600">{{ t('vote.voteTitle') }}</p>
              <p class="text-body2">{{ vote.voteTitle }}</p>
            </v-col>
            <v-col cols="12">
              <p class="text-caption text-gray-600">{{ t('vote.voteDescription') }}</p>
              <p class="text-body2">{{ vote.voteDescription }}</p>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <!-- 投票設定 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.votingSettings') }}</h3>
          <v-row>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.voteType') }}</p>
              <p class="text-body2">{{ getVoteTypeLabel(vote.voteType) }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.allowMultiple') }}</p>
              <p class="text-body2">
                {{ vote.allowMultiple ? t('vote.multipleChoice') : t('vote.singleChoice') }}
              </p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.allowAnonymous') }}</p>
              <p class="text-body2">
                <v-icon size="16" :color="vote.allowAnonymous ? 'success' : 'error'">
                  {{ vote.allowAnonymous ? 'mdi-check' : 'mdi-close' }}
                </v-icon>
              </p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.resultsPublic') }}</p>
              <p class="text-body2">
                <v-icon size="16" :color="vote.resultsPublic ? 'success' : 'error'">
                  {{ vote.resultsPublic ? 'mdi-check' : 'mdi-close' }}
                </v-icon>
              </p>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <!-- 時間範圍 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.timeRange') }}</h3>
          <v-row>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.startTime') }}</p>
              <p class="text-body2">{{ formatDateTime(vote.startTime) }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.endTime') }}</p>
              <p class="text-body2">{{ formatDateTime(vote.endTime) }}</p>
            </v-col>
          </v-row>
        </div>

        <v-divider class="my-4" />

        <!-- 投票選項 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.options') }}</h3>
          <v-list>
            <v-list-item v-for="(option, index) in vote.optionDetails" :key="option.optionId">
              <template #prepend>
                <span class="text-body2 font-weight-bold mr-2">{{ index + 1 }}.</span>
              </template>
              <v-list-item-title>{{ option.optionText }}</v-list-item-title>
              <template #append>
                <span class="text-caption text-gray-600">{{ option.voteCount }} {{ t('vote.votes') }}</span>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <v-divider class="my-4" />

        <!-- 狀態與時間戳 -->
        <div class="mb-6">
          <h3 class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.statusInfo') }}</h3>
          <v-row>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.status') }}</p>
              <v-chip
                :color="getStatusColor(vote.voteStatus)"
                size="small"
                text-color="white"
              >
                {{ getStatusLabel(vote.voteStatus) }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.createdBy') }}</p>
              <p class="text-body2">{{ vote.createdBy }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.createdAt') }}</p>
              <p class="text-body2">{{ formatDateTime(vote.createdAt) }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p class="text-caption text-gray-600">{{ t('vote.updatedAt') }}</p>
              <p class="text-body2">{{ vote.updatedAt ? formatDateTime(vote.updatedAt) : '-' }}</p>
            </v-col>
          </v-row>
        </div>
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
import { computed } from 'vue'
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

const getStatusColor = (status) => {
  const colorMap = {
    'Draft': 'grey',
    'Active': 'blue',
    'Closed': 'orange',
    'Cancelled': 'red'
  }
  return colorMap[status] || 'grey'
}

const getStatusLabel = (status) => {
  const statusMap = {
    'Draft': t('vote.statusDraft'),
    'Active': t('vote.statusActive'),
    'Closed': t('vote.statusClosed'),
    'Cancelled': t('vote.statusCancelled')
  }
  return statusMap[status] || ''
}

const getVoteTypeLabel = (voteType) => {
  const typeMap = {
    'general': t('vote.typeGeneral'),
    'rating': t('vote.typeRating'),
    'poll': t('vote.typePoll')
  }
  return typeMap[voteType] || voteType
}
</script>

<style scoped>
.text-gray-600 {
  color: rgba(0, 0, 0, 0.6);
}

.mr-2 {
  margin-right: 0.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.my-4 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.py-6 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}
</style>
