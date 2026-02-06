<template>
  <v-container class="py-6" style="padding-top: var(--v-layout-top);">
    <v-card>
      <v-card-title class="text-h6">
        {{ isNew ? t('vote.createNewVote') : t('vote.editVote') }}
      </v-card-title>
      <v-divider />
      
      <v-card-text>
        <v-row class="g-2">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.activityName"
              :label="t('vote.activityName')"
              :rules="rules.activityName"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.activityCode"
              :label="t('vote.activityCode')"
              :rules="rules.activityCode"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.voteTitle"
              :label="t('vote.voteTitle')"
              :rules="rules.voteTitle"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
              multi-line
              rows="2"
            />
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="form.voteDescription"
              :label="t('vote.voteDescription')"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
              rows="4"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-select
              v-model="form.voteType"
              :label="t('vote.voteType')"
              :items="voteTypeItems"
              :rules="rules.voteType"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              item-title="title"
              item-value="value"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-select
              v-model="form.allowMultiple"
              :label="t('vote.allowMultiple')"
              :items="[
                { value: false, title: t('vote.singleChoice') },
                { value: true, title: t('vote.multipleChoice') }
              ]"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              item-title="title"
              item-value="value"
              variant="outlined"
            />
          </v-col>

          <!-- <v-col cols="12">
            <v-alert variant="outlined" density="comfortable" class="mb-4">
              <div><strong>Debug</strong> — 下列有助於確認選項資料是否正確載入：</div>
              <pre style="white-space:pre-wrap;">voteTypeItems: {{ JSON.stringify(voteTypeItems) }}</pre>
              <pre style="white-space:pre-wrap;">statusItems: {{ JSON.stringify(statusItems) }}</pre>
              <pre style="white-space:pre-wrap;">allowMultiple items: {{ JSON.stringify([{ value: false, title: t('vote.singleChoice') }, { value: true, title: t('vote.multipleChoice') }]) }}</pre>
            </v-alert>
          </v-col> -->

          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.startTime"
              :label="`${t('vote.startTime')} (台北時區)`"
              type="text"
              placeholder="YYYY-MM-DD HH:MM"
              :rules="rules.startTime"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
              @focus="focusStartTime"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.endTime"
              :label="`${t('vote.endTime')} (台北時區)`"
              type="text"
              placeholder="YYYY-MM-DD HH:MM"
              :rules="rules.endTime"
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
              @focus="focusEndTime"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-checkbox
              v-model="form.allowAnonymous"
              :label="t('vote.allowAnonymous')"
              :disabled="!isNew && form.voteStatus !== 'Draft'"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-checkbox
              v-model="form.resultsPublic"
              :label="t('vote.resultsPublic')"
              :disabled="!isNew && form.voteStatus !== 'Draft'"
            />
          </v-col>

          <v-col cols="12">
            <v-combobox
              v-model="form.participants"
              :label="t('vote.participants')"
              multiple
              chips
              :readonly="!isNew && form.voteStatus !== 'Draft'"
              variant="outlined"
            />
          </v-col>

          <v-divider class="my-4" />

          <v-col cols="12">
            <v-card elevation="0" class="mb-4">
              <v-card-title class="text-subtitle-2">{{ t('vote.options') }}</v-card-title>
              
              <v-card-text>
                <div v-for="(option, index) in form.voteOptions" :key="index" class="mb-3">
                  <v-row>
                    <v-col cols="11">
                      <v-text-field
                        v-model="form.voteOptions[index]"
                        :label="`${t('vote.option')} ${index + 1}`"
                        :readonly="!isNew && form.voteStatus !== 'Draft'"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="1" class="d-flex align-center">
                      <v-btn
                        v-if="isNew || form.voteStatus === 'Draft'"
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        @click="removeOption(index)"
                      />
                    </v-col>
                  </v-row>
                </div>

                <v-btn
                  v-if="isNew || form.voteStatus === 'Draft'"
                  prepend-icon="mdi-plus"
                  variant="tonal"
                  @click="addOption"
                >
                  {{ t('vote.addOption') }}
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-select
              v-model="form.voteStatus"
              :label="t('vote.status')"
              :items="statusItems"
              item-title="title"
              item-value="value"
              readonly
              variant="outlined"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              :model-value="formatDateDisplay(form.createdAt)"
              :label="t('common.createdAt')"
              readonly
              variant="outlined"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="onCancel">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          v-if="isNew || form.voteStatus === 'Draft'"
          color="primary"
          variant="elevated"
          @click="onSave"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="searchDialog" max-width="600">
      <v-card>
        <v-card-title>{{ t('vote.searchActivity') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchKeyword"
            :label="t('common.keyword')"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="searchDialog = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" @click="onSearch">
            {{ t('common.search') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useVoteStore } from '@/stores/vote'
import { useAuth } from '@/composables/useAuth'
import { formatDateTime, formatDateForTimezoneInput, parseLocalTimeInput } from '@/utils/time' 

const { t } = useI18n()
const router = useRouter()
const voteStore = useVoteStore()
const { userId, userName } = useAuth()

const isNew = ref(true)
const searchDialog = ref(false)
const searchKeyword = ref('')

const form = reactive({
  voteId: '',
  activityName: '',
  activityCode: '',
  voteTitle: '',
  voteDescription: '',
  voteType: 'general',
  allowMultiple: false,
  startTime: '',
  endTime: '',
  allowAnonymous: false,
  resultsPublic: true,
  participants: [],
  voteOptions: [''],
  voteStatus: 'Draft',
  createdAt: new Date().toISOString(),
  createdBy: ''
})

const rules = reactive({
  activityName: [
    (v) => !!v || t('validation.required'),
    (v) => (v && v.length <= 100) || t('validation.maxLength', { max: 100 })
  ],
  activityCode: [
    (v) => !!v || t('validation.required'),
    (v) => /^[A-Z0-9_-]+$/.test(v) || t('validation.invalidFormat')
  ],
  voteTitle: [
    (v) => !!v || t('validation.required'),
    (v) => (v && v.length <= 200) || t('validation.maxLength', { max: 200 })
  ],
  voteType: [
    (v) => !!v || t('validation.required')
  ],
  startTime: [
    (v) => !!v || t('validation.required')
  ],
  endTime: [
    (v) => !!v || t('validation.required'),
    () => {
      if (!form.startTime || !form.endTime) return true
      return new Date(form.endTime) > new Date(form.startTime) || t('validation.endTimeAfterStart')
    }
  ]
})

const voteTypeItems = computed(() => [
  { value: 'general', title: t('vote.typeGeneral') },
  { value: 'rating', title: t('vote.typeRating') },
  { value: 'poll', title: t('vote.typePoll') }
])

const statusItems = computed(() => [
  { value: 'Draft', title: t('vote.statusDraft') },
  { value: 'Active', title: t('vote.statusActive') },
  { value: 'Closed', title: t('vote.statusClosed') },
  { value: 'Cancelled', title: t('vote.statusCancelled') }
])

const resetForm = () => {
  form.voteId = ''
  form.activityName = ''
  form.activityCode = ''
  form.voteTitle = ''
  form.voteDescription = ''
  form.voteType = 'general'
  form.allowMultiple = false
  form.startTime = ''
  form.endTime = ''
  form.allowAnonymous = false
  form.resultsPublic = true
  form.participants = []
  form.voteOptions = ['']
  form.voteStatus = 'Draft'
  form.createdAt = new Date().toISOString()
}

const onSave = async () => {
  try {
    if (!form.activityName || !form.voteTitle || !form.startTime || !form.endTime) {
      alert(t('validation.pleaseCheckFields'))
      return
    }

    const validOptions = form.voteOptions.filter((opt) => opt.trim())
    if (validOptions.length < 2) {
      alert(t('vote.minTwoOptions'))
      return
    }

    form.voteOptions = validOptions

    // 將用戶輸入的時間轉換為 ISO 格式（台北時區）
    const saveData = {
      ...form,
      startTime: parseUserTimeInput(form.startTime),
      endTime: parseUserTimeInput(form.endTime),
      ...(isNew.value ? { createdBy: userId.value || userName.value || 'SYSTEM' } : { updatedBy: userId.value || userName.value || 'SYSTEM' })
    }

    if (isNew.value) {
      const result = await voteStore.createVote(saveData)
      if (result && result.voteId) {
        form.voteId = result.voteId
        isNew.value = false
        alert(t('common.createSuccess'))
      } else {
        alert(t('common.saveSuccess'))
        isNew.value = false
      }
    } 
    else {
      await voteStore.updateVote(form.voteId, saveData)
      alert(t('common.updateSuccess'))
    }
  } catch (error) {
    console.error('Error saving vote:', error)
    alert(t('common.saveFailed'))
  }
  router.push('/vote-admin')
}

const onCancel = () => {
  if (confirm(t('common.confirmCancel'))) {
    resetForm()
    router.push('/vote-admin')
  }
}

const onSearch = async () => {
  try {
    await voteStore.fetchVotes(searchKeyword.value)
    searchDialog.value = false
  } catch (error) {
    console.error('Error searching votes:', error)
    alert(t('common.searchFailed'))
  }
}

const addOption = () => {
  form.voteOptions.push('')
}

const removeOption = (index) => {
  form.voteOptions.splice(index, 1)
}

/**
 * 將 ISO 字符串轉換為台北時區的輸入格式 (YYYY-MM-DD HH:MM)
 */
const formatDateForInput = (dateStr) => {
  return formatDateForTimezoneInput(dateStr)
}

/**
 * 將使用者輸入的時間字符串轉換為 ISO 格式
 * 不添加時區偏移，讓後端根據用戶設定進行處理
 */
const parseUserTimeInput = (timeStr) => {
  return parseLocalTimeInput(timeStr)
}

const focusStartTime = () => {
  // 可選：在焦點時顯示日期選擇器或提示用戶格式
}

const focusEndTime = () => {
  // 可選：在焦點時顯示日期選擇器或提示用戶格式
}

const formatDateDisplay = (dateStr) => formatDateTime(dateStr)

onMounted(async () => {
  const voteId = router.currentRoute.value.params.id
  
  if (voteId) {
    try {
      const vote = await voteStore.fetchVote(voteId)
      
      form.voteId = vote.voteId || ''
      form.activityName = vote.activityName || ''
      form.activityCode = vote.activityCode || ''
      form.voteTitle = vote.voteTitle || ''
      form.voteDescription = vote.voteDescription || ''
      form.voteType = vote.voteType || 'general'
      form.allowMultiple = vote.allowMultiple ? true : false
      form.startTime = formatDateForInput(vote.startTime)
      form.endTime = formatDateForInput(vote.endTime)
      form.allowAnonymous = vote.allowAnonymous ? true : false
      form.resultsPublic = vote.resultsPublic ? true : false
      form.voteStatus = vote.voteStatus || 'Draft'
      form.createdAt = vote.createdAt || new Date().toISOString()
      form.createdBy = vote.createdBy || ''
      
      if (vote.optionDetails && Array.isArray(vote.optionDetails)) {
        form.voteOptions = vote.optionDetails.map(opt => opt.optionText)
      } else if (vote.voteOptions && Array.isArray(vote.voteOptions)) {
        form.voteOptions = vote.voteOptions
      }
      
      if (vote.participants && Array.isArray(vote.participants)) {
        form.participants = vote.participants
      }
      
      isNew.value = false
      console.log('Vote loaded successfully:', form)
    } catch (error) {
      console.error('Error loading vote:', error)
      alert(t('vote.loadFailed'))
      resetForm()
    }
  } else {
    resetForm()
    try {
      await voteStore.fetchVotes()
    } catch (error) {
      console.error('Error loading votes list:', error)
    }
  }
})
</script>

<style scoped>
.v-container {
  max-width: 1200px;
}
</style>