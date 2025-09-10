import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '@/views/LoginView.vue';
import HomeView from '@/views/HomeView.vue';
import ProfileView from '@/views/ProfileView.vue';
import SettingsView from '@/views/SettingsView.vue';
import StatusView from '@/views/StatusView.vue';
import ManageView from '@/views/ManageView.vue';
import moldTypeForm from '@/views/MoldtypeForm.vue';
import moldCategoryForm from '@/views/MoldCategoryForm.vue';
import moldMaterialForm from '@/views/MoldMaterialForm.vue';
import vendorForm from '@/views/VendorForm.vue';
import moldBasicForm from '@/views/MoldBasicForm.vue';

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
    meta: { title: 'settings' }
  },
  { 
    path: '/mold-type', 
    component: moldTypeForm,
    meta: { title: 'moldTypeForm' }
  },
  { 
    path: '/mold-category', 
    component: moldCategoryForm,
    meta: { title: 'moldCategory' }
  },
  { 
    path: '/material', 
    component: moldMaterialForm,
    meta: { title: 'material' }
  },
  { 
    path: '/vendor', 
    component: vendorForm,
    meta: { title: 'vendor' }
  },
  { 
    path: '/mold-basic', 
    component: moldBasicForm,
    meta: { title: 'moldBasic' }
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
