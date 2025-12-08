import { createI18n } from 'vue-i18n'
import zh from '../locales/zh-tw.json'
import vi from '../locales/vi.json'
import id from '../locales/id.json'

const i18n = createI18n({
<<<<<<< Updated upstream
  legacy: true,
  allowComposition: true,   // ★★ 避免 production 移除 legacy 插值功能
  fullInstall: true,        // ★★ 確保組件內能完整使用 $t
  locale: (localStorage.getItem('lang') || 'zh-tw').toLowerCase(),
=======
  legacy: true, 
  locale: localStorage.getItem('lang') || 'zh-tw',
>>>>>>> Stashed changes
  fallbackLocale: 'zh-tw',
  messages: {
    'zh-tw': zh,
    vi,
    id
  },
  flatJson: false
})


console.log('i18n messages', { zh, vi, id })


export default i18n
