<template>
  <v-card class="vote-card h-100 d-flex flex-column">
    <!-- 狀態徽章 -->
    <v-chip
      :color="statusColor"
      class="position-absolute top-2 right-2"
      size="small"
      text-color="white"
    >
      {{ statusLabel }}
    </v-chip>

    <!-- 內容 -->
    <v-card-text class="flex-grow-1">
      <!-- 活動名稱 -->
      <div class="mb-3">
        <p class="text-caption text-gray-600 mb-1">{{ vote.activityCode }}</p>
        <h3 class="text-h6 font-weight-bold mb-2">{{ vote.activityName }}</h3>
      </div>

      <!-- 投票主題 -->
      <p class="text-body2 mb-3">{{ vote.voteTitle }}</p>

      <!-- 投票描述 -->
      <p v-if="vote.voteDescription" class="text-caption text-gray-700 mb-4">
        {{ truncateText(vote.voteDescription, 100) }}
      </p>

      <!-- 投票信息 -->
      <v-divider class="my-3" />
      <div class="text-caption text-gray-600">
        <div class="mb-2">
          <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
          <span>{{ formatDateTime(vote.startTime) }} ~ {{ formatDateTime(vote.endTime) }}</span>
        </div>
        <div class="mb-2">
          <v-icon size="16" class="mr-1">mdi-ballot-multiple</v-icon>
          <span>{{ voteTypeLabel }}</span>
        </div>
        <div v-if="vote.allowMultiple" class="mb-2">
          <v-icon size="16" class="mr-1">mdi-checkbox-multiple-marked</v-icon>
          <span>{{ t('vote.multipleChoice') }}</span>
        </div>
        <div v-if="vote.allowAnonymous" class="mb-2">
          <v-icon size="16" class="mr-1">mdi-incognito</v-icon>
          <span>{{ t('vote.anonymous') }}</span>
        </div>
      </div>
    </v-card-text>

    <!-- 操作按鈕 -->
    <v-card-actions class="pt-0">
      <v-spacer />
      <v-btn
        v-if="isVotingAvailable && !hasVoted"
        color="primary"
        variant="elevated"
        size="small"
        @click="$emit('vote', vote)"
      >
        {{ t('vote.vote') }}
      </v-btn>
      <v-btn
        v-else-if="hasVoted"
        color="success"
        variant="tonal"
        size="small"
        @click="$emit('view-results', vote)"
      >
        {{ t('vote.voted') }}
      </v-btn>
      <v-btn
        v-if="vote.voteStatus === 'Closed' || (vote.resultsPublic && !isVotingAvailable)"
        color="secondary"
        variant="text"
        size="small"
        @click="$emit('view-results', vote)"
      >
        {{ t('vote.viewResults') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  vote: {
    type: Object,
    required: true
  },
  hasVoted: {
    type: Boolean,
    default: false
  }
})

defineEmits(['vote', 'view-results'])

// Computed
const statusColor = computed(() => {
  const status = props.vote.voteStatus
  const colorMap = {
    'Draft': 'grey',
    'Active': 'blue',
    'Closed': 'orange',
    'Cancelled': 'red'
  }
  return colorMap[status] || 'grey'
})

const statusLabel = computed(() => {
  const statusMap = {
    'Draft': t('vote.statusDraft'),
    'Active': t('vote.statusActive'),
    'Closed': t('vote.statusClosed'),
    'Cancelled': t('vote.statusCancelled')
  }
  return statusMap[props.vote.voteStatus] || ''
})

const voteTypeLabel = computed(() => {
  const typeMap = {
    'general': t('vote.typeGeneral'),
    'rating': t('vote.typeRating'),
    'poll': t('vote.typePoll')
  }
  return typeMap[props.vote.voteType] || props.vote.voteType
})

const isVotingAvailable = computed(() => {
  const now = new Date()
  const startTime = new Date(props.vote.startTime)
  const endTime = new Date(props.vote.endTime)
  return props.vote.voteStatus === 'Active' && now >= startTime && now <= endTime
})

// 方法
const formatDateTime = (dateTime) => {
  const date = new Date(dateTime)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  return text
}
</script>

<style scoped>
.vote-card {
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
}

.vote-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.position-absolute {
  position: absolute;
}

.top-2 {
  top: 8px;
}

.right-2 {
  right: 8px;
}

.text-gray-600 {
  color: rgba(0, 0, 0, 0.6);
}

.text-gray-700 {
  color: rgba(0, 0, 0, 0.54);
}

.h-100 {
  height: 100%;
}

.d-flex {
  display: flex;
}

.flex-column {
  flex-direction: column;
}

.flex-grow-1 {
  flex-grow: 1;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.mr-1 {
  margin-right: 0.25rem;
}

.pt-0 {
  padding-top: 0;
}
</style>
