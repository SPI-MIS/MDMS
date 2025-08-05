<template>
  <v-app-bar flat dense color="blue lighten-1" class="px-4" dark>
    <v-container fluid>
      <v-row align="center" justify="space-between">
        <!-- 左側：LOGO + 系統名稱 -->
        <v-col cols="12" md="3" class="d-flex align-center px-0">
          <img src="@/assets/logo.svg" alt="Logo" height="28" class="mr-2" @click="goHome"/>
          <div class="text-h6 font-weight-bold pa-0 ma-0">{{ $t('title') }}</div>
        </v-col>

        <!-- 中間：正式區 Chip -->
        <!-- <v-col cols="12" md="6" class="d-flex justify-center">
          <v-chip color="red" text-color="white" small>{{ $t('prodTag') }}</v-chip>
        </v-col> -->

        <!-- 右側：使用者姓名選單 -->
        <v-col cols="12" md="3" class="d-flex justify-end">
          <v-menu v-if="userId && userName" offset-y>
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="text" class="white--text text-decoration-underline">
                {{ $t('user', { name: userName || '' }) }}
                <v-icon right>mdi-menu-down</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>{{ $t('empId', { id: userId || '' }) }}</v-list-item-title>
              </v-list-item>
              <v-divider class="my-1" />
              <v-list-item @click="changePassword">
                <v-list-item-title>{{ $t('changePassword') }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="goHome">
                <v-list-item-title>{{ $t('home') }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="String(manager) === '1'">
                <v-list-item-title>{{ $t('accountManage') }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="String(manager) === '1'">
                <v-list-item-title>{{ $t('permissionManage') }}</v-list-item-title>
              </v-list-item>
              <v-list-item @click="logout">
                <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

useI18n({ useScope: 'global' })

defineProps({
  userId: { type: String, default: '' },
  userName: { type: String, default: '' },
  manager: { type: String, default: '' }
})

const router = useRouter()

const changePassword = () => {
  window.open('http://example.com/change-password', '_blank')
}

const goHome = () => {
  router.push('/')
}

const logout = () => {
  localStorage.clear()
  router.push('/login')
}
</script>
