<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <!-- 標題 -->
    <v-card class="mb-4">
      <v-card-title class="text-h5">{{ t('vote.employeeVoting') }}</v-card-title>
      <v-card-subtitle>{{ t('vote.pleaseVoteForActiveActivities') }}</v-card-subtitle>
    </v-card>

    <!-- 篩選欄 -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="filter.status"
              :label="t('common.status')"
              :items="statusFilterItems"
              item-title="title"
              item-value="value"
              clearable
              variant="outlined"
              @update:model-value="onFilterChange"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchKeyword"
              :label="t('common.search')"
              :append-inner-icon="'mdi-magnify'"
              clearable
              variant="outlined"
              @update:model-value="onFilterChange"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 投票活動列表 -->
    <v-row>
      <v-col v-for="vote in filteredVotes" :key="vote.voteId" cols="12" md="6" lg="4">
        <VoteCard
          :vote="vote"
          :has-voted="voteCardMap[vote.voteId]"
          :is-loading="isCheckingVoteStatus"
          @vote="onOpenVoteDialog"
          @view-results="onViewResults"
        />
      </v-col>
    </v-row>

    <!-- 空狀態 -->
    <v-card v-if="filteredVotes.length === 0" class="text-center py-12">
      <v-card-text>
        <v-icon size="64" class="mb-4">mdi-ballot-outline</v-icon>
        <p class="text-subtitle-1">{{ t('vote.noActiveVotes') }}</p>
      </v-card-text>
    </v-card>

    <!-- 投票對話框 -->
    <VoteDialog
      v-model="voteDialog"
      :vote="selectedVote"
      @submit="onSubmitVote"
      @close="voteDialog = false"
    />

    <!-- 結果檢視對話框 -->
    <VoteResultsDialog
      v-model="resultsDialog"
      :vote="selectedVote"
      @close="resultsDialog = false"
    />

    <!-- 投票成功對話框 -->
    <v-dialog v-model="successDialog" max-width="400">
      <v-card>
        <v-card-title class="text-center">{{ t('vote.voteSuccess') }}</v-card-title>
        <v-card-text class="text-center py-6">
          <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
          <p class="text-subtitle-1 mb-2">{{ t('vote.voteSubmitted') }}</p>
          <p class="text-caption text-gray-700">{{ t('vote.canViewResultsAnytime') }}</p>
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn color="primary" variant="elevated" @click="successDialog = false">
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
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVoteStore } from '@/stores/vote'
import { useAuth } from '@/composables/useAuth'
import { deriveEffectiveStatus } from '@/utils/time'
import VoteCard from '@/components/vote/VoteCard.vue'
import VoteDialog from '@/components/vote/VoteDialog.vue'
import VoteResultsDialog from '@/components/vote/VoteResultsDialog.vue'

const { t } = useI18n()
const voteStore = useVoteStore()
const { userId } = useAuth()

// 狀態
const searchKeyword = ref('')
const voteDialog = ref(false)
const resultsDialog = ref(false)
const successDialog = ref(false)
const selectedVote = ref(null)
const hasVotedMap = ref({})
const isCheckingVoteStatus = ref(true)  // 追蹤是否正在檢查投票狀態

const filter = ref({
  status: 'inProgress'
})

const statusFilterItems = computed(() => [
  { value: 'inProgress', title: t('vote.statusActive') },
  { value: 'notStarted', title: t('vote.notStarted') },
  { value: 'ended', title: t('vote.statusClosed') }
])

// Computed
const filteredVotes = computed(() => {
  let result = voteStore.votes

  // 篩選狀態
  if (filter.value.status) {
    result = result.filter(v =>
      deriveEffectiveStatus(v.voteStatus, v.startTime, v.endTime) === filter.value.status
    )
  }

  // 篩選搜尋關鍵字
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(v =>
      v.activityName.toLowerCase().includes(keyword) ||
      v.voteTitle.toLowerCase().includes(keyword)
    )
  }

  return result
})

// 追蹤 hasVotedMap 的變化以觸發更新
const voteCardMap = computed(() => {
  const map = {}
  for (const vote of filteredVotes.value) {
    // 如果還在檢查狀態，預設使用 hasVotedMap 的值（可能是 false）
    // 如果已完成檢查，使用實際的已投票狀態
    map[vote.voteId] = hasVotedMap.value[vote.voteId] || false
  }
  return map
})

// 方法
const onFilterChange = () => {
  // 篩選已自動在 computed 中處理
}

const onOpenVoteDialog = async (vote) => {
  try {
    // 獲取完整的投票詳情（包括選項）
    const fullVote = await voteStore.fetchVote(vote.voteId)
    selectedVote.value = fullVote
    voteDialog.value = true
  } catch (error) {
    console.error('Error loading vote details:', error)
    alert(t('common.error'))
  }
}

const onSubmitVote = async (voteData) => {
  try {
    const result = await voteStore.submitVote(voteData)
    console.log('[Vote Submit Success]', result)
    
    const voteId = selectedVote.value.voteId
    
    // 投票成功後立即更新已投票狀態
    console.log(`[Setting hasVotedMap] voteId=${voteId} to true`)
    hasVotedMap.value[voteId] = true
    
    // 檢查更新是否已生效
    console.log(`[Verify hasVotedMap] voteId=${voteId} is now ${hasVotedMap.value[voteId]}`)
    console.log(`[voteCardMap] ${voteId} = ${voteCardMap.value[voteId]}`)
    
    voteDialog.value = false
    successDialog.value = true
    
    // 立即檢查投票狀態以與伺服器同步（不需要等待）
    console.log('[Calling checkUserVoteStatus immediately]')
    await checkUserVoteStatus()
    
    // 關閉成功對話框
    setTimeout(() => {
      successDialog.value = false
      console.log('[Success dialog closed]')
      console.log(`[Final state] hasVotedMap[${voteId}] = ${hasVotedMap.value[voteId]}`)
    }, 1500)
  } catch (error) {
    console.error('Error submitting vote:', error)
    // 處理特定錯誤訊息
    if (error.message.includes('already voted')) {
      alert(t('vote.alreadyVoted'))
      // 重新檢查投票狀態並更新 UI
      hasVotedMap.value[selectedVote.value.voteId] = true
      voteDialog.value = false
    } else {
      alert(error.message || t('common.error'))
    }
  }
}

const onViewResults = async (vote) => {
  selectedVote.value = vote
  await voteStore.fetchVoteResults(vote.voteId)
  resultsDialog.value = true
}

const checkUserVoteStatus = async () => {
  try {
    isCheckingVoteStatus.value = true
    console.log('[checkUserVoteStatus] Starting status check, userId:', userId.value)
    
    if (!userId.value) {
      console.warn('[checkUserVoteStatus] No userId found, cannot check status')
      return
    }

    console.log(`[checkUserVoteStatus] Checking status for ${voteStore.votes.length} votes`)
    
    // 收集所有投票狀態
    const newVotedStatus = {}
    
    for (const vote of voteStore.votes) {
      try {
        console.log(`[checkUserVoteStatus] Checking ${vote.voteId} for user ${userId.value}`)
        const hasVoted = await voteStore.checkUserVoted(vote.voteId, userId.value)
        console.log(`[checkUserVoted] ${vote.voteId}: ${hasVoted}`)
        newVotedStatus[vote.voteId] = hasVoted
      } catch (error) {
        console.error(`[checkUserVoteStatus] Error checking ${vote.voteId}:`, error)
      }
    }
    
    // 使用 Object.assign 確保 Vue 響應性
    console.log('[checkUserVoteStatus] Before assignment:', hasVotedMap.value)
    Object.assign(hasVotedMap.value, newVotedStatus)
    console.log('[checkUserVoteStatus] After assignment:', hasVotedMap.value)
    
    console.log('[checkUserVoteStatus] Complete. Final hasVotedMap:', hasVotedMap.value)
  } catch (error) {
    console.error('Error checking vote status:', error)
  } finally {
    isCheckingVoteStatus.value = false
    console.log('[checkUserVoteStatus] Status check finished, isCheckingVoteStatus:', isCheckingVoteStatus.value)
  }
}

// 監視 hasVotedMap 的變化以調試
watch(() => hasVotedMap.value, (newVal, oldVal) => {
  console.log('[hasVotedMap changed]', newVal)
}, { deep: true })

// 初始化
onMounted(async () => {
  try {
    console.log('[onMounted] Starting initialization, userId:', userId.value)
    await voteStore.fetchVotes()
    console.log('[onMounted] Votes fetched:', voteStore.votes.length)
    
    // 等待一下確保 userId 已經可用
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('[onMounted] userId value:', userId.value)
    
    await checkUserVoteStatus()
    console.log('[onMounted] Initialization complete')
  } catch (error) {
    console.error('Error loading votes:', error)
  }
})
</script>

<style scoped>
.text-gray-700 {
  color: rgba(0, 0, 0, 0.54);
}
</style>
