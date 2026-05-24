<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, useAuth } from '@/stores/auth'
import api from '@/api'

const router = useRouter()
const { user } = useAuth()

const searchQuery = ref('')
const searchFocused = ref(false)

async function handleSearch() {
  if (searchQuery.value.trim()) {
    try {
      await api.get(`/search?keyword=${encodeURIComponent(searchQuery.value.trim())}&page=1&pageSize=20`)
      // TODO: navigate to search results page
    } catch {
      // ignore
    }
  }
}

function handleAvatarClick() {
  if (isLoggedIn.value) {
    router.push('/')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <header class="search-bar">
    <div class="search-container" :class="{ 'search-container--focused': searchFocused }">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索你感兴趣的旅行内容..."
        @focus="searchFocused = true"
        @blur="searchFocused = false"
        @keydown.enter="handleSearch"
      >
    </div>
    <div class="user-avatar" :class="{ 'user-avatar--logged': isLoggedIn }" @click="handleAvatarClick" :title="isLoggedIn ? (user?.username || '个人中心') : '登录'">
      <img v-if="isLoggedIn" :src="user?.avatar || '/Akari.jpg'" class="user-avatar__img" @error="e => e.target.src = '/Akari.jpg'" />
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <span v-if="isLoggedIn && user" class="user-avatar__name">{{ user.username }}</span>
    </div>
  </header>
</template>

<style scoped>
.search-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  background: linear-gradient(180deg, var(--color-background) 70%, transparent);
  gap: 16px;
}

.search-container {
  position: relative;
  width: 100%;
  max-width: 520px;
  transition: transform var(--transition-fast);
}

.search-container--focused {
  transform: scale(1.02);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 20px 12px 48px;
  font-size: 14px;
  font-family: var(--font-body);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(225, 29, 72, 0.12);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.user-avatar svg {
  width: 22px;
  height: 22px;
  color: var(--color-text-secondary);
}

.user-avatar:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.user-avatar--logged {
  width: auto;
  border-radius: 20px;
  padding: 0 12px 0 6px;
  gap: 6px;
  display: flex;
  align-items: center;
}

.user-avatar__img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar--logged svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.user-avatar__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .search-bar {
    padding: 12px 12px;
  }
  .search-input {
    font-size: 13px;
    padding: 10px 14px 10px 40px;
  }
}
</style>
