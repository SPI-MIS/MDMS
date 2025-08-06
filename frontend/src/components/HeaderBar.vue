<template>
  <!-- 側邊欄 -->
  <v-navigation-drawer v-model="drawer" temporary location="left" >
    <v-list nav>
      <v-list-item @click="goHome">
        <v-list-item-title>{{ $t('home') }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="goSettings">
        <v-list-item-title>{{ $t('settings') }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="goStatus">
        <v-list-item-title>{{ $t('status') }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="goProfile">
        <v-list-item-title>{{ $t('profile') }}</v-list-item-title>
      </v-list-item>
      <v-divider />
      <v-list-item @click="goManage" v-if="String(manager) === '1'">
        <v-list-item-title>{{ $t('accountManage') }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="logout">
        <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
 
  <v-app-bar flat dense color="blue lighten-1" class="px-4" dark>
    <v-container fluid>
      <v-row align="center" justify="space-between">
        <!-- 左側：LOGO + 系統名稱 -->
        <v-col cols="auto" md="3" class="d-flex align-center px-0">
           <!-- 打開側邊欄的按鈕 / LOGO -->
          <v-btn icon @click="drawer = !drawer">
            <img src="@/assets/logo.svg" alt="Logo" height="28" />
          </v-btn>
          <div class="text-h6 font-weight-bold pa-0 ma-0"> {{ route.meta?.title ? $t(route.meta.title) : '' }}</div>
        </v-col>

        <!-- 右側：使用者姓名選單 -->
        <v-col cols="auto"  md="3" class="d-flex justify-end">
          <v-menu v-if="userId && userName" offset-y>
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="text" class="white--text text-decoration-underline">
                {{ userName }} 您好！ 
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
              <v-divider class="my-1" />

              <v-list-item @click="goManage" v-if="String(manager) === '1'">
                <v-list-item-title>{{ $t('accountManage') }}</v-list-item-title>
              </v-list-item>              
              <v-list-item @click="logout">
                <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
              </v-list-item>
              
            </v-list>
          </v-menu>
          <v-btn v-else variant="text" class="white--text text-decoration-underline" @click="goLogin">
            {{ $t('login') }}
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { ref } from 'vue';

const drawer = ref(false);
const route = useRoute();

useI18n({ useScope: 'global' })

const { userId, userName, manager } = defineProps({
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
  location.reload();
}

const goLogin = () => {
  router.push('/login')
}

const goSettings = () => {
  router.push('/settings');
}

const goStatus = () => {
  router.push('/status');
}

const goProfile = () => {
  router.push('/profile');
}

const goManage = () => {
  router.push('/manage');
}
</script>
