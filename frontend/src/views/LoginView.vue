<template>   
  <v-app>
    <!-- 頂部欄 -->
    <HeaderBar
      :user-id="userId"
      :user-name="userName"
      :manager="manager"
    />
    <!-- 登入頁主內容 -->
    <!-- <v-container> ... </v-container> -->
      <v-container class="d-flex align-center justify-center" style="height: 100vh">
        <v-card width="400">
        <v-card-title class="justify-center">登入</v-card-title>
        <v-card-text>
          <v-form ref="loginForm" @submit.prevent="submitLogin">
            <v-text-field
              v-model="username"
              label="帳號"
              prepend-inner-icon="mdi-account"
              required
            ></v-text-field>
            <v-text-field
              v-model="password"
              label="密碼"
              prepend-inner-icon="mdi-lock"
              type="password"
              required
            ></v-text-field>
            <v-btn block color="primary" type="submit">
              登入
            </v-btn>
            <v-alert v-if="error" type="error" class="mt-3">
              {{ error }}
            </v-alert>
          </v-form>
        </v-card-text>
      </v-card>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth';
import HeaderBar from '@/components/HeaderBar.vue'


const username = ref('')
const password = ref('')
const manager = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()
const { login } = useAuth();
const emit = defineEmits(['login-success'])

const submitLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await axios.post('/api/login', {
      username: username.value,
      password: password.value
    })

    // 登入成功：將帳號資訊傳出給 App.vue，並寫入 localStorage
    const { userId, userName, manager } = res.data

    emit('login-success', { userId, userName, manager })

    if (res.data.success) {
      login({
        userId: res.data.userId,
        userName: res.data.userName,
        manager: res.data.manager
      });

      router.push('/'); // 導向首頁
    } else {
      error.value = '登入失敗，請檢查帳密';
    }
  } catch (err) {
    error.value = err.response?.data?.message || '系統錯誤，請稍後再試';
  }
}
</script>
