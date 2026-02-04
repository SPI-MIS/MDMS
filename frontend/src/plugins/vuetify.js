// frontend/src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'myCustomTheme',
    themes: {
      myCustomTheme: {
        dark: false,
        colors: {
          primary: '#1D4E89',      // ✅ 主色
          secondary: '#7DCFB6',
          accent: '#FBDEA2',
          error: '#F79256',
          info: '#00B2CA',
          success: '#99CCCC',
          warning: '#CC0033',
        },
      },
    },
  },
})

export default vuetify
