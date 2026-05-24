<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'

const router = useRouter()
const diffScroll = ref(localStorage.getItem('diffScroll') !== 'false')

watch(diffScroll, (val) => {
  localStorage.setItem('diffScroll', val ? 'true' : 'false')
})
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <main class="settings-page">
    <div class="settings-card">
      <h1 class="settings-title">设置</h1>

      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">差速滑动</span>
          <span class="settings-item__desc">首页瀑布流各列以不同速度滚动</span>
        </div>
        <label class="settings-toggle">
          <input type="checkbox" v-model="diffScroll" />
          <span class="settings-toggle__track"></span>
        </label>
      </div>

      <hr class="settings-divider" />

      <div class="settings-item settings-item--clickable" @click="router.push('/settings/password')">
        <div class="settings-item__info">
          <span class="settings-item__label">修改密码</span>
          <span class="settings-item__desc">更改登录密码</span>
        </div>
        <svg class="settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px 80px;
}

.settings-card {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px;
  background: var(--color-surface);
  border-radius: 16px;
}

.settings-title {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 24px;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
}

.settings-item--clickable {
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.settings-item--clickable:hover {
  opacity: 0.7;
}

.settings-item__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-item__label {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-foreground);
}

.settings-item__desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* Toggle */
.settings-toggle {
  cursor: pointer;
  flex-shrink: 0;
}

.settings-toggle input {
  display: none;
}

.settings-toggle__track {
  display: block;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: var(--color-border);
  position: relative;
  transition: background var(--transition-fast);
}

.settings-toggle__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.settings-toggle input:checked + .settings-toggle__track {
  background: var(--color-primary);
}

.settings-toggle input:checked + .settings-toggle__track::after {
  transform: translateX(20px);
}

.settings-arrow {
  width: 20px;
  height: 20px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.settings-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0;
}

@media (max-width: 768px) {
  .settings-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px;
  }

  .settings-card {
    padding: 20px;
  }
}
</style>
