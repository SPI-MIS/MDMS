// src/composables/useAuth.js
import { ref } from 'vue';

const isLoggedIn = ref(!!localStorage.getItem('userId'));

const login = ({ userId, userName, manager }) => {
  localStorage.setItem('userId', userId);
  localStorage.setItem('userName', userName);
  localStorage.setItem('manager', manager);
  isLoggedIn.value = true;
};

const logout = () => {
  localStorage.clear();
  location.reload();
  isLoggedIn.value = false;
};

export function useAuth() {
  return { isLoggedIn, login, logout };
}
