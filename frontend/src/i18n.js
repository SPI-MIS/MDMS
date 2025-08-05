import { createI18n } from 'vue-i18n'
import zh from './locales/zh-tw.json'
import vi from './locales/vi.json'
import id from './locales/id.json'

const i18n = createI18n({
  locale: localStorage.getItem('lang') || 'zh-tw',
  fallbackLocale: 'zh-tw',
  messages: {
    'zh-tw': zh,
    vi,
    id
  }
})

console.log('i18n messages', { zh, vi, id })


export default i18n
