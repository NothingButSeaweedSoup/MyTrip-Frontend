<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import api from '@/api'
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'

const router = useRouter()
const { user: currentUser } = useAuth()

const users = ref([])
const loading = ref(false)
const error = ref('')
const updating = ref(null)

const roleOptions = [
  { value: 0, label: '普通用户' },
  { value: 1, label: '审核员' },
  { value: 9, label: '管理员' },
]

function roleLabel(role) {
  return roleOptions.find(r => r.value === role)?.label || '未知'
}

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    users.value = await api.get('/admin/users')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function updateRole(userId, role) {
  updating.value = userId
  error.value = ''
  try {
    await api.put(`/admin/users/${userId}/role`, { role })
    const u = users.value.find(u => u.userId === userId)
    if (u) u.role = role
  } catch (e) {
    error.value = e.message
  } finally {
    updating.value = null
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

onMounted(fetchUsers)
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <div class="admin-page">
    <div class="admin-header">
      <button class="admin-header__back" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span>返回</span>
      </button>
      <h1 class="admin-header__title">管理面板</h1>
    </div>

    <div v-if="error" class="admin-error">{{ error }}</div>

    <div class="admin-body">
      <div v-if="loading" class="admin-loading">加载中...</div>

      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.userId" :class="{ 'admin-table__row--self': u.userId === currentUser?.userId }">
            <td class="admin-table__id">{{ u.userId }}</td>
            <td class="admin-table__username">{{ u.username }}</td>
            <td class="admin-table__email">{{ u.email }}</td>
            <td>
              <span class="admin-role-badge" :class="'admin-role-badge--' + u.role">
                {{ roleLabel(u.role) }}
              </span>
            </td>
            <td class="admin-table__date">{{ formatDate(u.createTime) }}</td>
            <td>
              <select
                v-if="u.userId !== currentUser?.userId"
                class="admin-role-select"
                :value="u.role"
                :disabled="updating === u.userId"
                @change="updateRole(u.userId, Number($event.target.value))"
              >
                <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span v-else class="admin-table__self-hint">当前用户</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  margin-top: 76px;
  height: calc(100vh - 76px);
  overflow-y: auto;
  background: var(--color-background);
}

/* ===== Header ===== */
.admin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin-header__back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.admin-header__back:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.admin-header__back svg {
  width: 18px;
  height: 18px;
}

.admin-header__title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

/* ===== Error ===== */
.admin-error {
  margin: 12px 24px 0;
  padding: 10px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--color-destructive);
  border-radius: 10px;
  font-size: 14px;
}

/* ===== Body ===== */
.admin-body {
  padding: 24px;
}

.admin-loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 15px;
}

/* ===== Table ===== */
.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

.admin-table th {
  background: var(--color-muted);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.admin-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-table tbody tr:hover {
  background: var(--color-surface-hover);
}

.admin-table__row--self {
  background: var(--color-muted);
}

.admin-table__id {
  color: var(--color-text-tertiary);
  font-size: 13px;
  width: 60px;
}

.admin-table__username {
  font-weight: 600;
  color: var(--color-foreground);
}

.admin-table__email {
  color: var(--color-text-secondary);
}

.admin-table__date {
  color: var(--color-text-tertiary);
  font-size: 13px;
  white-space: nowrap;
}

.admin-table__self-hint {
  color: var(--color-text-tertiary);
  font-size: 12px;
  font-style: italic;
}

/* ===== Role Badge ===== */
.admin-role-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.admin-role-badge--0 {
  background: var(--color-muted);
  color: var(--color-text-secondary);
}

.admin-role-badge--1 {
  background: #DBEAFE;
  color: #1D4ED8;
}

.admin-role-badge--9 {
  background: #FEF3C7;
  color: #B45309;
}

/* ===== Role Select ===== */
.admin-role-select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}

.admin-role-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-muted);
}

.admin-role-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .admin-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }

  .admin-body {
    padding: 16px;
  }

  .admin-table th,
  .admin-table td {
    padding: 8px 10px;
    font-size: 12px;
  }

  .admin-table__email,
  .admin-table__date {
    display: none;
  }
}
</style>
