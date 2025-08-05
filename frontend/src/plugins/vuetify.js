// frontend/src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const vuetify = createVuetify({
  components,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
})

export default vuetify
