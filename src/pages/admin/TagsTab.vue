<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import AdminModal from '@/components/admin/AdminModal.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'

const tags = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const page = ref(1)
const pageSize = 50
const total = ref(0)

// Create/Edit modal
const showForm = ref(false)
const formMode = ref('create')
const formName = ref('')
const editTagId = ref(null)
const saving = ref(false)

// Delete confirm
const showDelete = ref(false)
const deleteTarget = ref(null)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

async function fetchTags() {
  loading.value = true
  error.value = ''
  try {
    let url = `/admin/tags?page=${page.value}&pageSize=${pageSize}`
    if (search.value) url += `&keyword=${encodeURIComponent(search.value)}`
    const data = await api.get(url)
    tags.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openCreate() {
  formMode.value = 'create'
  formName.value = ''
  editTagId.value = null
  showForm.value = true
}

function openEdit(tag) {
  formMode.value = 'edit'
  formName.value = tag.name
  editTagId.value = tag.tagId
  showForm.value = true
}

async function saveTag() {
  if (!formName.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    if (formMode.value === 'create') {
      await api.post('/admin/tags', { name: formName.value.trim() })
    } else {
      await api.put(`/admin/tags/${editTagId.value}`, { name: formName.value.trim() })
    }
    showForm.value = false
    await fetchTags()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function confirmDelete(tag) {
  deleteTarget.value = tag
  showDelete.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  error.value = ''
  try {
    await api.delete(`/admin/tags/${deleteTarget.value.tagId}`)
    showDelete.value = false
    deleteTarget.value = null
    await fetchTags()
  } catch (e) {
    error.value = e.message
  }
}

function onSearch() {
  page.value = 1
  fetchTags()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    fetchTags()
  }
}

function nextPage() {
  if (page.value * pageSize < total.value) {
    page.value++
    fetchTags()
  }
}

onMounted(fetchTags)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>

  <div class="admin-toolbar">
    <input
      v-model="search"
      class="admin-toolbar__search"
      placeholder="搜索标签..."
      @keydown.enter="onSearch"
    />
    <div class="admin-toolbar__spacer"></div>
    <button class="admin-btn admin-btn--primary" @click="openCreate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      新增标签
    </button>
  </div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else>
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>标签名</th>
          <th>使用次数</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in tags" :key="tag.tagId">
          <td style="color: var(--color-text-tertiary); font-size: 13px; width: 60px;">{{ tag.tagId }}</td>
          <td style="font-weight: 600; color: var(--color-foreground);">{{ tag.name }}</td>
          <td style="color: var(--color-text-secondary);">{{ tag.useCount ?? 0 }}</td>
          <td style="color: var(--color-text-tertiary); font-size: 13px; white-space: nowrap;">{{ formatDate(tag.createTime) }}</td>
          <td>
            <div class="tags-actions">
              <button class="admin-btn admin-btn--sm admin-btn--outline" @click="openEdit(tag)">编辑</button>
              <button class="admin-btn admin-btn--sm admin-btn--destructive" @click="confirmDelete(tag)">删除</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="tags.length === 0" class="admin-empty">暂无标签数据</div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="admin-pagination">
      <button class="admin-pagination__btn" :disabled="page <= 1" @click="prevPage">上一页</button>
      <span class="admin-pagination__info">{{ page }} / {{ Math.ceil(total / pageSize) }} (共 {{ total }} 条)</span>
      <button class="admin-pagination__btn" :disabled="page * pageSize >= total" @click="nextPage">下一页</button>
    </div>
  </template>

  <!-- Create/Edit Modal -->
  <AdminModal
    :visible="showForm"
    :title="formMode === 'create' ? '新增标签' : '编辑标签'"
    width="360px"
    @close="showForm = false"
  >
    <div class="admin-form-group">
      <label class="admin-form-label">标签名称</label>
      <input
        v-model="formName"
        class="admin-form-input"
        placeholder="请输入标签名称"
        maxlength="50"
        @keydown.enter="saveTag"
      />
    </div>
    <template #footer>
      <button class="admin-btn admin-btn--outline" @click="showForm = false">取消</button>
      <button class="admin-btn admin-btn--primary" :disabled="saving || !formName.trim()" @click="saveTag">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </template>
  </AdminModal>

  <!-- Delete Confirm -->
  <AdminConfirm
    :visible="showDelete"
    title="删除标签"
    :message="`确定要删除标签「${deleteTarget?.name}」吗？此操作不可撤销。`"
    confirm-label="删除"
    variant="destructive"
    @confirm="doDelete"
    @cancel="showDelete = false"
  />
</template>

<style scoped>
.tags-actions {
  display: flex;
  gap: 8px;
}
</style>
