<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="text-center">
      <!-- 使用者權限管理 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="primary" class="text-h5 font-weight-bold" @click="goTo('settings')" > 
          <div style="white-space: normal; line-height: 1.2;">除外工時</div></v-btn>
      </v-col>

      <!-- 訂便當 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="success" class="text-h5 font-weight-bold" @click="goTo('status')" > 
          <div style="white-space: normal; line-height: 1.2;">訂便當</div></v-btn>
      </v-col>

      <!-- 公司投票 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="info" class="text-h5 font-weight-bold" @click="goTo('votes')" > 
          <div style="white-space: normal; line-height: 1.2;">公司投票</div></v-btn>
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
      router.push('/mdmshome');
      break;
    case 'settings':
      router.push('/settings');
      break;
    case 'status':
      router.push('/status');
      break;
    case 'votes':
      router.push('/employee-vote');
      break;
  }
};
</script>
