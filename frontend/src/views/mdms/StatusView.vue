<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center" class="text-center">
      <v-col
        v-for="(item, index) in menuItems"
        :key="index"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card
          class="pa-4 text-center"
          :color="item.color"
          theme="dark"
          elevation="3"
          @click="goTo(isLoggedIn ? item.route : '/login')"
        >
          <v-icon size="48" class="mb-2">{{ item.icon }}</v-icon>
          <div class="text-h6 font-weight-bold">{{ item.title }}</div>
          <div class="text-caption">{{ item.desc }}</div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
const router = useRouter();
const { isLoggedIn } = useAuth();

const menuItems = [
  {
    title: '模具狀態',
    desc: '查看模具狀態',
    icon: 'mdi-list-status',
    color: 'indigo',
    route: '/mold-status'
  },
  {
    title: '模具維修',
    desc: '管理模具維修資料',
    icon: 'mdi-tools',
    color: 'deep-purple',
    route: '/mold-fix'
  }
];

const goTo = (path) => {
  router.push(path);
};
</script>
