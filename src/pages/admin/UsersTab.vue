<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/stores/auth'
import api from '@/api'
import AdminModal from '@/components/admin/AdminModal.vue'

const { user: currentUser } = useAuth()

const users = ref([])
const loading = ref(false)
const error = ref('')
const updating = ref(null)
const search = ref('')

// Detail modal
const showDetail = ref(false)
const detailUser = ref(null)
const detailLoading = ref(false)

const roleOptions = [
  { value: 0, label: '普通用户' },
  { value: 1, label: '审核员' },
  { value: 9, label: '管理员' },
]

function roleLabel(role) {
  return roleOptions.find(r => r.value === role)?.label || '未知'
}

function statusLabel(status) {
  return status === 0 ? '正常' : '已禁用'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const q = search.value.toLowerCase()
  return users.value.filter(u =>
    u.username?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q)
  )
})

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

async function toggleStatus(userId, currentStatus) {
  updating.value = userId
  error.value = ''
  try {
    const newStatus = currentStatus === 0 ? 1 : 0
    await api.put(`/admin/users/${userId}/status`, { status: newStatus })
    const u = users.value.find(u => u.userId === userId)
    if (u) u.status = newStatus
  } catch (e) {
    error.value = e.message
  } finally {
    updating.value = null
  }
}

async function viewDetail(userId) {
  showDetail.value = true
  detailLoading.value = true
  detailUser.value = null
  try {
    detailUser.value = await api.get(`/admin/users/${userId}/detail`)
  } catch (e) {
    error.value = e.message
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>

  <div class="admin-toolbar">
    <input
      v-model="search"
      class="admin-toolbar__search"
      placeholder="搜索用户名或邮箱..."
    />
  </div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <table v-else class="admin-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>用户名</th>
        <th>邮箱</th>
        <th>角色</th>
        <th>状态</th>
        <th>注册时间</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="u in filteredUsers" :key="u.userId">
        <td style="color: var(--color-text-tertiary); font-size: 13px; width: 60px;">{{ u.userId }}</td>
        <td style="font-weight: 600; color: var(--color-foreground);">{{ u.username }}</td>
        <td style="color: var(--color-text-secondary);">{{ u.email }}</td>
        <td>
          <span class="admin-badge" :class="'admin-badge--role-' + u.role">
            {{ roleLabel(u.role) }}
          </span>
        </td>
        <td>
          <span class="admin-badge" :class="'admin-badge--status-' + u.status">
            {{ statusLabel(u.status) }}
          </span>
        </td>
        <td style="color: var(--color-text-tertiary); font-size: 13px; white-space: nowrap;">{{ formatDate(u.createTime) }}</td>
        <td>
          <div class="users-actions">
            <select
              v-if="u.userId !== currentUser?.userId"
              class="admin-select"
              :value="u.role"
              :disabled="updating === u.userId"
              @change="updateRole(u.userId, Number($event.target.value))"
            >
              <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button
              v-if="u.userId !== currentUser?.userId"
              class="admin-btn admin-btn--sm"
              :class="u.status === 0 ? 'admin-btn--destructive' : 'admin-btn--primary'"
              :disabled="updating === u.userId"
              @click="toggleStatus(u.userId, u.status)"
            >
              {{ u.status === 0 ? '禁用' : '启用' }}
            </button>
            <button class="admin-btn admin-btn--sm admin-btn--outline" @click="viewDetail(u.userId)">
              详情
            </button>
            <span v-if="u.userId === currentUser?.userId" class="users-self-hint">当前用户</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Detail Modal -->
  <AdminModal :visible="showDetail" title="用户详情" width="520px" @close="showDetail = false">
    <div v-if="detailLoading" class="admin-loading" style="padding: 24px 0;">加载中...</div>
    <template v-else-if="detailUser">
      <div class="user-detail">
        <div class="user-detail__header">
          <div class="user-detail__avatar">
            <img :src="detailUser.avatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
          </div>
          <div>
            <h3 class="user-detail__name">{{ detailUser.username }}</h3>
            <p class="user-detail__email">{{ detailUser.email }}</p>
          </div>
        </div>

        <p v-if="detailUser.bio" class="user-detail__bio">{{ detailUser.bio }}</p>

        <div class="user-detail__stats">
          <div class="user-detail__stat">
            <span class="user-detail__stat-num">{{ detailUser.postCount ?? 0 }}</span>
            <span class="user-detail__stat-label">帖子</span>
          </div>
          <div class="user-detail__stat">
            <span class="user-detail__stat-num">{{ detailUser.favoriteCount ?? 0 }}</span>
            <span class="user-detail__stat-label">收藏</span>
          </div>
          <div class="user-detail__stat">
            <span class="user-detail__stat-num">{{ detailUser.tripCount ?? 0 }}</span>
            <span class="user-detail__stat-label">行程</span>
          </div>
        </div>

        <div class="user-detail__meta">
          <span>角色: <span class="admin-badge" :class="'admin-badge--role-' + detailUser.role">{{ roleLabel(detailUser.role) }}</span></span>
          <span>状态: <span class="admin-badge" :class="'admin-badge--status-' + detailUser.status">{{ statusLabel(detailUser.status) }}</span></span>
          <span>注册: {{ formatDate(detailUser.createTime) }}</span>
        </div>

        <div v-if="detailUser.recentPosts?.length" class="user-detail__section">
          <h4 class="user-detail__section-title">最近帖子</h4>
          <div v-for="p in detailUser.recentPosts" :key="p.postId" class="user-detail__item">
            <span class="user-detail__item-title">{{ p.title || '无标题' }}</span>
            <span class="user-detail__item-time">{{ formatDate(p.createTime) }}</span>
          </div>
        </div>

        <div v-if="detailUser.recentTrips?.length" class="user-detail__section">
          <h4 class="user-detail__section-title">最近行程</h4>
          <div v-for="t in detailUser.recentTrips" :key="t.tripId" class="user-detail__item">
            <span class="user-detail__item-title">{{ t.title || '未命名行程' }}</span>
          </div>
        </div>
      </div>
    </template>
  </AdminModal>
</template>

<style scoped>
.users-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-self-hint {
  color: var(--color-text-tertiary);
  font-size: 12px;
  font-style: italic;
}

/* Detail */
.user-detail__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.user-detail__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  flex-shrink: 0;
}

.user-detail__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-detail__name {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
}

.user-detail__email {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.user-detail__bio {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.user-detail__stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.user-detail__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.user-detail__stat-num {
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

.user-detail__stat-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.user-detail__meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.user-detail__section {
  margin-top: 12px;
}

.user-detail__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.user-detail__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.user-detail__item:last-child {
  border-bottom: none;
}

.user-detail__item-title {
  color: var(--color-text);
}

.user-detail__item-time {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
</style>
