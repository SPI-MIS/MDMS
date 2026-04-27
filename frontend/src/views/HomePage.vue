<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="text-center">
      <!-- 除外工時 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="primary" class="text-h5 font-weight-bold" @click="goTo('/main')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('exclusion.home') }}</div></v-btn>
      </v-col>

      <!-- 訂便當 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="success" class="text-h5 font-weight-bold" @click="goTo('/bento')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('bento.home') }}</div></v-btn>
      </v-col>

      <!-- 公司投票 -->
      <v-col cols="12" sm="4">
        <v-btn block height="120" color="info" class="text-h5 font-weight-bold" @click="goTo('/employee-vote')" > 
          <div style="white-space: normal; line-height: 1.2;">{{ $t('vote.home') }}</div></v-btn>
      </v-col>
      
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
const goTo = (path) => router.push(path);
</script>
