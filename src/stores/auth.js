import { ref, computed } from 'vue'
import api from '@/api'

const token = ref(localStorage.getItem('token') || '')
const user = ref(null)
const loading = ref(false)

export const isLoggedIn = computed(() => !!token.value)

export function useAuth() {
  async function login(email, password) {
    loading.value = true
    try {
      const data = await api.post('/user/login', { email, password })
      token.value = data.token
      user.value = data.userInfo
      localStorage.setItem('token', data.token)
      return data
    } finally {
      loading.value = false
    }
  }

  async function register(username, email, password) {
    loading.value = true
    try {
      const data = await api.post('/user/register', { username, email, password })
      return data
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      user.value = await api.get('/user/me')
    } catch {
      token.value = ''
      user.value = null
      localStorage.removeItem('token')
    }
  }

  async function logout() {
    try {
      await api.post('/user/logout')
    } catch {
      // ignore
    }
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  function init() {
    if (token.value) {
      fetchUser()
    }
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    login,
    register,
    fetchUser,
    logout,
    init
  }
}
