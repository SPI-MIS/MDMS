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
    title: '模具種類建立作業',
    desc: '管理模具種類資料',
    icon: 'mdi-shape-outline',
    color: 'indigo',
    route: '/mold-type'
  },
  {
    title: '模具分類建立作業',
    desc: '管理模具分類資料',
    icon: 'mdi-shape-plus-outline',
    color: 'deep-purple',
    route: '/mold-category'
  },
  {
    title: '模具材質建立作業',
    desc: '建立與維護模具材質資料',
    icon: 'mdi-material-ui',
    color: 'teal',
    route: '/material'
  },
  {
    title: '廠商資料建立作業',
    desc: '管理廠商基本資料',
    icon: 'mdi-factory',
    color: 'orange',
    route: '/vendor'
  },
  {
    title: '模具基本資料建立作業',
    desc: '管理模具的基本資料',
    icon: 'mdi-database-cog',
    color: 'blue',
    route: '/mold-basic'
  }
];

const goTo = (path) => {
  router.push(path);
};
</script>
