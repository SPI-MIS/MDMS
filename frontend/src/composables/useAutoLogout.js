import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

export function useAutoLogout({ timeout = 15 * 60 * 1000, checkInterval = 1000 } = {}) {
  const { isLoggedIn, logout } = useAuth()
  const router = useRouter()

  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click']
  const resetHandler = () => localStorage.setItem('lastActivity', String(Date.now()))
  const visibilityHandler = () => { if (document.visibilityState === 'visible') resetHandler() }
  const storageHandler = (e) => { if (e.key === 'lastActivity') /* 同步跨分頁活動時間 */ null }

  let intervalId = null

  const check = () => {
    if (!isLoggedIn.value) return
    const last = Number(localStorage.getItem('lastActivity') || Date.now())
    if (Date.now() - last >= timeout) {
      // 自動登出並導回 /login
      try { logout() } catch (e) { /* ignore */ }
      router.push('/login')
      localStorage.removeItem('lastActivity')
    }
  }

  const start = () => {
    resetHandler()
    intervalId = setInterval(check, checkInterval)
    events.forEach(e => window.addEventListener(e, resetHandler, true))
    document.addEventListener('visibilitychange', visibilityHandler)
    window.addEventListener('storage', storageHandler)
  }

  const stop = () => {
    if (intervalId) clearInterval(intervalId)
    events.forEach(e => window.removeEventListener(e, resetHandler, true))
    document.removeEventListener('visibilitychange', visibilityHandler)
    window.removeEventListener('storage', storageHandler)
  }

  onMounted(() => {
    start()
  })

  onBeforeUnmount(() => {
    stop()
  })

  // 若登入狀態改變，立即重置或清除
  watch(isLoggedIn, (v) => {
    if (v) resetHandler()
    else localStorage.removeItem('lastActivity')
  })
}