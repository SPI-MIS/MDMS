<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <!-- 標題 -->
    <!-- <v-card class="mb-4">
      <v-card-title class="text-h5">{{ t('vote.adminPanel') }}</v-card-title>
      <v-card-subtitle>{{ t('vote.manageVotingActivities') }}</v-card-subtitle>
    </v-card> -->

    <!-- 工具列 -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchKeyword"
              :label="t('common.search')"
              :append-inner-icon="'mdi-magnify'"
              clearable
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center justify-end">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              variant="elevated"
              @click="onNewVote"
            >
              {{ t('vote.createNewVote') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

     <!-- 統計卡片 -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card class="text-center pa-4">
          <p class="text-caption text-gray-600 mb-2">{{ t('vote.totalVotes') }}</p>
          <p class="text-h3 font-weight-bold text-primary mb-2">{{ statistics.totalVotes }}</p>
          <p class="text-caption">{{ statistics.activeVotes }} {{ t('vote.statusActive') }}</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="text-center pa-4">
          <p class="text-caption text-gray-600 mb-2">{{ t('vote.totalParticipants') }}</p>
          <p class="text-h3 font-weight-bold text-success mb-2">{{ statistics.totalParticipants }}</p>
          <p class="text-caption">{{ ((statistics.totalVotes / statistics.totalParticipants) * 100).toFixed(1) }}% {{ t('vote.participationRate') }}</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="text-center pa-4">
          <p class="text-caption text-gray-600 mb-2">{{ t('vote.completedVotes') }}</p>
          <p class="text-h3 font-weight-bold text-warning mb-2">{{ statistics.closedVotes }}</p>
          <p class="text-caption">{{ statistics.cancelledVotes }} {{ t('vote.cancelled') }}</p>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card class="text-center pa-4">
          <p class="text-caption text-gray-600 mb-2">{{ t('vote.draftVotes') }}</p>
          <p class="text-h3 font-weight-bold text-info mb-2">{{ statistics.draftVotes }}</p>
          <p class="text-caption">{{ t('vote.pendingActivation') }}</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- 狀態說明（小字） -->
    <v-card class="mb-4 pa-3">
      <div class="text-caption text-gray-600">
        <span v-for="(s, idx) in statusDescriptions" :key="s.key">
          <v-chip :color="getStatusColor(s.key)" size="x-small" text-color="white" class="mr-1 mb-1">{{ getStatusLabel(s.key) }}</v-chip>
          <span class="mr-3">{{ t(s.descKey) }}</span>
        </span>
      </div>
    </v-card>

    <!-- 投票列表 -->
    <v-card>
      <v-table>
        <thead>
          <tr>
            <th>{{ t('vote.activityName') }}</th>
            <th>{{ t('vote.voteTitle') }}</th>
            <th>{{ t('common.status') }}</th>
            <th>{{ t('vote.startTime') }}</th>
            <th>{{ t('vote.endTime') }}</th>
            <th>{{ t('vote.participation') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vote in filteredVotes" :key="vote.voteId">
            <td>{{ vote.activityName }}</td>
            <td>{{ vote.voteTitle }}</td>
            <td>
              <v-chip
                :color="getStatusColor(vote)"
                size="small"
                text-color="white"
              >
                {{ getStatusLabel(vote) }}
              </v-chip>
            </td>
            <td>{{ formatDateTime(vote.startTime) }}</td>
            <td>{{ formatDateTime(vote.endTime) }}</td>
            <td>
              <span v-if="voteStatistics[vote.voteId]">
                {{ voteStatistics[vote.voteId].totalVotes }} / {{ voteStatistics[vote.voteId].totalParticipants }}
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <v-btn
                color="primary"
                icon="mdi-eye"
                size="x-small"
                variant="text"
                @click="onViewDetails(vote)"
              />
              <v-btn
                color="info"
                icon="mdi-chart-bar"
                size="x-small"
                variant="text"
                @click="onViewStatistics(vote)"
              />
              <v-btn
                color="warning"
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                :disabled="vote.voteStatus !== 'Draft'"
                @click="onEditVote(vote)"
              />
              <v-btn
                color="success"
                icon="mdi-check"
                size="x-small"
                variant="text"
                :disabled="vote.voteStatus !== 'Draft'"
                @click="onActivateVote(vote)"
              />
              <v-btn
                color="error"
                icon="mdi-delete"
                size="x-small"
                variant="text"
                :disabled="vote.voteStatus !== 'Draft'"
                @click="onDeleteVote(vote)"
              />
            </td>
          </tr>
          <tr v-if="filteredVotes.length === 0">
            <td colspan="7" class="text-center py-8">
              <v-icon size="48" class="mb-2">mdi-ballot-outline</v-icon>
              <p class="text-subtitle-1">{{ t('vote.noVotes') }}</p>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- 詳情對話框 -->
    <VoteDetailDialog
      v-model="detailDialog"
      :vote="selectedVote"
      @close="detailDialog = false"
    />

    <!-- 統計對話框 -->
    <VoteStatisticsDialog
      v-model="statisticsDialog"
      :vote="selectedVote"
      :statistics="voteStatistics[selectedVote?.voteId]"
      @close="statisticsDialog = false"
    />

    <!-- 啟動確認對話框 -->
    <v-dialog v-model="activateDialog" max-width="400">
      <v-card>
        <v-card-title>{{ t('vote.confirmActivate') }}</v-card-title>
        <v-card-text>
          {{ t('vote.activateVoteMessage', { name: selectedVote?.activityName }) }}
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="activateDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="success"
            variant="elevated"
            @click="confirmActivate"
          >
            {{ t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 載入狀態 -->
    <v-overlay v-if="voteStore.loading" model-value opacity="0.5">
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useVoteStore } from '@/stores/vote'
import { formatDateTime, deriveEffectiveStatus } from '@/utils/time'
import VoteDetailDialog from '@/components/vote/VoteDetailDialog.vue'
import VoteStatisticsDialog from '@/components/vote/VoteStatisticsDialog.vue'

const { t } = useI18n()
const router = useRouter()
const voteStore = useVoteStore()

// 狀態
const searchKeyword = ref('')
const detailDialog = ref(false)
const statisticsDialog = ref(false)
const activateDialog = ref(false)
const selectedVote = ref(null)
const voteStatistics = ref({})
const isLoadingVotes = ref(false)  // 防止重複加載

// Computed
const filteredVotes = computed(() => {
  if (!searchKeyword.value) {
    return voteStore.votes
  }

  const keyword = searchKeyword.value.toLowerCase()
  return voteStore.votes.filter(v =>
    v.activityName.toLowerCase().includes(keyword) ||
    v.voteTitle.toLowerCase().includes(keyword)
  )
})

const statistics = computed(() => {
  const votes = voteStore.votes || []
  const totalVotes = votes.length

  const counts = {
    'draft.unpublished': 0,
    'draft.pending': 0,
    'notStarted': 0,
    'inProgress': 0,
    'ended': 0,
    'cancelled': 0
  }

  for (const v of votes) {
    const s = deriveEffectiveStatus(v.voteStatus, v.startTime, v.endTime)
    if (counts[s] !== undefined) counts[s]++
  }

  let totalParticipants = 0
  for (const stat of Object.values(voteStatistics.value)) {
    if (stat && stat.totalParticipants) {
      totalParticipants += stat.totalParticipants
    }
  }

  return {
    totalVotes,
    activeVotes: counts['inProgress'],
    closedVotes: counts['ended'],
    cancelledVotes: counts['cancelled'],
    draftVotes: counts['draft.unpublished'] + counts['draft.pending'],
    totalParticipants
  }
})

// 方法
// 使用共用的 formatDateTime（由 '@/utils/time' 提供）


// 使用共用工具：parseDateTimeSafe/deriveEffectiveStatus（實作置於 '@/utils/time'）

const getStatusColor = (voteOrStatus) => {
  const status = typeof voteOrStatus === 'object'
    ? deriveEffectiveStatus(voteOrStatus.voteStatus, voteOrStatus.startTime, voteOrStatus.endTime)
    : voteOrStatus

  const colorMap = {
    'draft.unpublished': 'grey',
    'draft.pending': 'info',
    'notStarted': 'blue',
    'inProgress': 'success',
    'ended': 'orange',
    'cancelled': 'red'
  }
  return colorMap[status] || 'grey'
}

const getStatusLabel = (voteOrStatus) => {
  const status = typeof voteOrStatus === 'object'
    ? deriveEffectiveStatus(voteOrStatus.voteStatus, voteOrStatus.startTime, voteOrStatus.endTime)
    : voteOrStatus

  const statusMap = {
    'draft.unpublished': t('vote.statusDraftUnpublished'),
    'draft.pending': t('vote.statusDraftPending'),
    'notStarted': t('vote.notStarted'),
    'inProgress': t('vote.statusActive'),
    'ended': t('vote.statusClosed'),
    'cancelled': t('vote.statusCancelled')
  }
  return statusMap[status] || ''
}

// 狀態說明清單（供 Template 顯示）
const statusDescriptions = [
  { key: 'draft.unpublished', descKey: 'vote.statusDescDraftUnpublished' },
  { key: 'draft.pending', descKey: 'vote.statusDescDraftPending' },
  { key: 'notStarted', descKey: 'vote.statusDescNotStarted' },
  { key: 'inProgress', descKey: 'vote.statusDescInProgress' },
  { key: 'ended', descKey: 'vote.statusDescEnded' }
]

const onNewVote = () => {
  router.push('/votes')
}

const onViewDetails = (vote) => {
  selectedVote.value = vote
  detailDialog.value = true
}

const onViewStatistics = async (vote) => {
  try {
    const results = await voteStore.fetchVoteResults(vote.voteId)
    voteStatistics.value[vote.voteId] = results
    // 合并 optionDetails 到 selectedVote
    selectedVote.value = {
      ...vote,
      optionDetails: results.optionDetails
    }
    console.log('[VoteAdminView] Opening statistics dialog with data:', {
      vote: selectedVote.value,
      statistics: voteStatistics.value[vote.voteId]
    })
    statisticsDialog.value = true
  } catch (error) {
    console.error('Error loading statistics:', error)
    alert(t('common.error'))
  }
}

const onEditVote = (vote) => {
  router.push(`/vote-edit/${vote.voteId}`)
}

const onActivateVote = (vote) => {
  selectedVote.value = vote
  activateDialog.value = true
}

const confirmActivate = async () => {
  try {
    await voteStore.updateVote(selectedVote.value.voteId, {
      ...selectedVote.value,
      voteStatus: 'Active'
    })
    activateDialog.value = false
    alert(t('vote.voteActivated'))
    await loadVotes()
  } catch (error) {
    console.error('Error activating vote:', error)
    alert(t('common.error'))
  }
}

const onDeleteVote = async (vote) => {
  if (!confirm(t('vote.confirmDelete'))) return

  try {
    await voteStore.deleteVote(vote.voteId)
    alert(t('common.deleteSuccess'))
    await loadVotes()
  } catch (error) {
    console.error('Error deleting vote:', error)
    alert(t('common.deleteFailed'))
  }
}

const loadVotes = async () => {
  // 防止重複加載
  if (isLoadingVotes.value) {
    console.log('[VoteAdminView] Already loading, skipping...')
    return
  }
  
  try {
    isLoadingVotes.value = true
    console.log('[VoteAdminView] Loading votes...')
    await voteStore.fetchVotes()
    console.log('[VoteAdminView] Loaded', voteStore.votes.length, 'votes')
    
    // 先清空統計數據以避免舊數據
    voteStatistics.value = {}
    
    // 批量加載統計資料（使用 Promise.all 並行加載）
    const statisticsPromises = voteStore.votes.map(async (vote) => {
      try {
        console.log('[VoteAdminView] Fetching results for', vote.voteId)
        const results = await voteStore.fetchVoteResults(vote.voteId)
        console.log('[VoteAdminView] Results for', vote.voteId, ':', results)
        return { voteId: vote.voteId, results }
      } catch (error) {
        console.error(`Error loading statistics for ${vote.voteId}:`, error)
        return null
      }
    })
    
    // 等待所有統計數據加載完成，然後一次性更新
    const allResults = await Promise.all(statisticsPromises)
    
    // 一次性更新所有統計數據（只觸發一次響應性更新）
    const newStatistics = {}
    allResults.forEach(item => {
      if (item) {
        newStatistics[item.voteId] = item.results
      }
    })
    Object.assign(voteStatistics.value, newStatistics)
    
    console.log('[VoteAdminView] Final voteStatistics:', voteStatistics.value)
    console.log('[VoteAdminView] Total participants:', statistics.value.totalParticipants)
  } catch (error) {
    console.error('Error loading votes:', error)
  } finally {
    isLoadingVotes.value = false
    console.log('[VoteAdminView] Loading completed')
  }
}

// 初始化
onMounted(async () => {
  console.log('[VoteAdminView] onMounted called')
  await loadVotes()
  console.log('[VoteAdminView] onMounted finished')
})
</script>

<style scoped>
.d-flex {
  display: flex;
}

.align-center {
  align-items: center;
}

.justify-end {
  justify-content: flex-end;
}
</style>
