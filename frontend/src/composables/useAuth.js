// src/composables/useAuth.js
import { ref } from 'vue';

const userId   = ref(localStorage.getItem('userId')   || '');
const userName = ref(localStorage.getItem('userName') || '');
const manager  = ref(localStorage.getItem('manager')  || '0');

const isLoggedIn = ref(!!userId.value);

const login = ({ userId: id, userName: name, manager: mgr }) => {
  userId.value   = id   ?? '';
  userName.value = name ?? '';
  manager.value  = String(mgr ?? '0');

  localStorage.setItem('userId', userId.value);
  localStorage.setItem('userName', userName.value);
  localStorage.setItem('manager', manager.value);
  isLoggedIn.value = !!userId.value;
};

const logout = () => {
  localStorage.clear();
  userId.value = '';
  userName.value = '';
  manager.value = '0';
  isLoggedIn.value = false;
  location.reload();
};

export function useAuth() {
  return { userId, userName, manager, isLoggedIn, login, logout };
}
