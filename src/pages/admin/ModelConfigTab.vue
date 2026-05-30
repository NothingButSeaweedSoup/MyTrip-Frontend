<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const saving = ref(false)

const config = ref({
  chat: {
    apiKey: '', baseUrl: '', modelName: '',
    temperature: 0.2, maxTokens: 2000, timeoutSeconds: 60,
  },
  review: {
    apiKey: '', baseUrl: '', modelName: '',
    temperature: 0.2, maxTokens: 2000, timeoutSeconds: 60,
  },
  vision: {
    apiKey: '', baseUrl: '', modelName: '',
    temperature: 0.2, maxTokens: 2000, timeoutSeconds: 120, maxImages: 9,
  },
  embedding: {
    apiKey: '', baseUrl: '', modelName: '',
    dimensions: 384, batchSize: 16,
  },
})

async function fetchConfig() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get('/admin/model-config')
    if (data) {
      config.value = {
        chat: { ...config.value.chat, ...data.chat },
        review: { ...config.value.review, ...data.review },
        vision: { ...config.value.vision, ...data.vision },
        embedding: { ...config.value.embedding, ...data.embedding },
      }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await api.put('/admin/model-config', config.value)
    successMsg.value = '模型配置已保存，即时生效'
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(fetchConfig)
</script>

<template>
  <div>
    <div v-if="error" class="admin-error">{{ error }}</div>
    <div v-if="successMsg" class="mc-success">{{ successMsg }}</div>

    <div v-if="loading" class="admin-loading">加载中...</div>

    <template v-else>
      <!-- 对话模型 -->
      <div class="config-card">
        <h3 class="config-card__title">对话模型</h3>
        <p class="config-card__desc">用于智能旅行规划对话、Agent 工具调用</p>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">API Key</label>
            <input v-model="config.chat.apiKey" type="password" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Base URL</label>
            <input v-model="config.chat.baseUrl" type="text" class="admin-form-input" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">模型名</label>
            <input v-model="config.chat.modelName" type="text" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">温度 (0-2)</label>
            <input v-model.number="config.chat.temperature" type="number" class="admin-form-input" min="0" max="2" step="0.1" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">Max Tokens</label>
            <input v-model.number="config.chat.maxTokens" type="number" class="admin-form-input" min="1" max="65536" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">超时 (秒)</label>
            <input v-model.number="config.chat.timeoutSeconds" type="number" class="admin-form-input" min="1" max="600" />
          </div>
        </div>
      </div>

      <!-- 审核模型 -->
      <div class="config-card">
        <h3 class="config-card__title">审核模型</h3>
        <p class="config-card__desc">用于帖子/评论内容的文本审核</p>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">API Key</label>
            <input v-model="config.review.apiKey" type="password" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Base URL</label>
            <input v-model="config.review.baseUrl" type="text" class="admin-form-input" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">模型名</label>
            <input v-model="config.review.modelName" type="text" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">温度 (0-2)</label>
            <input v-model.number="config.review.temperature" type="number" class="admin-form-input" min="0" max="2" step="0.1" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">Max Tokens</label>
            <input v-model.number="config.review.maxTokens" type="number" class="admin-form-input" min="1" max="65536" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">超时 (秒)</label>
            <input v-model.number="config.review.timeoutSeconds" type="number" class="admin-form-input" min="1" max="600" />
          </div>
        </div>
      </div>

      <!-- 视觉模型 -->
      <div class="config-card">
        <h3 class="config-card__title">视觉模型</h3>
        <p class="config-card__desc">用于帖子图片内容审核</p>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">API Key</label>
            <input v-model="config.vision.apiKey" type="password" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Base URL</label>
            <input v-model="config.vision.baseUrl" type="text" class="admin-form-input" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">模型名</label>
            <input v-model="config.vision.modelName" type="text" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">温度 (0-2)</label>
            <input v-model.number="config.vision.temperature" type="number" class="admin-form-input" min="0" max="2" step="0.1" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">Max Tokens</label>
            <input v-model.number="config.vision.maxTokens" type="number" class="admin-form-input" min="1" max="65536" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">超时 (秒)</label>
            <input v-model.number="config.vision.timeoutSeconds" type="number" class="admin-form-input" min="1" max="600" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">最大图片数</label>
            <input v-model.number="config.vision.maxImages" type="number" class="admin-form-input" min="1" max="20" />
          </div>
        </div>
      </div>

      <!-- 嵌入模型 -->
      <div class="config-card">
        <h3 class="config-card__title">嵌入模型</h3>
        <p class="config-card__desc">用于文本向量化、语义搜索和内容相似度计算</p>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">API Key</label>
            <input v-model="config.embedding.apiKey" type="password" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Base URL</label>
            <input v-model="config.embedding.baseUrl" type="text" class="admin-form-input" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">模型名</label>
            <input v-model="config.embedding.modelName" type="text" class="admin-form-input" />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">向量维度</label>
            <input v-model.number="config.embedding.dimensions" type="number" class="admin-form-input" min="128" max="4096" />
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label class="admin-form-label">批处理大小</label>
            <input v-model.number="config.embedding.batchSize" type="number" class="admin-form-input" min="1" max="64" />
          </div>
        </div>
      </div>

      <div class="mc-actions">
        <button class="admin-btn admin-btn--primary" :disabled="saving" @click="saveConfig">
          {{ saving ? '保存中...' : '保存模型配置' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mc-success {
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #059669;
  border-radius: 10px;
  font-size: 14px;
}

.config-card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.config-card__title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
  margin-bottom: 4px;
}

.config-card__desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-bottom: 16px;
}

.mc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
