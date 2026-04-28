<template>
  <v-app>
    <v-layout>
      <HeaderBar :user-id="userId" :user-name="userName" :manager="manager" :admin="admin" />

      <v-main>
        <!-- 內容區 -->
        <router-view @login-success="updateUser" />
      </v-main>

      <Footer />
    </v-layout>
  </v-app>
</template>


<script setup>
import HeaderBar from '@/components/HeaderBar.vue'
import Footer from '@/components/FooterPage.vue'
import { ref, onMounted } from 'vue'
import { useAutoLogout } from '@/composables/useAutoLogout'
import api from '@/utils/api'

const userId = ref('')
const userName = ref('')
const manager = ref('')
const admin = ref('')

const updateUser = (payload) => {
  userId.value = payload.userId
  userName.value = payload.userName
  manager.value = payload.manager
  admin.value = payload.admin
  localStorage.setItem('userId', payload.userId)
  localStorage.setItem('userName', payload.userName)
  localStorage.setItem('manager', payload.manager)
  localStorage.setItem('admin', payload.admin)
}

const { restart: restartAutoLogout } = useAutoLogout({ timeout: 15 * 60 * 1000 })

onMounted(async () => {
  userId.value = localStorage.getItem('userId') || ''
  userName.value = localStorage.getItem('userName') || ''
  manager.value = localStorage.getItem('manager') || ''
  admin.value = localStorage.getItem('admin') || ''
  try {
    const { data } = await api.get('/bento/settings')
    const min = Number(data.auto_logout_timeout_min)
    if (min > 0) restartAutoLogout(min * 60 * 1000)
  } catch { /* 保留預設值 */ }
})
</script>
