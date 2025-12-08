<template>  
  <!-- 側邊欄 -->
  <v-navigation-drawer v-model="drawer" temporary location="left" >
    <v-list density="compact" nav>
      <!-- 首頁 -->
      <v-list-item @click="goTo('/')">
        <v-list-item-title>{{ $t('home') }}</v-list-item-title>
      </v-list-item>

      <!-- 模具管理（階層） -->
      <v-list-group prepend-icon="mdi-database">
        <template #activator="{ props }">
          <v-list-item v-bind="props" @click="goTo('/settings')">
            <v-list-item-title>{{ $t('settings') }}</v-list-item-title>
          </v-list-item>
        </template>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-type' : '/login')">
          <v-list-item-title>{{ $t('moldTypeForm') }}</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-category' : '/login')">
          <v-list-item-title>{{ $t('moldCategory') }}</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/material' : '/login')">
          <v-list-item-title>{{ $t('material') }}</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/vendor' : '/login')">
          <v-list-item-title>{{ $t('vendor') }}</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-basic' : '/login')">
          <v-list-item-title>{{ $t('moldBasic') }}</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />

      <!-- 模具狀態管理（階層） -->
      <v-list-group prepend-icon="mdi-state-machine">
        <template #activator="{ props }">
          <v-list-item v-bind="props" @click="goTo(isLoggedIn ? '/status' : '/login')">
            <v-list-item-title>{{ $t('status') }}</v-list-item-title>
          </v-list-item>
        </template>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-status' : '/login')">
          <v-list-item-title>模具狀態</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-fix' : '/login')">
          <v-list-item-title>模具維修</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />

      <!-- 模具履歷管理（階層） -->
      <v-list-group prepend-icon="mdi-file-account">
        <template #activator="{ props }">
          <v-list-item v-bind="props" @click="goTo(isLoggedIn ? '/profile' : '/login')">
            <v-list-item-title>{{ $t('profile') }}</v-list-item-title>
          </v-list-item>
        </template>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-type' : '/login')">
          <v-list-item-title>生產履歷</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo(isLoggedIn ? '/mold-category' : '/login')">
          <v-list-item-title>模具壽命</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />
      <!-- 小工具（首頁） -->
      <v-list-item @click="goTo('/tool_excelimport')">
        <v-list-item-title>{{ $t('excelimport') }}</v-list-item-title>
      </v-list-item>

      <!-- 系統管理 -->
      <v-list-item v-if="String(manager) === '1'" @click="goTo('/manage')">
        <v-list-item-title>{{ $t('manage') }}</v-list-item-title>
      </v-list-item>

      <!-- 登出/登入 -->
      <v-list-item v-if="isLoggedIn" @click="logout">
        <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
      </v-list-item>
      <v-list-item v-else @click="goTo('/login')">
        <v-list-item-title>{{ $t('login') }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
 
  <v-app-bar flat density="comfortable" color="primary">
  <!-- 左：手機漢堡鍵 + Logo + 標題 -->
  <v-app-bar-nav-icon class="d-md-none" @click="drawer = true" />
  <v-btn icon class="d-none d-md-inline-flex" @click="drawer = !drawer">
    <img :src="logoUrl" alt="Logo" height="28" />
  </v-btn>
  <v-toolbar-title class="text-h6"> {{ route.meta?.title ? $t(route.meta.title) : '' }} </v-toolbar-title>

  <v-spacer />

  <!-- 右：桌機完整操作 -->
  <div class="d-none d-md-flex align-center" style="gap: 8px;">
    <template v-if="userId && userName">
      <v-menu offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-white text-decoration-underline">
            {{ userName }} 您好！<v-icon end>mdi-menu-down</v-icon>
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
          <v-list-item @click="goTo('/')">
            <v-list-item-title>{{ $t('home') }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item v-if="String(manager) === '1'" @click="goTo('/manage')">
            <v-list-item-title>{{ $t('manage') }}</v-list-item-title>
          </v-list-item>
         
          <v-list-item @click="logout">
            <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
    <v-btn v-else variant="text" class="text-white text-decoration-underline" @click="goTo('/login')">
      {{ $t('login') }}
    </v-btn>

    <!-- 語系：桌機用 v-select，變窄不會撐開 -->
    <v-select v-model="lang" :items="languages" item-value="key" style="max-width: 80px;" @change="changeLang" return-object>
      <template v-slot:item="{ props: itemProps, item }">
        <v-list-item>
          <div class="d-flex align-center">
            <v-img v-bind="itemProps" :src="item.raw.image" aspect-ratio="1.6" class="mr-2 rounded-sm" cover />
          </div>       
        </v-list-item>
      </template>    
      
      <template v-slot:selection="{ item }">
        <div class="d-flex align-center">
          <v-img :src="item.raw.image" width="30" aspect-ratio="1.6" class="mr-2 rounded-sm" cover />
        </div>
      </template>
    </v-select>
  </div>

  <!-- 右：手機精簡操作（更多） -->
  <v-menu v-if="!mdAndUp" location="bottom end">
    <template #activator="{ props }">
      <v-btn icon v-bind="props"><v-icon>mdi-dots-vertical</v-icon></v-btn>
    </template>
    <v-list density="compact">
      <v-list-item v-if="userId && userName">
        <v-list-item-title>{{ userName }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="goTo('/')" title="首頁" />
      <v-list-item v-if="String(manager) === '1'" @click="goTo('/manage')" title="系統管理" />
      <v-list-item v-if="userId && userName" @click="changePassword" title="變更密碼" />
      <v-list-item v-if="userId && userName" @click="logout" title="登出" />
      <v-list-item v-else @click="goTo('/login')" title="登入" />
      <v-divider class="my-1" />
      <!-- 語系：手機用簡單清單 -->
      <v-list-subheader>Language</v-list-subheader>
      <v-list-item v-for="lang in languages" :key="lang.key" @click="onSelectLang(lang)" >
        <div class="d-flex align-center" style="gap:8px;">
          <v-img :src="lang.image" width="28" aspect-ratio="1.6" class="rounded-sm" cover />
        </div>
      </v-list-item>
    </v-list>
  </v-menu>
</v-app-bar>

</template>

<script setup>
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted ,watch } from 'vue';
import { useAuth } from '@/composables/useAuth';

const logoUrl = new URL('@/assets/logo.svg', import.meta.url).href
const { mdAndUp } = useDisplay()  // true 表示 ≥ sm
const { isLoggedIn, logout } = useAuth();
const drawer = ref(false);
const route = useRoute();

const languages = [
  { image: '/flags/tw.svg', label: '繁體中文', key: 'zh-tw' }, // 台灣（需額外補充）
  { image: '/flags/vn.svg', label: 'Tiếng Việt', key: 'vi' },
  { image: '/flags/id.svg', label: 'Bahasa Indonesia', key: 'id' }
]

useI18n({ useScope: 'global' })
const { locale } = useI18n()
const lang = ref(languages.find(l => l.key === locale.value) || languages[0])

const { userId, userName, manager } = defineProps({
  userId: { type: String, default: '' },
  userName: { type: String, default: '' },
  manager: { type: String, default: '' }
})

const router = useRouter()
const changePassword = () => { window.open('/ChangePassword', '_blank') }
const goTo = (path) => router.push(path);

// 切換語言
const changeLang = () => {
  if (lang.value?.key) {
    console.log('lang',lang.value.key)
    locale.value = lang.value.key
    localStorage.setItem('lang', lang.value.key)
  } else {
    console.warn('🌐 lang.value 無效：', lang.value)
  }
}

watch(lang, (val) => {
  if (val?.key) {
    locale.value = val.key
    localStorage.setItem('lang', val.key)
    // console.log('語系切為：', locale.value)
  }
})

// 初始化語系
onMounted(() => {
  const saved = localStorage.getItem('lang')
  if (saved) {
    const match = languages.find(l => l.key === saved)
    if (match) {
      lang.value = match
      locale.value = match.key
    }
  }
})

const onSelectLang = (lang) => {
  lang.value = lang
  changeLang()
}

</script>

<style scoped>
.v-img {
  border-radius: 3px;
  object-fit: cover;
}

</style>
