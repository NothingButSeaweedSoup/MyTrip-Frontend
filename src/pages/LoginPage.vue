<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import { sha256 } from '@/utils/crypto'

const router = useRouter()
const { login, loading } = useAuth()

const form = ref({
  email: '',
  password: '',
})

const showPassword = ref(false)
const errorMsg = ref('')
const submitting = ref(false)

const goToRegister = () => {
  router.push('/register')
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.value.email || !form.value.password) {
    errorMsg.value = '请填写邮箱和密码'
    return
  }
  submitting.value = true
  try {
    await login(form.value.email, await sha256(form.value.password))
    router.push('/')
  } catch (e) {
    errorMsg.value = e.message || '登录失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- Background decoration -->
    <div class="auth-bg">
      <div class="auth-bg__circle auth-bg__circle--1"></div>
      <div class="auth-bg__circle auth-bg__circle--2"></div>
      <div class="auth-bg__circle auth-bg__circle--3"></div>
    </div>

    <!-- Card -->
    <div class="auth-card">
      <div class="auth-card__header">
        <div class="auth-card__logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="10" r="3"/>
            <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
          </svg>
        </div>
        <h1 class="auth-card__title">欢迎回来</h1>
        <p class="auth-card__subtitle">登录你的 My Trip 账户</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__group">
          <label class="auth-form__label" for="email">邮箱</label>
          <div class="auth-form__input-wrapper">
            <svg class="auth-form__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="auth-form__input"
              placeholder="请输入邮箱地址"
              autocomplete="email"
            />
          </div>
        </div>

        <div class="auth-form__group">
          <label class="auth-form__label" for="password">密码</label>
          <div class="auth-form__input-wrapper">
            <svg class="auth-form__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="auth-form__input"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="auth-form__toggle-pw"
              @click="showPassword = !showPassword"
              :title="showPassword ? '隐藏密码' : '显示密码'"
            >
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="auth-form__options">
          <label class="auth-form__remember">
            <input type="checkbox" />
            <span>记住我</span>
          </label>
          <a href="#" class="auth-form__forgot">忘记密码？</a>
        </div>

        <p v-if="errorMsg" class="auth-form__error">{{ errorMsg }}</p>

        <button type="submit" class="auth-form__submit" :disabled="submitting">
          <span v-if="submitting">登录中...</span>
          <template v-else>
            <span>登 录</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </template>
        </button>
      </form>

      <div class="auth-card__footer">
        <span>还没有账户？</span>
        <a class="auth-card__link" @click="goToRegister">立即注册</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  overflow: hidden;
}

/* ===== Background decoration ===== */
.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-bg__circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
}

.auth-bg__circle--1 {
  width: 600px;
  height: 600px;
  background: var(--color-primary);
  top: -200px;
  right: -150px;
  animation: float1 8s ease-in-out infinite;
}

.auth-bg__circle--2 {
  width: 400px;
  height: 400px;
  background: var(--color-secondary);
  bottom: -150px;
  left: -100px;
  animation: float2 10s ease-in-out infinite;
}

.auth-bg__circle--3 {
  width: 200px;
  height: 200px;
  background: var(--color-accent);
  top: 50%;
  left: 10%;
  animation: float3 7s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(-25px, -30px) scale(1.08); }
  50% { transform: translate(20px, 15px) scale(0.93); }
  75% { transform: translate(-15px, 25px) scale(1.03); }
}

@keyframes float3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(35px, -25px) scale(1.1); }
}

/* ===== Card ===== */
.auth-card {
  position: relative;
  z-index: 1;
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--color-surface);
  border-radius: 24px;
  box-shadow: var(--shadow-xl);
  padding: 40px 36px 32px;
}

.auth-card__header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-card__logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  color: var(--color-primary);
}

.auth-card__logo svg {
  width: 100%;
  height: 100%;
}

.auth-card__title {
  font-family: var(--font-heading);
  font-size: 28px;
  color: var(--color-foreground);
  letter-spacing: 1px;
}

.auth-card__subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ===== Form ===== */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-form__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-form__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.auth-form__input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-form__input-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.auth-form__input {
  width: 100%;
  padding: 13px 14px 13px 42px;
  font-size: 15px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  border: 2px solid transparent;
  border-radius: 12px;
  outline: none;
  transition: all var(--transition-fast);
}

.auth-form__input::placeholder {
  color: var(--color-text-tertiary);
}

.auth-form__input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.08);
}

.auth-form__toggle-pw {
  position: absolute;
  right: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.auth-form__toggle-pw:hover {
  color: var(--color-text-secondary);
  background: var(--color-muted);
}

.auth-form__toggle-pw svg {
  width: 20px;
  height: 20px;
}

.auth-form__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.auth-form__remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.auth-form__remember input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.auth-form__forgot {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-fast);
}

.auth-form__forgot:hover {
  color: var(--color-foreground);
}

/* ===== Submit button ===== */
.auth-form__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 4px;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-body);
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  letter-spacing: 2px;
  transition: all var(--transition-smooth);
}

.auth-form__submit:hover {
  background: var(--color-foreground);
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.30);
  transform: translateY(-1px);
}

.auth-form__submit:active {
  transform: translateY(0);
}

.auth-form__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.auth-form__error {
  color: var(--color-primary);
  font-size: 13px;
  text-align: center;
  margin: 0;
  padding: 8px 12px;
  background: rgba(225, 29, 72, 0.08);
  border-radius: 8px;
}

.auth-form__submit svg {
  width: 18px;
  height: 18px;
  transition: transform var(--transition-fast);
}

.auth-form__submit:hover svg {
  transform: translateX(3px);
}

/* ===== Footer ===== */
.auth-card__footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.auth-card__link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
  transition: color var(--transition-fast);
}

.auth-card__link:hover {
  color: var(--color-foreground);
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .auth-card {
    padding: 32px 24px 24px;
    border-radius: 20px;
  }

  .auth-card__title {
    font-size: 24px;
  }

  .auth-form__submit {
    padding: 12px;
    font-size: 15px;
  }
}
</style>
