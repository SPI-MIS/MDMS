<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <!-- 標題 -->
    <v-card class="mb-4">
      <v-card-title class="text-h5">{{ t('vote.itManagementPanel') }}</v-card-title>
      <v-card-subtitle>{{ t('vote.systemMonitoringAndStatistics') }}</v-card-subtitle>
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

    <!-- 分頁標籤 -->
    <v-card>
      <v-tabs v-model="activeTab" class="bg-white">
        <v-tab value="overview">{{ t('vote.overview') }}</v-tab>
        <v-tab value="users">{{ t('vote.userManagement') }}</v-tab>
        <v-tab value="logs">{{ t('vote.systemLogs') }}</v-tab>
        <v-tab value="settings">{{ t('vote.systemSettings') }}</v-tab>
      </v-tabs>

      <!-- 概況標籤 -->
      <v-window v-model="activeTab">
        <!-- 概況 -->
        <v-window-item value="overview">
          <v-card-text class="py-6">
            <!-- 活動狀態分佈圖表 -->
            <div class="mb-8">
              <h3 class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.voteStatusDistribution') }}</h3>
              <v-row>
                <v-col cols="12" md="6">
                  <v-card class="pa-4">
                    <div class="text-center mb-4">
                      <p class="text-subtitle-2 font-weight-bold">{{ t('vote.statusCount') }}</p>
                    </div>
                    <v-table dense>
                      <thead>
                        <tr>
                          <th>{{ t('vote.status') }}</th>
                          <th class="text-right">{{ t('vote.count') }}</th>
                          <th class="text-right">{{ t('vote.percentage') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in statusDistribution" :key="item.status">
                          <td>
                            <v-chip
                              :color="getStatusColor(item.status)"
                              size="small"
                              text-color="white"
                            >
                              {{ getStatusLabel(item.status) }}
                            </v-chip>
                          </td> 
                          <td class="text-right font-weight-bold">{{ item.count }}</td>
                          <td class="text-right">{{ item.percentage }}%</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card class="pa-4">
                    <div class="text-center mb-4">
                      <p class="text-subtitle-2 font-weight-bold">{{ t('vote.participationStatistics') }}</p>
                    </div>
                    <v-table dense>
                      <thead>
                        <tr>
                          <th>{{ t('vote.participationType') }}</th>
                          <th class="text-right">{{ t('vote.count') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{{ t('vote.singleChoice') }}</td>
                          <td class="text-right font-weight-bold">{{ voteTypeStats.singleChoice }}</td>
                        </tr>
                        <tr>
                          <td>{{ t('vote.multipleChoice') }}</td>
                          <td class="text-right font-weight-bold">{{ voteTypeStats.multipleChoice }}</td>
                        </tr>
                        <tr>
                          <td>{{ t('vote.anonymous') }}</td>
                          <td class="text-right font-weight-bold">{{ voteTypeStats.anonymous }}</td>
                        </tr>
                        <tr>
                          <td>{{ t('vote.public') }}</td>
                          <td class="text-right font-weight-bold">{{ voteTypeStats.public }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- 最近投票活動 -->
            <div class="mb-8">
              <h3 class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.recentActivities') }}</h3>
              <v-table dense>
                <thead>
                  <tr>
                    <th>{{ t('vote.activityName') }}</th>
                    <th>{{ t('vote.status') }}</th>
                    <th class="text-right">{{ t('vote.participants') }}</th>
                    <th class="text-right">{{ t('vote.votes') }}</th>
                    <th>{{ t('vote.startTime') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="vote in recentVotes" :key="vote.voteId">
                    <td>{{ vote.activityName }}</td>
                    <td>
                      <v-chip
                        :color="getStatusColor(vote)"
                        size="small"
                        text-color="white"
                      >
                        {{ getStatusLabel(vote) }}
                      </v-chip>
                    </td>
                    <td class="text-right">{{ vote.participantCount }}</td>
                    <td class="text-right">{{ vote.voteCount }}</td>
                    <td>{{ formatDateTime(vote.startTime) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card-text>
        </v-window-item>

        <!-- 用戶管理 -->
        <v-window-item value="users">
          <v-card-text class="py-6">
            <h3 class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.registeredUsers') }}</h3>
            <v-table dense>
              <thead>
                <tr>
                  <th>{{ t('vote.userId') }}</th>
                  <th>{{ t('vote.votedVoteCount') }}</th>
                  <th>{{ t('vote.firstVoteTime') }}</th>
                  <th>{{ t('vote.lastVoteTime') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in topVoters" :key="user.userId">
                  <td>{{ user.userId }}</td>
                  <td class="font-weight-bold">{{ user.voteCount }}</td>
                  <td>{{ formatDateTime(user.firstVoteTime) }}</td>
                  <td>{{ formatDateTime(user.lastVoteTime) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-window-item>

        <!-- 系統日誌 -->
        <v-window-item value="logs">
          <v-card-text class="py-6">
            <div class="mb-4">
              <v-text-field
                v-model="logSearch"
                :label="t('common.search')"
                :append-inner-icon="'mdi-magnify'"
                clearable
                variant="outlined"
              />
            </div>
            <v-table dense>
              <thead>
                <tr>
                  <th>{{ t('vote.timestamp') }}</th>
                  <th>{{ t('vote.action') }}</th>
                  <th>{{ t('vote.user') }}</th>
                  <th>{{ t('vote.details') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in filteredLogs" :key="log.logId">
                  <td>{{ formatDateTime(log.createdAt) }}</td>
                  <td>
                    <v-chip size="small" :color="getActionColor(log.action)">
                      {{ log.action }}
                    </v-chip>
                  </td>
                  <td>{{ log.userId }}</td>
                  <td class="text-caption">{{ log.details }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-window-item>

        <!-- 系統設定 -->
        <v-window-item value="settings">
          <v-card-text class="py-6">
            <h3 class="text-subtitle-2 font-weight-bold mb-4">{{ t('vote.systemConfig') }}</h3>
            <v-row>
              <v-col cols="12" md="6">
                <v-card class="pa-4 mb-4">
                  <p class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.voteSettings') }}</p>
                  <v-checkbox
                    v-model="systemSettings.allowAnonymous"
                    :label="t('vote.allowAnonymousGlobally')"
                  />
                  <v-checkbox
                    v-model="systemSettings.requireApproval"
                    :label="t('vote.requireApprovalBeforeStart')"
                  />
                  <v-checkbox
                    v-model="systemSettings.allowDuplicateVote"
                    :label="t('vote.allowDuplicateVote')"
                  />
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card class="pa-4 mb-4">
                  <p class="text-subtitle-2 font-weight-bold mb-3">{{ t('vote.notificationSettings') }}</p>
                  <v-checkbox
                    v-model="systemSettings.notifyVoteStart"
                    :label="t('vote.notifyWhenVoteStarts')"
                  />
                  <v-checkbox
                    v-model="systemSettings.notifyVoteEnd"
                    :label="t('vote.notifyWhenVoteEnds')"
                  />
                  <v-checkbox
                    v-model="systemSettings.sendReminderEmail"
                    :label="t('vote.sendReminderEmail')"
                  />
                </v-card>
              </v-col>
            </v-row>
            <v-card-actions class="justify-end">
              <v-btn variant="text" @click="resetSettings">
                {{ t('common.cancel') }}
              </v-btn>
              <v-btn color="primary" variant="elevated" @click="saveSettings">
                {{ t('common.save') }}
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- 載入狀態 -->
    <v-overlay v-if="loading" model-value opacity="0.5">
      <v-progress-circular indeterminate size="64" color="primary" />
    </v-overlay>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVoteStore } from '@/stores/vote'
import { formatDateTime, deriveEffectiveStatus } from '@/utils/time'

const { t } = useI18n()
const voteStore = useVoteStore()

// 狀態
const activeTab = ref('overview')
const loading = ref(false)
const logSearch = ref('')

const statistics = ref({
  totalVotes: 0,
  activeVotes: 0,
  closedVotes: 0,
  cancelledVotes: 0,
  draftVotes: 0,
  totalParticipants: 0
})

const statusDistribution = ref([])
const voteTypeStats = ref({
  singleChoice: 0,
  multipleChoice: 0,
  anonymous: 0,
  public: 0
})

const recentVotes = ref([])
const topVoters = ref([])
const systemLogs = ref([])

const systemSettings = ref({
  allowAnonymous: true,
  requireApproval: false,
  allowDuplicateVote: false,
  notifyVoteStart: true,
  notifyVoteEnd: true,
  sendReminderEmail: false
})

// Computed
const filteredLogs = computed(() => {
  if (!logSearch.value) {
    return systemLogs.value
  }

  const keyword = logSearch.value.toLowerCase()
  return systemLogs.value.filter(log =>
    log.action.toLowerCase().includes(keyword) ||
    log.userId.toLowerCase().includes(keyword) ||
    log.details.toLowerCase().includes(keyword)
  )
})

// 方法

// 使用共用工具：parseDateTimeSafe/deriveEffectiveStatus（實作置於 '@/utils/time'）

const getStatusColor = (voteOrStatus) => {
  const status = typeof voteOrStatus === 'object'
    ? deriveEffectiveStatus(voteOrStatus.voteStatus, voteOrStatus.startTime, voteOrStatus.endTime)
    : voteOrStatus

  const colorMap = {
    'draft.unpublished': 'grey',   // 未發布（草稿）
    'draft.pending': 'info',       // 待發布（草稿）
    'notStarted': 'blue',          // 尚未開始
    'inProgress': 'success',       // 進行中
    'ended': 'orange',             // 已結束
    'cancelled': 'red'             // 已取消
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

const getActionColor = (action) => {
  const colorMap = {
    'CREATE': 'primary',
    'UPDATE': 'warning',
    'DELETE': 'error',
    'SUBMIT': 'success',
    'ACTIVATE': 'info'
  }
  return colorMap[action] || 'default'
}

const loadStatistics = async () => {
  loading.value = true
  try {
    await voteStore.fetchVotes()

    // 計算統計數據（根據衍生狀態）
    const votes = voteStore.votes || []

    // 對每個 vote 計算有效狀態並統計
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

    statistics.value = {
      totalVotes: votes.length,
      activeVotes: counts['inProgress'],
      closedVotes: counts['ended'],
      cancelledVotes: counts['cancelled'],
      draftVotes: counts['draft.unpublished'] + counts['draft.pending'],
      totalParticipants: votes.reduce((sum, v) => sum + (v.participantCount || 0), 0)
    }

    // 狀態分佈（依使用者指定的五種狀態）
    statusDistribution.value = [
      { status: 'draft.unpublished', count: counts['draft.unpublished'] },
      { status: 'draft.pending', count: counts['draft.pending'] },
      { status: 'notStarted', count: counts['notStarted'] },
      { status: 'inProgress', count: counts['inProgress'] },
      { status: 'ended', count: counts['ended'] },
      { status: 'cancelled', count: counts['cancelled'] }
    ].map(item => ({
      ...item,
      percentage: statistics.value.totalVotes > 0 ? Math.round((item.count / statistics.value.totalVotes) * 100) : 0
    }))

    // 投票類型統計
    voteTypeStats.value = {
      singleChoice: votes.filter(v => !v.allowMultiple).length,
      multipleChoice: votes.filter(v => v.allowMultiple).length,
      anonymous: votes.filter(v => v.allowAnonymous).length,
      public: votes.filter(v => v.resultsPublic).length
    }

    // 最近的活動
    recentVotes.value = votes.slice(0, 10).map(v => ({
      ...v,
      participantCount: v.participantCount || 0,
      voteCount: 0
    }))

    // 模擬日誌數據
    systemLogs.value = votes.slice(0, 5).map((v, i) => ({
      logId: `log_${i}`,
      timestamp: v.createdAt,
      action: 'CREATE',
      userId: v.createdBy,
      details: `Created vote: ${v.activityName}`,
      createdAt: v.createdAt
    }))

    // 用戶管理（連動資料庫）
    try {
      const userStatsResponse = await fetch(`/api/votes/user-stats?limit=50&_t=${Date.now()}`)
      if (!userStatsResponse.ok) throw new Error('Failed to fetch user stats')
      const userStats = await userStatsResponse.json()
      topVoters.value = userStats
    } catch (userStatsError) {
      console.error('Error loading user stats:', userStatsError)
      topVoters.value = []
    }
  } catch (error) {
    console.error('Error loading statistics:', error)
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  try {
    // 這裡可以調用 API 保存設定
    alert(t('common.saveSuccess'))
  } catch (error) {
    console.error('Error saving settings:', error)
    alert(t('common.error'))
  }
}

const resetSettings = () => {
  // 重置為初始值
  systemSettings.value = {
    allowAnonymous: true,
    requireApproval: false,
    allowDuplicateVote: false,
    notifyVoteStart: true,
    notifyVoteEnd: true,
    sendReminderEmail: false
  }
}

// 初始化
onMounted(async () => {
  await loadStatistics()
})
</script>

<style scoped>
.text-gray-600 {
  color: rgba(0, 0, 0, 0.6);
}

.text-primary {
  color: #1976d2;
}

.text-success {
  color: #4caf50;
}

.text-warning {
  color: #ff9800;
}

.text-info {
  color: #2196f3;
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

.mb-8 {
  margin-bottom: 2rem;
}

.pa-4 {
  padding: 1rem;
}

.py-6 {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.font-weight-bold {
  font-weight: 500;
}
</style>
