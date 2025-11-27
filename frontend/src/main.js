import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify' // 如果你用 Vuetify
import axios from 'axios'
import i18n from './plugins/i18n'

// 全局配置 Axios
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';

// 請求攔截器
axios.interceptors.request.use(config => {
  config.params = {
    ...config.params,
    _t: Date.now()
  };
  return config;
});

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(i18n)
app.config.globalProperties.$axios = axios
app.mount('#app')
