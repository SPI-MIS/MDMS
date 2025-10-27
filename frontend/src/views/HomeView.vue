<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="text-center">
      <!-- 模具基本資料 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="primary" class="text-h5 font-weight-bold" @click="goTo('settings')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('settings') }}</div></v-btn>
      </v-col>

      <!-- 模具狀態 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="success" class="text-h5 font-weight-bold" @click="goTo('status')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('status') }}</div></v-btn>
      </v-col>

      <!-- 模具履歷（首頁） -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="info" class="text-h5 font-weight-bold" @click="goTo('profile')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('profile') }}</div></v-btn>
      </v-col>
      
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

const goTo = (page) => {
  switch (page) {
    case 'home':
      router.push('/home');
      break;
    case 'settings':
      router.push('/settings');
      break;
    case 'status':
      router.push('/status');
      break;
    case 'profile':
      router.push('/profile');
      break;
  }
};
</script>
