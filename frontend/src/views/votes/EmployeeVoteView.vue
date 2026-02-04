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
          :has-voted="hasVotedMap[vote.voteId]"
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
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVoteStore } from '@/stores/vote'
import VoteCard from '@/components/vote/VoteCard.vue'
import VoteDialog from '@/components/vote/VoteDialog.vue'
import VoteResultsDialog from '@/components/vote/VoteResultsDialog.vue'

const { t } = useI18n()
const voteStore = useVoteStore()

// 狀態
const searchKeyword = ref('')
const voteDialog = ref(false)
const resultsDialog = ref(false)
const successDialog = ref(false)
const selectedVote = ref(null)
const hasVotedMap = ref({})

const filter = ref({
  status: 'Active'
})

const statusFilterItems = [
  { value: 'Active', title: t('vote.statusActive') },
  { value: 'Closed', title: t('vote.statusClosed') },
  { value: null, title: t('common.all') }
]

// Computed
const filteredVotes = computed(() => {
  let result = voteStore.votes

  // 篩選狀態
  if (filter.value.status) {
    result = result.filter(v => v.voteStatus === filter.value.status)
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
    await voteStore.submitVote(voteData)
    hasVotedMap.value[selectedVote.value.voteId] = true
    voteDialog.value = false
    successDialog.value = true
  } catch (error) {
    console.error('Error submitting vote:', error)
    alert(t('common.error'))
  }
}

const onViewResults = async (vote) => {
  selectedVote.value = vote
  await voteStore.fetchVoteResults(vote.voteId)
  resultsDialog.value = true
}

const checkUserVoteStatus = async () => {
  try {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    for (const vote of voteStore.votes) {
      const hasVoted = await voteStore.checkUserVoted(vote.voteId, userId)
      hasVotedMap.value[vote.voteId] = hasVoted
    }
  } catch (error) {
    console.error('Error checking vote status:', error)
  }
}

// 初始化
onMounted(async () => {
  try {
    await voteStore.fetchVotes('', 'Active')
    await checkUserVoteStatus()
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
