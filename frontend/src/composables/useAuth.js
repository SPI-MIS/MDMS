// src/composables/useAuth.js
import { ref } from 'vue';

const userId   = ref(localStorage.getItem('userId')   || '');
const userName = ref(localStorage.getItem('userName') || '');
const manager  = ref(localStorage.getItem('manager')  || '0');
const defaultPerms = { C: false, R: true, U: false, D: false, A: false }

function parsePerms(raw) { try { return raw ? JSON.parse(raw) : null } catch { return null } }

const perms = ref(parsePerms(localStorage.getItem('perms')) || { ...defaultPerms })

const isLoggedIn = ref(!!userId.value);

const login = ({ userId: id, userName: name, manager: mgr, perms: p }) => {
  userId.value   = id   ?? '';
  userName.value = name ?? '';
  manager.value  = String(mgr ?? '0');
  perms.value = (p && typeof p === 'object')? { C: !!p.C, R: !!p.R, U: !!p.U, D: !!p.D, A: !!p.A }: { ...defaultPerms };

  localStorage.setItem('userId', userId.value);
  localStorage.setItem('userName', userName.value);
  localStorage.setItem('manager', manager.value);
  localStorage.setItem('perms', JSON.stringify(perms.value));   // ✅ 存 perms
  isLoggedIn.value = !!userId.value;
};

const logout = () => {
  localStorage.clear();
  userId.value = '';
  userName.value = '';
  manager.value = '0';
  perms.value = { ...defaultPerms }
  isLoggedIn.value = false;
  location.reload();
  window.location.replace('/'); // 直接回首頁（並清掉上一頁歷史）
};

export function useAuth() {
  return { userId, userName, manager, perms, isLoggedIn, login, logout };
}
