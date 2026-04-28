import { ref } from 'vue';
export const globalLang = ref(localStorage.getItem('lang') || 'zh-tw');
