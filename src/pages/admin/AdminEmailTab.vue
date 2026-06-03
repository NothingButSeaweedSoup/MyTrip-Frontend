<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const enabled = ref(false)
const subject = ref('')
const smtpHost = ref('')
const smtpPort = ref('587')
const smtpUsername = ref('')
const smtpPassword = ref('')
const checkIntervalMinutes = ref(5)
const recipients = ref([])
const loading = ref(false)
const error = ref('')
const successMsg = ref('')

const newUserId = ref('')
const newEmail = ref('')
const adding = ref(false)
const saving = ref(false)
let saveTimer = null

async function loadConfig() {
  loading.value = true
  error.value = ''
  try {
    const [config, list] = await Promise.all([
      api.get('/admin/review-email-config'),
      api.get('/admin/review-email/list')
    ])
    enabled.value = config.enabled
    subject.value = config.subject
    smtpHost.value = config.smtpHost || ''
    smtpPort.value = config.smtpPort || '587'
    smtpUsername.value = config.smtpUsername || ''
    smtpPassword.value = config.smtpPassword || ''
    checkIntervalMinutes.value = config.checkIntervalMinutes || 5
    recipients.value = list || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(doSave, 600)
}

async function doSave() {
  saving.value = true
  error.value = ''
  try {
    await api.put('/admin/review-email-config', {
      enabled: enabled.value,
      subject: subject.value,
      smtpHost: smtpHost.value,
      smtpPort: smtpPort.value,
      smtpUsername: smtpUsername.value,
      smtpPassword: smtpPassword.value,
      checkIntervalMinutes: checkIntervalMinutes.value
    })
    successMsg.value = '配置已保存'
    setTimeout(() => successMsg.value = '', 2000)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function addRecipient() {
  if (!newUserId.value || !newEmail.value) return
  adding.value = true
  error.value = ''
  try {
    await api.post('/admin/review-email', {
      userId: Number(newUserId.value),
      email: newEmail.value
    })
    newUserId.value = ''
    newEmail.value = ''
    await loadConfig()
    successMsg.value = '收件人已添加'
    setTimeout(() => successMsg.value = '', 2000)
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

async function toggleRecipient(userId, val) {
  try {
    await api.put(`/admin/review-email/${userId}/enabled`, { enabled: val })
    await loadConfig()
  } catch (e) {
    error.value = e.message
  }
}

async function deleteRecipient(userId) {
  if (!confirm('确定删除该收件人？')) return
  try {
    await api.delete(`/admin/review-email/${userId}`)
    await loadConfig()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(loadConfig)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>
  <div v-if="successMsg" class="config-success">{{ successMsg }}</div>
  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else>
    <!-- SMTP 配置 -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">SMTP 服务器</h3>
        <span class="saving-hint" v-if="saving">保存中...</span>
      </div>
      <p class="config-card__desc">配置用于发送审核通知邮件的 SMTP 服务器，支持 QQ邮箱、163、Gmail 等。</p>

      <div class="form-grid">
        <div class="admin-form-group">
          <label class="admin-form-label">服务器地址</label>
          <input type="text" class="admin-form-input" v-model="smtpHost" @input="scheduleSave" placeholder="smtp.qq.com">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">端口</label>
          <input type="text" class="admin-form-input" v-model="smtpPort" @input="scheduleSave" placeholder="587" style="width:120px;">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">发件邮箱</label>
          <input type="text" class="admin-form-input" v-model="smtpUsername" @input="scheduleSave" placeholder="xxx@qq.com">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">授权码</label>
          <input type="password" class="admin-form-input" v-model="smtpPassword" @input="scheduleSave" placeholder="SMTP 授权码">
        </div>
      </div>
    </div>

    <!-- 通知设置 -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">通知设置</h3>
        <span class="saving-hint" v-if="saving">保存中...</span>
      </div>
      <p class="config-card__desc">开启后将定时检查待审核帖子，有新帖子时自动发送邮件通知所有已启用的收件人。</p>

      <div class="form-grid">
        <div class="admin-form-group">
          <label class="admin-form-label">启用通知</label>
          <label class="toggle-switch">
            <input type="checkbox" v-model="enabled" @change="doSave">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">邮件主题</label>
          <input type="text" class="admin-form-input" v-model="subject" @input="scheduleSave" style="max-width:420px;">
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">检查间隔（分钟）</label>
          <input type="number" class="admin-form-input" v-model.number="checkIntervalMinutes" @input="scheduleSave" min="1" max="1440" style="width:120px;">
        </div>
      </div>
    </div>

    <!-- 收件人管理 -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">收件人管理</h3>
      </div>
      <p class="config-card__desc">管理接收审核通知的审核员。每个用户绑定一个邮箱，可单独启用或禁用。</p>

      <div class="recipient-add">
        <input type="number" class="admin-form-input" v-model="newUserId" placeholder="用户 ID" style="width:120px;">
        <input type="email" class="admin-form-input" v-model="newEmail" placeholder="邮箱地址" style="flex:1;max-width:320px;">
        <button class="admin-btn admin-btn--primary" @click="addRecipient" :disabled="adding">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ adding ? '添加中...' : '添加' }}
        </button>
      </div>

      <table v-if="recipients.length > 0" class="admin-table" style="margin-top:16px;">
        <thead>
          <tr>
            <th>用户 ID</th>
            <th>邮箱</th>
            <th>状态</th>
            <th style="width:140px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in recipients" :key="r.userId">
            <td style="font-weight:600;">#{{ r.userId }}</td>
            <td>{{ r.email }}</td>
            <td>
              <span :class="r.enabled === 1 ? 'admin-badge admin-badge--approve' : 'admin-badge admin-badge--reject'">
                {{ r.enabled === 1 ? '已启用' : '已禁用' }}
              </span>
            </td>
            <td>
              <div class="action-btns">
                <button class="admin-btn admin-btn--outline admin-btn--sm" @click="toggleRecipient(r.userId, r.enabled !== 1)">
                  {{ r.enabled === 1 ? '禁用' : '启用' }}
                </button>
                <button class="admin-btn admin-btn--danger-outline admin-btn--sm" @click="deleteRecipient(r.userId)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="admin-empty">暂无收件人，请添加审核员邮箱</div>
    </div>
  </template>
</template>

<style scoped>
/* --- card styles (match ConfigTab) --- */
.config-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}
.config-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.config-card__title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
}
.config-card__desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}
.config-success {
  background: #ECFDF5;
  color: #059669;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
}
.saving-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* --- form grid --- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

/* --- form elements --- */
.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.admin-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.admin-form-input {
  padding: 10px 14px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  font-family: var(--font-body);
  background: var(--color-background);
  outline: none;
  transition: border-color .2s;
}
.admin-form-input:focus {
  border-color: var(--color-primary);
}

/* --- toggle switch --- */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 26px;
  transition: background .2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform .2s;
}
.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* --- recipient add bar --- */
.recipient-add {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* --- action buttons --- */
.action-btns {
  display: flex;
  gap: 8px;
}

/* --- small / outline buttons --- */
.admin-btn--sm {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 8px;
}
.admin-btn--outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
.admin-btn--outline:hover {
  background: var(--color-background);
}
.admin-btn--danger-outline {
  background: transparent;
  border: 1px solid #fecaca;
  color: #dc2626;
}
.admin-btn--danger-outline:hover {
  background: #fef2f2;
}
</style>
