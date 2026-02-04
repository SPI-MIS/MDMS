import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useVoteStore = defineStore('vote', () => {
  // 狀態
  const votes = ref([])
  const currentVote = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const activeVotes = computed(() => votes.value.filter(v => v.voteStatus === 'Active'))
  const draftVotes = computed(() => votes.value.filter(v => v.voteStatus === 'Draft'))
  const closedVotes = computed(() => votes.value.filter(v => v.voteStatus === 'Closed'))

  // 方法：查詢投票列表
  const fetchVotes = async (query = '', state = '') => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (query) params.append('q', query)
      if (state) params.append('state', state)

      const response = await fetch(`/api/votes?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch votes')

      const data = await response.json()
      votes.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error fetching votes:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：查詢單個投票
  const fetchVote = async (voteId) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/votes/${voteId}`)
      if (!response.ok) throw new Error('Failed to fetch vote')

      const data = await response.json()
      currentVote.value = data
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error fetching vote:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：建立投票
  const createVote = async (voteData) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      })

      if (!response.ok) throw new Error('Failed to create vote')

      const data = await response.json()
      currentVote.value = { ...voteData, voteId: data.voteId }
      votes.value.push(currentVote.value)
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error creating vote:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：更新投票
  const updateVote = async (voteId, voteData) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/votes/${voteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      })

      if (!response.ok) throw new Error('Failed to update vote')

      const index = votes.value.findIndex(v => v.voteId === voteId)
      if (index > -1) {
        votes.value[index] = { ...votes.value[index], ...voteData }
      }
      currentVote.value = { ...currentVote.value, ...voteData }
      return await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error updating vote:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：刪除投票
  const deleteVote = async (voteId) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/votes/${voteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete vote')

      votes.value = votes.value.filter(v => v.voteId !== voteId)
      if (currentVote.value?.voteId === voteId) {
        currentVote.value = null
      }
      return await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error deleting vote:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：提交投票（員工）
  const submitVote = async (voteData) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/votes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteData)
      })

      if (!response.ok) throw new Error('Failed to submit vote')

      return await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error submitting vote:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：檢查用戶是否已投票
  const checkUserVoted = async (voteId, userId) => {
    try {
      const response = await fetch(
        `/api/votes/${voteId}/check-voted?userId=${encodeURIComponent(userId)}`
      )
      if (!response.ok) throw new Error('Failed to check vote status')

      const data = await response.json()
      return data.hasVoted
    } catch (err) {
      console.error('Error checking vote status:', err)
      return false
    }
  }

  // 方法：獲取投票結果
  const fetchVoteResults = async (voteId) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`/api/votes/${voteId}/results`)
      if (!response.ok) throw new Error('Failed to fetch results')

      const data = await response.json()
      const voteIndex = votes.value.findIndex(v => v.voteId === voteId)
      if (voteIndex > -1) {
        votes.value[voteIndex] = {
          ...votes.value[voteIndex],
          ...data
        }
        currentVote.value = votes.value[voteIndex]
      }
      return data
    } catch (err) {
      error.value = err.message
      console.error('Error fetching results:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 方法：重置
  const reset = () => {
    votes.value = []
    currentVote.value = null
    error.value = null
  }

  return {
    // 狀態
    votes,
    currentVote,
    loading,
    error,
    // Computed
    activeVotes,
    draftVotes,
    closedVotes,
    // 方法
    fetchVotes,
    fetchVote,
    createVote,
    updateVote,
    deleteVote,
    submitVote,
    checkUserVoted,
    fetchVoteResults,
    reset
  }
})
