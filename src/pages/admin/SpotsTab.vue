<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'

const spots = ref([])
const tags = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const cityFilter = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

// Form modal
const showForm = ref(false)
const formMode = ref('create')
const editSpotId = ref(null)
const saving = ref(false)
const form = ref(emptyForm())

// Status confirm
const showStatusConfirm = ref(false)
const statusTarget = ref(null)

// Import
const importLoading = ref(false)
const fileInput = ref(null)

function emptyForm() {
  return {
    name: '', city: '', address: '',
    latitude: '', longitude: '',
    description: '', rating: 4.0, visitDuration: 60,
    openTime: '', phone: '', coverImage: '',
    tagIds: [],
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function statusLabel(s) {
  return s === 0 ? '正常' : '已下架'
}

async function fetchSpots() {
  loading.value = true
  error.value = ''
  try {
    let url = `/admin/scenic-spots?page=${page.value}&pageSize=${pageSize}`
    if (search.value) url += `&keyword=${encodeURIComponent(search.value)}`
    if (cityFilter.value) url += `&city=${encodeURIComponent(cityFilter.value)}`
    const data = await api.get(url)
    spots.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchTags() {
  try {
    const data = await api.get('/admin/tags?page=1&pageSize=200')
    tags.value = data.records || []
  } catch { /* ignore */ }
}

function openCreate() {
  formMode.value = 'create'
  editSpotId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function openEdit(spot) {
  formMode.value = 'edit'
  editSpotId.value = spot.spotId
  form.value = {
    name: spot.name || '',
    city: spot.city || '',
    address: spot.address || '',
    latitude: spot.latitude ?? '',
    longitude: spot.longitude ?? '',
    description: spot.description || '',
    rating: spot.rating ?? 4.0,
    visitDuration: spot.visitDuration ?? 60,
    openTime: spot.openTime || '',
    phone: spot.phone || '',
    coverImage: spot.coverImage || '',
    tagIds: [],
  }
  showForm.value = true
}

async function saveSpot() {
  if (!form.value.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    const body = { ...form.value }
    if (body.latitude === '') body.latitude = null
    if (body.longitude === '') body.longitude = null
    if (formMode.value === 'create') {
      await api.post('/admin/scenic-spots', body)
    } else {
      await api.put(`/admin/scenic-spots/${editSpotId.value}`, body)
    }
    showForm.value = false
    await fetchSpots()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function confirmToggleStatus(spot) {
  statusTarget.value = spot
  showStatusConfirm.value = true
}

async function doToggleStatus() {
  if (!statusTarget.value) return
  error.value = ''
  try {
    const newStatus = statusTarget.value.status === 0 ? 1 : 0
    await api.put(`/admin/scenic-spots/${statusTarget.value.spotId}/status`, { status: newStatus })
    showStatusConfirm.value = false
    statusTarget.value = null
    await fetchSpots()
  } catch (e) {
    error.value = e.message
  }
}

async function handleImport() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  importLoading.value = true
  error.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    const headers = {}
    const token = localStorage.getItem('token')
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/v1/admin/scenic-spots/import', { method: 'POST', headers, body: formData })
    const json = await res.json()
    if (json.code !== 0) throw new Error(json.message || '导入失败')
    fileInput.value.value = ''
    await fetchSpots()
  } catch (e) {
    error.value = e.message
  } finally {
    importLoading.value = false
  }
}

function onSearch() {
  page.value = 1
  fetchSpots()
}

function prevPage() {
  if (page.value > 1) { page.value--; fetchSpots() }
}

function nextPage() {
  if (page.value * pageSize < total.value) { page.value++; fetchSpots() }
}

onMounted(() => {
  fetchSpots()
  fetchTags()
})
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>

  <div class="admin-toolbar">
    <input v-model="search" class="admin-toolbar__search" placeholder="搜索景点..." @keydown.enter="onSearch" />
    <input v-model="cityFilter" class="admin-toolbar__search" style="max-width: 160px;" placeholder="城市筛选..." @keydown.enter="onSearch" />
    <div class="admin-toolbar__spacer"></div>
    <button class="admin-btn admin-btn--outline" :disabled="importLoading" @click="fileInput?.click()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      {{ importLoading ? '导入中...' : '导入CSV' }}
    </button>
    <input ref="fileInput" type="file" accept=".csv" style="display:none" @change="handleImport" />
    <button class="admin-btn admin-btn--primary" @click="openCreate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      新增景点
    </button>
  </div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else>
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>城市</th>
          <th>评分</th>
          <th>游玩时长</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="spot in spots" :key="spot.spotId">
          <td style="color:var(--color-text-tertiary);font-size:13px;width:60px;">{{ spot.spotId }}</td>
          <td style="font-weight:600;color:var(--color-foreground);">
            <div class="spots-name">
              <img v-if="spot.coverImage" :src="spot.coverImage" class="spots-thumb" @error="e => e.target.style.display='none'" />
              <span>{{ spot.name }}</span>
            </div>
          </td>
          <td style="color:var(--color-text-secondary);">{{ spot.city || '-' }}</td>
          <td style="color:var(--color-text-secondary);">{{ spot.rating ?? '-' }}</td>
          <td style="color:var(--color-text-secondary);">{{ spot.visitDuration ? spot.visitDuration + '分钟' : '-' }}</td>
          <td>
            <span class="admin-badge" :class="'admin-badge--status-' + spot.status">{{ statusLabel(spot.status) }}</span>
          </td>
          <td>
            <div class="spots-actions">
              <button class="admin-btn admin-btn--sm admin-btn--outline" @click="openEdit(spot)">编辑</button>
              <button
                class="admin-btn admin-btn--sm"
                :class="spot.status === 0 ? 'admin-btn--destructive' : 'admin-btn--primary'"
                @click="confirmToggleStatus(spot)"
              >{{ spot.status === 0 ? '下架' : '上架' }}</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="spots.length === 0" class="admin-empty">暂无景点数据</div>

    <div v-if="total > pageSize" class="admin-pagination">
      <button class="admin-pagination__btn" :disabled="page <= 1" @click="prevPage">上一页</button>
      <span class="admin-pagination__info">{{ page }} / {{ Math.ceil(total / pageSize) }} (共 {{ total }} 条)</span>
      <button class="admin-pagination__btn" :disabled="page * pageSize >= total" @click="nextPage">下一页</button>
    </div>
  </template>

  <!-- Create/Edit Modal -->
  <AdminModal :visible="showForm" :title="formMode === 'create' ? '新增景点' : '编辑景点'" width="640px" @close="showForm = false">
    <div class="spots-form">
      <div class="admin-form-group">
        <label class="admin-form-label">景点名称 *</label>
        <input v-model="form.name" class="admin-form-input" placeholder="请输入景点名称" maxlength="100" />
      </div>
      <div class="admin-form-row">
        <div class="admin-form-group">
          <label class="admin-form-label">城市</label>
          <input v-model="form.city" class="admin-form-input" placeholder="如: 广州" maxlength="50" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">评分 (0-5)</label>
          <input v-model.number="form.rating" type="number" class="admin-form-input" min="0" max="5" step="0.1" />
        </div>
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">地址</label>
        <input v-model="form.address" class="admin-form-input" placeholder="详细地址" maxlength="200" />
      </div>
      <div class="admin-form-row">
        <div class="admin-form-group">
          <label class="admin-form-label">纬度</label>
          <input v-model="form.latitude" type="number" class="admin-form-input" min="-90" max="90" step="0.000001" placeholder="-90 ~ 90" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">经度</label>
          <input v-model="form.longitude" type="number" class="admin-form-input" min="-180" max="180" step="0.000001" placeholder="-180 ~ 180" />
        </div>
      </div>
      <div class="admin-form-row">
        <div class="admin-form-group">
          <label class="admin-form-label">游玩时长 (分钟)</label>
          <input v-model.number="form.visitDuration" type="number" class="admin-form-input" min="0" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">开放时间</label>
          <input v-model="form.openTime" class="admin-form-input" placeholder="如: 08:00-18:00" maxlength="100" />
        </div>
      </div>
      <div class="admin-form-row">
        <div class="admin-form-group">
          <label class="admin-form-label">电话</label>
          <input v-model="form.phone" class="admin-form-input" placeholder="联系电话" maxlength="20" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">封面图URL</label>
          <input v-model="form.coverImage" class="admin-form-input" placeholder="图片链接" maxlength="500" />
        </div>
      </div>
      <div class="admin-form-group">
        <label class="admin-form-label">简介</label>
        <textarea v-model="form.description" class="admin-form-textarea" placeholder="景点简介" maxlength="2000" rows="4"></textarea>
      </div>
    </div>
    <template #footer>
      <button class="admin-btn admin-btn--outline" @click="showForm = false">取消</button>
      <button class="admin-btn admin-btn--primary" :disabled="saving || !form.name.trim()" @click="saveSpot">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </AdminModal>

  <!-- Status Confirm -->
  <AdminConfirm
    :visible="showStatusConfirm"
    :title="statusTarget?.status === 0 ? '下架景点' : '上架景点'"
    :message="`确定要${statusTarget?.status === 0 ? '下架' : '上架'}「${statusTarget?.name}」吗？`"
    :confirm-label="statusTarget?.status === 0 ? '下架' : '上架'"
    :variant="statusTarget?.status === 0 ? 'destructive' : 'primary'"
    @confirm="doToggleStatus"
    @cancel="showStatusConfirm = false"
  />
</template>

<style scoped>
.spots-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spots-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.spots-actions {
  display: flex;
  gap: 8px;
}

.spots-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}
</style>
