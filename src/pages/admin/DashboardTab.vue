<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const emit = defineEmits(['switch-tab'])

const stats = ref(null)
const loading = ref(false)
const error = ref('')

async function fetchDashboard() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await api.get('/admin/dashboard')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const primaryStats = [
  { key: 'totalUsers', label: '总用户', icon: 'users', color: '#16A34A' },
  { key: 'totalPosts', label: '总帖子', icon: 'posts', color: '#2563EB' },
  { key: 'totalScenicSpots', label: '总景点', icon: 'spots', color: '#7C3AED' },
  { key: 'totalComments', label: '总评论', icon: 'comments', color: '#0D9488' },
]

const secondaryStats = [
  { key: 'todayNewUsers', label: '今日新增用户', icon: 'user-plus', highlight: true },
  { key: 'todayNewPosts', label: '今日新增帖子', icon: 'file-plus', highlight: true },
  { key: 'pendingReviewPosts', label: '待审核帖子', icon: 'clock', warn: true },
  { key: 'pendingReviewComments', label: '待审核评论', icon: 'alert', warn: true },
]

const quickActions = [
  { label: '用户管理', tab: 'users', icon: 'users' },
  { label: '景点管理', tab: 'spots', icon: 'spots' },
  { label: '标签管理', tab: 'tags', icon: 'tags' },
  { label: '去审核帖子', path: '/review', icon: 'clipboard' },
]

function formatNum(n) {
  if (n == null) return '0'
  return n.toLocaleString()
}

onMounted(fetchDashboard)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else-if="stats">
    <!-- Primary Stats -->
    <div class="dash-grid dash-grid--primary">
      <div v-for="s in primaryStats" :key="s.key" class="dash-card">
        <div class="dash-card__icon" :style="{ background: s.color + '15', color: s.color }">
          <svg v-if="s.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <svg v-else-if="s.icon === 'posts'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <svg v-else-if="s.icon === 'spots'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <svg v-else-if="s.icon === 'comments'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="dash-card__info">
          <span class="dash-card__value" :style="{ color: s.color }">{{ formatNum(stats[s.key]) }}</span>
          <span class="dash-card__label">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <!-- Secondary Stats -->
    <div class="dash-grid dash-grid--secondary">
      <div v-for="s in secondaryStats" :key="s.key" class="dash-card dash-card--sm">
        <div class="dash-card__icon-sm">
          <svg v-if="s.icon === 'user-plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <svg v-else-if="s.icon === 'file-plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          <svg v-else-if="s.icon === 'clock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <svg v-else-if="s.icon === 'alert'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="dash-card__info">
          <span class="dash-card__value-sm" :class="{ 'dash-card__value--green': s.highlight && stats[s.key] > 0, 'dash-card__value--amber': s.warn && stats[s.key] > 0 }">
            {{ formatNum(stats[s.key]) }}
          </span>
          <span class="dash-card__label">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="dash-section">
      <h3 class="dash-section__title">快捷操作</h3>
      <div class="dash-actions">
        <button
          v-for="action in quickActions"
          :key="action.tab || action.path"
          class="dash-action-btn"
          @click="action.tab ? emit('switch-tab', action.tab) : router.push(action.path)"
        >
          <svg v-if="action.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <svg v-else-if="action.icon === 'spots'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <svg v-else-if="action.icon === 'tags'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <svg v-else-if="action.icon === 'clipboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.dash-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.dash-grid--primary {
  grid-template-columns: repeat(4, 1fr);
}

.dash-grid--secondary {
  grid-template-columns: repeat(4, 1fr);
}

.dash-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.dash-card--sm {
  padding: 16px 20px;
}

.dash-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dash-card__icon svg {
  width: 24px;
  height: 24px;
}

.dash-card__icon-sm {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-muted);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dash-card__icon-sm svg {
  width: 20px;
  height: 20px;
}

.dash-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dash-card__value {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.dash-card__value-sm {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.dash-card__value--green { color: #059669; }
.dash-card__value--amber { color: #D97706; }

.dash-card__label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Section */
.dash-section {
  margin-bottom: 24px;
}

.dash-section__title {
  font-family: var(--font-heading);
  font-size: 16px;
  color: var(--color-foreground);
  margin-bottom: 14px;
}

.dash-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dash-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dash-action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-muted);
}

.dash-action-btn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 1024px) {
  .dash-grid--primary,
  .dash-grid--secondary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dash-grid--primary,
  .dash-grid--secondary {
    grid-template-columns: 1fr;
  }

  .dash-card__value {
    font-size: 22px;
  }

  .dash-actions {
    flex-direction: column;
  }
}
</style>
