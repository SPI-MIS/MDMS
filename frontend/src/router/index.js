import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import i18n from '@/plugins/i18n'   // 若名稱不同請調整

import HomePage from '@/views/HomePage.vue';
import LoginView from '@/views/LoginView.vue';
import changePasswordForm from '@/views/ChangePassword.vue';

import mdmsHomeView from '@/views/mdms/MDMSHomeView.vue';
import ProfileView from '@/views/mdms/ProfileView.vue';
import SettingsView from '@/views/mdms/SettingsView.vue';
import StatusView from '@/views/mdms/StatusView.vue';
import ManageView from '@/views/ManageView.vue';
import moldTypeForm from '@/views/mdms/MoldtypeForm.vue';
import moldCategoryForm from '@/views/mdms/MoldCategoryForm.vue';
import moldMaterialForm from '@/views/mdms/MoldMaterialForm.vue';
import vendorForm from '@/views/mdms/VendorForm.vue';
import moldBasicForm from '@/views/mdms/MoldBasicForm.vue';

import toolexcel from '@/views/tool/ExcelImport.vue';
import QAtool from '@/views/tool/QAExcelImport.vue';

import VoteView from '@/views/votes/VoteView.vue';
import EmployeeVoteView from '@/views/votes/EmployeeVoteView.vue';
import VoteAdminPanel from '@/views/votes/VoteAdminPanel.vue';
import VoteITManagementView from '@/views/votes/VoteITManagementView.vue';

import exclusionView from '@/views/exclusion/HomeView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'system' } // 這裡的 key 要對應 i18n 語系檔
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'system' } // 這裡的 key 要對應 i18n 語系檔
  },
  { 
    path: '/mdmshome', 
    component: mdmsHomeView,
    meta: { title: 'system' }
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
    meta: { 
      title: 'manage.home',
      role: 'managerOnly' 
    }
  },
  { 
    path: '/ChangePassword', 
    component: changePasswordForm,
    meta: { title: 'system' }
  },
  { 
    path: '/tool_excelimport', 
    component: toolexcel,
    meta: { title: 'excelimport' }
  },
  { 
    path: '/QAtool', 
    component: QAtool,
    meta: { title: 'QAtool' }
  },
  {
    path: '/votes',
    name: 'VoteCreate',
    component: VoteView,
    meta: {
      title: 'vote.manageVotingActivities',
      requiresAuth: true,
      role: 'manager'
    }
  },
  {
    path: '/employee-vote',
    component: EmployeeVoteView,
    meta: { title: 'vote.employeeVoting' }
  },
  {
    path: '/vote-admin',
    name: 'VoteAdmin',
    component: VoteAdminPanel,
    meta: {
      title: 'vote.adminPanel',
      requiresAuth: true,
      role: 'manager'
    }
  },
  {
    path: '/vote-edit/:id',
    name: 'VoteEdit',
    component: VoteView,
    meta: {
      title: 'vote.manageVotingActivities',
      requiresAuth: true,
      role: 'manager'
    }
  },
  {
    path: '/vote-itmanagement',
    component: VoteITManagementView,
    meta: {
      title: 'manage.itvotemanage',
      requiresAuth: true,
      role: 'managerOnly'
    }
  },
  { 
    path: '/exclusionhome', 
    component: exclusionView,
    meta: { title: 'system' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ⭐ 白名單（不需登入的頁面）
const publicPages = ['/login', '/tool_excelimport', '/QAtool']

router.beforeEach((to, from, next) => {
  const { isLoggedIn, admin, manager } = useAuth()

  const requiresAuth = !publicPages.includes(to.path)

  // 🔒 1) 未登入 → 禁止進入受保護頁面
  if (requiresAuth && !isLoggedIn.value) {
    return next('/login')
  }

  // 🔁 2) 已登入 → 不允許回到 login
  if (to.path === '/login' && isLoggedIn.value) {
    return next('/')
  }

  // 🔐 3) 角色權限檢查
  if (to.meta?.role) {
    const requiredRole = to.meta.role
    let hasPermission = false

    // 調試日誌
    console.log('[Router Guard] Checking permissions:', {
      path: to.path,
      requiredRole,
      admin: admin.value,
      manager: manager.value
    })

    if (requiredRole === 'admin') { hasPermission = admin.value === '1'} 
    else if (requiredRole === 'manager') { hasPermission = manager.value === '1' || admin.value === '1' } 
    else if (requiredRole === 'managerOnly') { hasPermission = manager.value === '1' && admin.value !== '1' }

    console.log('[Router Guard] Has permission:', hasPermission)

    if (!hasPermission) {
      console.warn(`User does not have ${requiredRole} permission for route: ${to.path}`)
      // 重定向到首頁並顯示無權限訊息
      // alert(i18n.global.t('common.noPermission') || '您沒有權限訪問此頁面')
      return next('/')
    }
  }

  // 🌐 4) 自動依語系更新 title
  if (to.meta?.title) {
    document.title = i18n.global.t(to.meta.title)
  }

  next()
})


export default router
