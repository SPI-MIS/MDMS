import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '@/views/LoginView.vue';
import HomeView from '@/views/HomeView.vue';
import ProfileView from '@/views/ProfileView.vue';
import SettingsView from '@/views/SettingsView.vue';
import StatusView from '@/views/StatusView.vue';
import ManageView from '@/views/ManageView.vue';
import moldTypeForm from '@/views/MoldtypeForm.vue';
import moldCategoryForm from '@/views/MoldCategoryForm.vue';

const routes = [
  // { path: '/login', redirect: '/login' },
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'system' } // 這裡的 key 要對應 i18n 語系檔
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { title: 'profile' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'settings.home' }
  },
  { 
    path: '/mold-type', 
    component: moldTypeForm,
    meta: { title: 'settings.moldTypeForm' }
  },
  { 
    path: '/mold-category', 
    component: moldCategoryForm,
    meta: { title: 'settings.moldCategory' }
  },
  {
    path: '/status',
    name: 'status',
    component: StatusView,
    meta: { title: 'status' }
  },
  {
    path: '/manage',
    name: 'manage',
    component: ManageView,
    meta: { title: 'manage' }
  },
  { 
    path: '/login', 
    component: LoginView,
    meta: { title: 'system' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
