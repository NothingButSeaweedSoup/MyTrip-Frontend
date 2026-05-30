<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import AdminModal from '@/components/admin/AdminModal.vue'

const records = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const targetType = ref('')

// Detail modal
const showDetail = ref(false)
const detailRecord = ref(null)

function decisionLabel(d) {
  const map = { '通过': '通过', '驳回': '驳回', '转人工': '转人工' }
  return map[d] || d || '-'
}

function decisionClass(d) {
  if (d === '通过') return 'admin-badge--approve'
  if (d === '驳回') return 'admin-badge--reject'
  if (d === '转人工') return 'admin-badge--transfer'
  return ''
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

function truncate(str, len) {
  if (!str) return '-'
  return str.length > len ? str.slice(0, len) + '...' : str
}

async function fetchRecords() {
  loading.value = true
  error.value = ''
  try {
    let url = `/admin/audit-history?page=${page.value}&pageSize=${pageSize}`
    if (targetType.value) url += `&targetType=${targetType.value}`
    const data = await api.get(url)
    records.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function viewDetail(record) {
  detailRecord.value = record
  showDetail.value = true
}

function onFilter() {
  page.value = 1
  fetchRecords()
}

function prevPage() {
  if (page.value > 1) { page.value--; fetchRecords() }
}

function nextPage() {
  if (page.value * pageSize < total.value) { page.value++; fetchRecords() }
}

onMounted(fetchRecords)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>

  <div class="admin-toolbar">
    <div style="font-size:13px;color:var(--color-text-tertiary);">审核记录（仅帖子）</div>
    <div class="admin-toolbar__spacer"></div>
    <span class="audit-count">共 {{ total }} 条记录</span>
  </div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else>
    <table class="admin-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>审核结果</th>
          <th>审核人</th>
          <th>原因</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in records" :key="r.id" class="audit-row" @click="viewDetail(r)">
          <td style="color:var(--color-text-tertiary);font-size:13px;width:60px;">{{ r.id }}</td>
          <td>
            <span class="admin-badge" :class="decisionClass(r.decision)">{{ decisionLabel(r.decision) }}</span>
          </td>
          <td style="color:var(--color-text-secondary);">{{ r.auditorName || '系统' }}</td>
          <td style="color:var(--color-text-tertiary);font-size:13px;max-width:300px;">{{ truncate(r.reason, 40) }}</td>
          <td style="color:var(--color-text-tertiary);font-size:13px;white-space:nowrap;">{{ formatDate(r.createTime) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-if="records.length === 0" class="admin-empty">暂无审核记录</div>

    <div v-if="total > pageSize" class="admin-pagination">
      <button class="admin-pagination__btn" :disabled="page <= 1" @click="prevPage">上一页</button>
      <span class="admin-pagination__info">{{ page }} / {{ Math.ceil(total / pageSize) }} (共 {{ total }} 条)</span>
      <button class="admin-pagination__btn" :disabled="page * pageSize >= total" @click="nextPage">下一页</button>
    </div>
  </template>

  <!-- Detail Modal -->
  <AdminModal :visible="showDetail" title="审核详情" width="480px" @close="showDetail = false">
    <template v-if="detailRecord">
      <div class="audit-detail">
        <div class="audit-detail__row">
          <span class="audit-detail__label">记录ID</span>
          <span class="audit-detail__value">{{ detailRecord.id }}</span>
        </div>
        <div class="audit-detail__row">
          <span class="audit-detail__label">目标ID</span>
          <span class="audit-detail__value">{{ detailRecord.targetId }}</span>
        </div>
        <div v-if="detailRecord.targetTitle" class="audit-detail__row">
          <span class="audit-detail__label">标题</span>
          <span class="audit-detail__value">{{ detailRecord.targetTitle }}</span>
        </div>
        <div class="audit-detail__row">
          <span class="audit-detail__label">审核结果</span>
          <span class="audit-detail__value">
            <span class="admin-badge" :class="decisionClass(detailRecord.decision)">{{ decisionLabel(detailRecord.decision) }}</span>
          </span>
        </div>
        <div class="audit-detail__row">
          <span class="audit-detail__label">审核人</span>
          <span class="audit-detail__value">{{ detailRecord.auditorName || '系统' }}</span>
        </div>
        <div class="audit-detail__row">
          <span class="audit-detail__label">审核时间</span>
          <span class="audit-detail__value">{{ formatDate(detailRecord.createTime) }}</span>
        </div>
        <div class="audit-detail__row audit-detail__row--full">
          <span class="audit-detail__label">审核原因</span>
          <p class="audit-detail__reason">{{ detailRecord.reason || '无' }}</p>
        </div>
      </div>
    </template>
  </AdminModal>
</template>

<style scoped>
.audit-count {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.audit-row {
  cursor: pointer;
}

.audit-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-detail__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.audit-detail__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.audit-detail__row--full {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.audit-detail__label {
  font-size: 13px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.audit-detail__value {
  font-size: 14px;
  color: var(--color-text);
  text-align: right;
}

.audit-detail__reason {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
