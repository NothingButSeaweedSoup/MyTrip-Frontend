<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { isLoggedIn, useAuth } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const { user, logout } = useAuth()

const navItems = computed(() => {
  if (isLoggedIn.value) {
    const items = [
      { id: 'home', label: '推荐', icon: 'home', path: '/' },
      { id: 'profile', label: '个人', icon: 'user', path: '/profile' },
      { id: 'favorite', label: '收藏', icon: 'star', path: '/favorites' },
      { id: 'trip', label: '行程', icon: 'map', path: '/trip' },
      { id: 'publish', label: '发布', icon: 'upload', path: '/publish' },
    ]
    if (user.value?.role === 9) {
      items.push({ id: 'admin', label: '管理', icon: 'shield', path: '/admin' })
    }
    if (user.value?.role === 1 || user.value?.role === 9) {
      items.push({ id: 'review', label: '审核', icon: 'clipboard', path: '/review' })
    }
    items.push({ id: 'settings', label: '设置', icon: 'settings', path: '/settings' })
    return items
  }
  return [
    { id: 'home', label: '推荐', icon: 'home', path: '/' },
    { id: 'login', label: '登录', icon: 'login', path: '/login' },
    { id: 'favorite', label: '收藏', icon: 'star', path: '/favorites' },
    { id: 'publish', label: '发布', icon: 'upload', path: '/publish' },
    { id: 'settings', label: '设置', icon: 'settings', path: '/settings' },
  ]
})

const activeItem = computed(() => {
  if (route.path === '/login') return 'login'
  if (route.path === '/profile') return 'profile'
  if (route.path === '/favorites') return 'favorite'
  if (route.path === '/trip') return 'trip'
  if (route.path === '/settings') return 'settings'
  if (route.path === '/publish') return 'publish'
  if (route.path === '/admin') return 'admin'
  if (route.path === '/review') return 'review'
  return 'home'
})

const expanded = ref(false)

const handleNavClick = (item) => {
  router.push(item.path)
}
</script>

<template>
  <nav
    class="sidebar"
    :class="{ 'sidebar--expanded': expanded }"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <ul class="sidebar-nav">
      <li
        v-for="item in navItems"
        :key="item.id"
        class="sidebar-item"
        :class="{ 'sidebar-item--active': activeItem === item.id }"
        @click="handleNavClick(item)"
      >
        <a href="#" class="sidebar-link" @click.prevent>


          <!-- Home icon -->
          <svg v-if="item.icon === 'home'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <!-- Login icon -->
          <svg v-else-if="item.icon === 'login'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <!-- User icon -->
          <svg v-else-if="item.icon === 'user'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <!-- Star icon -->
          <svg v-else-if="item.icon === 'star'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <!-- Map icon -->
          <svg v-else-if="item.icon === 'map'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/>
            <line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          <!-- Upload icon -->
          <svg v-else-if="item.icon === 'upload'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <!-- Shield icon -->
          <svg v-else-if="item.icon === 'shield'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <!-- Clipboard icon -->
          <svg v-else-if="item.icon === 'clipboard'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          </svg>
          <!-- Settings icon -->
          <svg v-else-if="item.icon === 'settings'" class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span class="sidebar-label">{{ item.label }}</span>
        </a>
      </li>
    </ul>

    <div v-if="isLoggedIn" class="sidebar-footer">
      <a href="#" class="sidebar-link sidebar-logout" @click.prevent="logout">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span class="sidebar-label">退出</span>
      </a>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: var(--sidebar-collapsed);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 76px;
  transition: width var(--transition-smooth), box-shadow var(--transition-smooth);
  overflow: hidden;
  white-space: nowrap;
}

.sidebar--expanded {
  width: var(--sidebar-expanded);
  box-shadow: var(--shadow-lg);
}

.sidebar-nav {
  list-style: none;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
  border-radius: 8px;
  margin: 0 6px;
  cursor: pointer;
}

.sidebar-link:hover {
  color: var(--color-primary);
  background: var(--color-background);
}

.sidebar-item--active .sidebar-link {
  color: var(--color-primary);
  font-weight: 600;
}

.sidebar-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.sidebar-label {
  opacity: 0;
  transition: opacity 100ms ease;
}

.sidebar--expanded .sidebar-label {
  opacity: 1;
  transition-delay: 100ms;
}

@media (max-width: 768px) {
  .sidebar {
    width: 48px;
    padding-top: 64px;
  }
  .sidebar--expanded {
    width: 160px;
  }
  .sidebar-link {
    padding: 10px 12px;
    margin: 0 4px;
  }
  .sidebar-icon {
    width: 20px;
    height: 20px;
  }
}

.sidebar-footer {
  margin-top: auto;
  width: 100%;
  padding-bottom: 16px;
}

.sidebar-logout {
  color: var(--color-text-tertiary);
}

.sidebar-logout:hover {
  color: var(--color-primary);
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar-label {
    transition: none;
  }
}
</style>
