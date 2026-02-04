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

onMounted(() => {
  userId.value = localStorage.getItem('userId') || ''
  userName.value = localStorage.getItem('userName') || ''
  manager.value = localStorage.getItem('manager') || ''
  admin.value = localStorage.getItem('admin') || ''
})

// 預設 15 分鐘，可改成 { timeout: 30 * 60 * 1000 } 例如 30 分鐘
useAutoLogout({ timeout: 15 * 60 * 1000 })
</script>
