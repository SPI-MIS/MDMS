<template>
  <v-container class="py-8" max-width="480">
    <v-card>
      <v-card-title class="text-h6">更改密碼</v-card-title>
      <v-card-subtitle>請輸入目前密碼與新密碼。</v-card-subtitle>

      <v-card-text>
        <v-form ref="formRef" v-model="isValid" @submit.prevent="onSubmit">
          <v-text-field
            v-model="form.currentPassword"
            :type="showCurrent ? 'text' : 'password'"
            label="目前密碼"
            :rules="[rules.required]"
            autocomplete="current-password"
            :append-inner-icon="showCurrent ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showCurrent = !showCurrent"
            variant="outlined"
            density="comfortable"
          />

          <v-text-field
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            label="新密碼"
            :rules="[rules.required, rules.minLength, rules.notSameAsOld]"
            autocomplete="new-password"
            :append-inner-icon="showNew ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showNew = !showNew"
            variant="outlined"
            density="comfortable"
          />

          <v-text-field
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            label="確認新密碼"
            :rules="[rules.required, rules.matchNew]"
            autocomplete="new-password"
            :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showConfirm = !showConfirm"
            variant="outlined"
            density="comfortable"
          />

          <div class="text-error text-body-2" v-if="errorMessage">
            {{ errorMessage }}
          </div>
          <div class="text-success text-body-2" v-if="successMessage">
            {{ successMessage }}
          </div>

          <v-card-actions class="mt-4 justify-end">
            <v-btn
              type="submit"
              color="primary"
              :loading="loading"
              :disabled="!isValid || loading"
            >
              確認更改
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const formRef = ref(null)
const isValid = ref(false)
const loading = ref(false)

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const userId = localStorage.getItem("userId");

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const errorMessage = ref('')
const successMessage = ref('')

const rules = {
  required: (v) => !!v || '此欄位為必填',
  minLength: (v) =>
    (v && v.length >= 8) || '密碼至少需 8 個字元',
  notSameAsOld: (v) =>
    v !== form.currentPassword || '新密碼不可與舊密碼相同',
  matchNew: (v) =>
    v === form.newPassword || '兩次輸入的新密碼不一致',
}

const payload = computed(() => ({
  userId: userId,
  currentPassword: form.currentPassword,
  newPassword: form.newPassword,
}))
console.log('payload',payload.value)

const resetMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const onSubmit = async () => {
  resetMessages()

  const formEl = formRef.value
  if (!formEl) return

  const { valid } = await formEl.validate()
  if (!valid) return

  loading.value = true

  try {
    await axios.post('/api/login/change-password', payload.value)

    // 顯示成功訊息
    successMessage.value = '密碼更新成功，請重新登入'

    // 清空欄位
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    formRef.value.resetValidation()

    // 等 UI 完整刷新後再執行 logout
    await nextTick()

    // 延遲 1 秒讓使用者看到提示
    setTimeout(async () => {
      localStorage.clear()
      // 再次 nextTick 確保 router guard 不打斷操作
      await nextTick()
      router.replace('/login')   // ★ 用 replace 最穩，不會被覆蓋
    }, 1000)

  } catch (err) {
      errorMessage.value =
      err?.response?.data?.message || '密碼變更失敗，請確認目前密碼是否正確'
  } finally {
      loading.value = false
  }
}
</script>

<style scoped>
.text-success {
  color: #4caf50;
}
</style>
