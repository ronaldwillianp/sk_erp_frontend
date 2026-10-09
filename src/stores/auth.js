import { defineStore } from 'pinia';
import api from '@/utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('auth_token') || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userName: (state) => {
      if (!state.user) return '';
      const full = `${state.user.first_name} ${state.user.last_name}`.trim();
      return full || state.user.username;
    },
    userInitials: (state) => {
      if (!state.user) return '';
      const first = state.user.first_name?.[0] || state.user.username?.[0] || '';
      const last = state.user.last_name?.[0] || '';
      return (first + last).toUpperCase();
    },
  },

  actions: {
    async login(credentials) {
      try {
        const response = await api.post('auth/login/', credentials);
        
        this.token = response.data.token;
        this.user = response.data.user;

        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));

        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return { 
          success: false, 
          message: error.response?.data?.detail || 'Credenciales inválidas' 
        };
      }
    },

    async logout() {
      try {
        await api.post('auth/logout/');
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    },
    
    updateUser(userData) {
    this.user = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  },
  },
});