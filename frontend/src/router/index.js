import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import i18n from '@/plugins/i18n'   // 若名稱不同請調整
import api from '@/utils/api'

import Maintenance from '@/views/Maintenance.vue';
import HomePage from '@/views/HomePage.vue';
import LoginView from '@/views/LoginView.vue';
import changePasswordForm from '@/views/ChangePassword.vue';

import ManageView from '@/views/ManageView.vue';

import toolexcel from '@/views/tool/ExcelImport.vue';
import QAtool from '@/views/tool/QAExcelImport.vue';

import VoteView from '@/views/votes/VoteView.vue';
import EmployeeVoteView from '@/views/votes/EmployeeVoteView.vue';
import VoteAdminPanel from '@/views/votes/VoteAdminPanel.vue';
import VoteITManagementView from '@/views/votes/VoteITManagementView.vue';

import exclusionView from '@/views/exclusion/HomeView.vue';

import BentoOrder from '@/views/bento/Bento_View.vue';
import BentoSummary from '@/views/bento/BentoSummary.vue';
import BentoAllOrders from '@/views/bento/BentoAllOrders.vue';
import BentoOvertime from '@/views/bento/BentoOvertime.vue';

const routes = [
  {
    path: '/main',
    name: 'main',
    component: Maintenance,
    meta: { title: '系統維護中.....' } // 這裡的 key 要對應 i18n 語系檔
  },
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
  },
  {
    path: '/bento',
    component: BentoOrder,
    meta: {
      title: 'bento.creatdata',
      requiresAuth: true
    }
  },
  {
    path: '/bento-summary',
    component: BentoSummary,
    meta: {
      title: 'bento.total',
      requiresAuth: true,
      role: 'bentoSummary'  // 自訂角色：manager/admin 或有 can_view_summary 的人
    }
  },
  {
    path: '/bento-all-orders',
    component: BentoAllOrders,
    meta: {
      title: 'bento.all',
      requiresAuth: true,
      role: 'manager'
    }
  },
  {
    path: '/bento-overtime',
    component: BentoOvertime,
    meta: {
      title: 'bento.overtime',
      requiresAuth: true
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ⭐ 白名單（不需登入的頁面）
const publicPages = ['/login', '/tool_excelimport', '/QAtool']

router.beforeEach(async (to, _from, next) => {
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

    if (requiredRole === 'admin') {
      hasPermission = admin.value === '1'
    } else if (requiredRole === 'manager') {
      hasPermission = manager.value === '1' || admin.value === '1'
    } else if (requiredRole === 'managerOnly') {
      hasPermission = manager.value === '1' && admin.value !== '1'
    } else if (requiredRole === 'bentoSummary') {
      try {
        const { data } = await api.get('/bento/overtime/summary-permission')
        hasPermission = !!data.canView
      } catch {
        hasPermission = false
      }
    }

    if (!hasPermission) {
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
