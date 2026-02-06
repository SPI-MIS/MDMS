// plugins/i18n.js
import { createI18n } from 'vue-i18n'

// ✅ 使用絕對路徑導入（確保生產環境正確打包）
import zhTW from '@/locales/zh-tw.json'
import vi from '@/locales/vi.json'
import id from '@/locales/id.json'

// 組合語言包
const messages = {
  'zh-tw': zhTW,
  'vi': vi,
  'id': id
}

// 取得初始語言設定
const getInitialLocale = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('lang')
    if (stored && Object.keys(messages).includes(stored)) {
      return stored
    }
  }
  return 'zh-tw'
}

// 創建 i18n 實例
const i18n = createI18n({
  // ✅ vue-i18n 9.x 使用 legacy: true 支援 $t
  legacy: true,
  
  // ✅ 允許 Composition API 使用 useI18n
  allowComposition: true,
  
  // ✅ 初始語言
  locale: getInitialLocale(),
  
  // ✅ 後備語言
  fallbackLocale: 'zh-tw',
  
  // ✅ 語言包
  messages,
  
  // ✅ 不顯示警告（生產環境友好）
  missingWarn: false,
  fallbackWarn: false,
  warnHtmlMessage: false
})

// ✅ 驗證語言包已正確載入
if (process.env.NODE_ENV !== 'production') {
  console.log('[i18n] Language packs loaded:', {
    'zh-tw': Object.keys(zhTW).length + ' keys',
    'vi': Object.keys(vi).length + ' keys',
    'id': Object.keys(id).length + ' keys'
  })
  console.log('[i18n] Initial locale:', i18n.global.locale)
  console.log('[i18n] Sample translations:', {
    home: i18n.global.t('home'),
    login: i18n.global.t('login'),
    'vote.home': i18n.global.t('vote.home'),
    'manage.home': i18n.global.t('manage.home')
  })
}

export default i18n