<template>
  <v-app>
    <HeaderBar :user-id="userId" :user-name="userName" :manager="manager" />
    <router-view @login-success="updateUser" />
  </v-app>
</template>

<script setup>
import HeaderBar from '@/components/HeaderBar.vue'
import { ref, onMounted } from 'vue'

const userId = ref('')
const userName = ref('')
const manager = ref('')

const updateUser = (payload) => {
  userId.value = payload.userId
  userName.value = payload.userName
  manager.value = payload.manager
  localStorage.setItem('userId', payload.userId)
  localStorage.setItem('userName', payload.userName)
  localStorage.setItem('manager', payload.manager)
}

onMounted(() => {
  userId.value = localStorage.getItem('userId') || ''
  userName.value = localStorage.getItem('userName') || ''
  manager.value = localStorage.getItem('manager') || ''
})
</script>
