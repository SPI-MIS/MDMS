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

        <v-list-item @click="goTo('/mold-type')">
          <v-list-item-title>模具種類</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/mold-category')">
          <v-list-item-title>模具分類</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/material')">
          <v-list-item-title>材質</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/vendor')">
          <v-list-item-title>廠商資料</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/mold-basic')">
          <v-list-item-title>模具基本資料</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />

      <!-- 模具狀態管理（階層） -->
      <v-list-group prepend-icon="mdi-state-machine">
        <template #activator="{ props }">
          <v-list-item v-bind="props" @click="goTo('/status')">
            <v-list-item-title>{{ $t('status') }}</v-list-item-title>
          </v-list-item>
        </template>

        <v-list-item @click="goTo('/mold-type')">
          <v-list-item-title>模具狀態</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/mold-category')">
          <v-list-item-title>模具維修</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />

      <!-- 模具履歷管理（階層） -->
      <v-list-group prepend-icon="mdi-file-account">
        <template #activator="{ props }">
          <v-list-item v-bind="props" @click="goTo('/profile')">
            <v-list-item-title>{{ $t('profile') }}</v-list-item-title>
          </v-list-item>
        </template>

        <v-list-item @click="goTo('/mold-type')">
          <v-list-item-title>生產履歷</v-list-item-title>
        </v-list-item>

        <v-list-item @click="goTo('/mold-category')">
          <v-list-item-title>模具壽命</v-list-item-title>
        </v-list-item>
      </v-list-group>

      <v-divider />

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
 
  <v-app-bar flat dense color="blue lighten-1" class="px-4" dark>
    <v-container fluid>
      <v-row align="center" justify="space-between">
        <!-- 左側：LOGO + 系統名稱 -->
        <v-col cols="auto" md="6" class="d-flex align-center px-0">
           <!-- 打開側邊欄的按鈕 / LOGO -->
          <v-btn icon @click="drawer = !drawer">
            <img src="@/assets/logo.svg" alt="Logo" height="28" />
          </v-btn>
          <div class="text-h6 font-weight-bold pa-0 ma-0"> {{ route.meta?.title ? $t(route.meta.title) : '' }}</div>
        </v-col>

        <!-- <v-col cols="auto" class="d-flex justify-center">
          <v-sheet class="pa-2 ma-2"> {{ route.meta?.title ? $t(route.meta.title) : '' }}</v-sheet>
        </v-col> -->

        <!-- 右側：使用者姓名選單 -->
        <v-col cols="auto" md="3" class="d-flex justify-end align-center">
          <v-menu v-if="userId && userName" offset-y>
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="text" class="white--text text-decoration-underline">
                {{ userName }} 您好！ 
                <v-icon right>mdi-menu-down</v-icon>
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

              <v-list-item @click="goTo('/manage')" v-if="String(manager) === '1'">
                <v-list-item-title>{{ $t('manage') }}</v-list-item-title>
              </v-list-item>              
              <v-list-item @click="logout">
                <v-list-item-title>{{ $t('logout') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn v-else variant="text" class="white--text text-decoration-underline" @click="goTo('/login')"> {{ $t('login') }} </v-btn>
          
          <!-- 國旗語系切換 -->
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

        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { ref, onMounted ,watch } from 'vue';
import { useAuth } from '@/composables/useAuth';

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
const changePassword = () => { window.open('http://example.com/change-password', '_blank') }
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

</script>

<style scoped>
.v-img {
  border-radius: 3px;
  object-fit: cover;
}

</style>
