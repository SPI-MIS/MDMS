// src/composables/useAuth.js
import { ref } from 'vue';

const userId   = ref(localStorage.getItem('userId')   || '');
const userName = ref(localStorage.getItem('userName') || '');
const manager  = ref(localStorage.getItem('manager')  || '0');
const admin  = ref(localStorage.getItem('admin')  || '0');
const token  = ref(localStorage.getItem('token')  || '');
const defaultPerms = { C: false, R: true, U: false, D: false, A: false }

function parsePerms(raw) { try { return raw ? JSON.parse(raw) : null } catch { return null } }

const perms = ref(parsePerms(localStorage.getItem('perms')) || { ...defaultPerms })

const isLoggedIn = ref(!!userId.value);
const hasOvertimePerm  = ref(localStorage.getItem('hasOvertimePerm')  === 'true');
const canViewSummary   = ref(localStorage.getItem('canViewSummary')   === 'true');

const setOvertimePerm = (val) => {
  hasOvertimePerm.value = !!val;
  localStorage.setItem('hasOvertimePerm', val ? 'true' : 'false');
};
const setSummaryPerm = (val) => {
  canViewSummary.value = !!val;
  localStorage.setItem('canViewSummary', val ? 'true' : 'false');
};

const login = ({ userId: id, userName: name, manager: mgr, admin: amn, perms: p, token: t }) => {
  userId.value   = id   ?? '';
  userName.value = name ?? '';
  manager.value  = String(mgr ?? '0');
  admin.value  = String(amn ?? '0');
  token.value  = t ?? '';
  perms.value = (p && typeof p === 'object')? { C: !!p.C, R: !!p.R, U: !!p.U, D: !!p.D, A: !!p.A }: { ...defaultPerms };

  localStorage.setItem('userId', userId.value);
  localStorage.setItem('userName', userName.value);
  localStorage.setItem('manager', manager.value);
  localStorage.setItem('admin', admin.value);
  localStorage.setItem('token', token.value);
  localStorage.setItem('perms', JSON.stringify(perms.value));   // ✅ 存 perms
  isLoggedIn.value = !!userId.value;
};

const logout = () => {
  localStorage.clear();
  userId.value = '';
  userName.value = '';
  manager.value = '0';
  admin.value = '0';
  token.value = '';
  perms.value = { ...defaultPerms }
  hasOvertimePerm.value = false;
  canViewSummary.value  = false;
  isLoggedIn.value = false;
  location.reload();
  window.location.replace('/');
};

export function useAuth() {
  return { userId, userName, manager, admin, token, perms, isLoggedIn, login, logout, hasOvertimePerm, setOvertimePerm, canViewSummary, setSummaryPerm };
}
