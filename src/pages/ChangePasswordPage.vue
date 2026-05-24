<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import api from '@/api'
import { sha256 } from '@/utils/crypto'

const router = useRouter()
const { logout } = useAuth()
const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const error = ref('')
const success = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  success.value = ''

  if (!form.value.oldPassword || !form.value.newPassword) {
    error.value = '请填写所有字段'
    return
  }
  if (form.value.newPassword.length < 6) {
    error.value = '新密码至少6位'
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }

  submitting.value = true
  try {
    await api.put('/user/password', {
      oldPassword: await sha256(form.value.oldPassword),
      newPassword: await sha256(form.value.newPassword),
    })
    success.value = '密码修改成功，即将跳转登录页'
    setTimeout(async () => {
      await logout()
      router.push('/login')
    }, 1500)
  } catch (e) {
    error.value = e.message || '修改失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <main class="password-page">
    <div class="password-card">
      <h1 class="password-title">修改密码</h1>

      <div class="password-field">
        <label class="password-label">原密码</label>
        <input v-model="form.oldPassword" type="password" class="password-input" placeholder="输入原密码" />
      </div>

      <div class="password-field">
        <label class="password-label">新密码</label>
        <input v-model="form.newPassword" type="password" class="password-input" placeholder="至少6位" />
      </div>

      <div class="password-field">
        <label class="password-label">确认新密码</label>
        <input v-model="form.confirmPassword" type="password" class="password-input" placeholder="再次输入新密码" />
      </div>

      <p v-if="error" class="password-msg password-msg--error">{{ error }}</p>
      <p v-if="success" class="password-msg">{{ success }}</p>

      <div class="password-actions">
        <button class="password-btn" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中...' : '确认修改' }}
        </button>
        <button class="password-cancel" @click="router.push('/settings')">取消</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.password-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px 80px;
}

.password-card {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px;
  background: var(--color-surface);
  border-radius: 16px;
}

.password-title {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 24px;
}

.password-field {
  margin-bottom: 18px;
}

.password-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.password-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.password-input:focus {
  border-color: var(--color-primary);
}

.password-msg {
  font-size: 14px;
  margin-top: 8px;
  color: var(--color-primary);
}

.password-msg--error {
  color: var(--color-error, #dc2626);
}

.password-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.password-btn {
  padding: 10px 24px;
  border-radius: 22px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.password-btn:hover:not(:disabled) {
  background: var(--color-foreground);
}

.password-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.password-cancel {
  padding: 10px 22px;
  border-radius: 22px;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.password-cancel:hover {
  background: var(--color-muted);
}

@media (max-width: 768px) {
  .password-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px;
  }

  .password-card {
    padding: 20px;
  }
}
</style>
