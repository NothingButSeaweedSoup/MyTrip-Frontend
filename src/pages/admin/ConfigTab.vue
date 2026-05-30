<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'

const loading = ref(false)
const error = ref('')
const successMsg = ref('')

// AI Prompt
const prompt = ref('')
const defaultPrompt = ref('')
const promptLastUpdate = ref(null)
const savingPrompt = ref(false)

// Image Prompt
const imagePrompt = ref('')
const defaultImagePrompt = ref('')
const imagePromptLastUpdate = ref(null)
const savingImagePrompt = ref(false)

// Recommend Config
const config = ref({
  weightHot: 0.4,
  weightTag: 0.3,
  weightFresh: 0.2,
  weightDiversity: 0.1,
  tagMatchLimit: 200,
  hotLimit: 100,
  itemCfLimit: 100,
})
const configLastUpdate = ref(null)
const savingConfig = ref(false)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// ===== Weight bar =====
const barRef = ref(null)
const dragging = ref(-1)

const segments = [
  { key: 'weightHot', label: '热度', color: '#F59E0B' },
  { key: 'weightTag', label: '标签匹配', color: '#3B82F6' },
  { key: 'weightFresh', label: '新鲜度', color: '#10B981' },
  { key: 'weightDiversity', label: '多样性', color: '#8B5CF6' },
]

const handlePositions = computed(() => {
  const c = config.value
  const p0 = c.weightHot
  const p1 = p0 + c.weightTag
  const p2 = p1 + c.weightFresh
  return [clamp(p0), clamp(p1), clamp(p2)]
})

function clamp(v) { return Math.max(0, Math.min(1, v)) }

const weightsSum = computed(() => {
  const c = config.value
  return (c.weightHot + c.weightTag + c.weightFresh + c.weightDiversity).toFixed(2)
})

const weightsWarning = computed(() => {
  return Math.abs(parseFloat(weightsSum.value) - 1.0) > 0.01
})

function handlePointerDown(idx, e) {
  e.preventDefault()
  dragging.value = idx
  barRef.value.setPointerCapture(e.pointerId)
}

function handlePointerMove(e) {
  if (dragging.value < 0 || !barRef.value) return
  const rect = barRef.value.getBoundingClientRect()
  let x = (e.clientX - rect.left) / rect.width
  x = clamp(x)

  const idx = dragging.value
  const positions = handlePositions.value
  const newPositions = [...positions]
  newPositions[idx] = x

  // Enforce order: 0 <= p0 <= p1 <= p2 <= 1
  if (idx > 0 && newPositions[idx] < newPositions[idx - 1]) {
    newPositions[idx] = newPositions[idx - 1]
  }
  if (idx < 2 && newPositions[idx] > newPositions[idx + 1]) {
    newPositions[idx] = newPositions[idx + 1]
  }

  const p0 = newPositions[0]
  const p1 = newPositions[1]
  const p2 = newPositions[2]

  config.value.weightHot = Math.round(p0 * 100) / 100
  config.value.weightTag = Math.round((p1 - p0) * 100) / 100
  config.value.weightFresh = Math.round((p2 - p1) * 100) / 100
  config.value.weightDiversity = Math.round((1 - p2) * 100) / 100
}

function handlePointerUp() {
  dragging.value = -1
}

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    const [promptData, imagePromptData, configData] = await Promise.all([
      api.get('/admin/ai-prompts'),
      api.get('/admin/ai-prompts/image'),
      api.get('/admin/recommend-config'),
    ])
    prompt.value = promptData.prompt || ''
    defaultPrompt.value = promptData.defaultPrompt || ''
    promptLastUpdate.value = promptData.lastUpdateTime
    imagePrompt.value = imagePromptData.prompt || ''
    defaultImagePrompt.value = imagePromptData.defaultPrompt || ''
    imagePromptLastUpdate.value = imagePromptData.lastUpdateTime

    config.value = {
      weightHot: configData.weightHot ?? 0.4,
      weightTag: configData.weightTag ?? 0.3,
      weightFresh: configData.weightFresh ?? 0.2,
      weightDiversity: configData.weightDiversity ?? 0.1,
      tagMatchLimit: configData.tagMatchLimit ?? 200,
      hotLimit: configData.hotLimit ?? 100,
      itemCfLimit: configData.itemCfLimit ?? 100,
    }
    configLastUpdate.value = configData.lastUpdateTime
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function savePrompt() {
  savingPrompt.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await api.put('/admin/ai-prompts', { prompt: prompt.value })
    successMsg.value = '文本审核规则已保存'
    promptLastUpdate.value = new Date().toISOString()
  } catch (e) {
    error.value = e.message
  } finally {
    savingPrompt.value = false
  }
}

function resetPrompt() {
  prompt.value = defaultPrompt.value
}

async function saveImagePrompt() {
  savingImagePrompt.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await api.put('/admin/ai-prompts/image', { prompt: imagePrompt.value })
    successMsg.value = '图像审核规则已保存'
    imagePromptLastUpdate.value = new Date().toISOString()
  } catch (e) {
    error.value = e.message
  } finally {
    savingImagePrompt.value = false
  }
}

function resetImagePrompt() {
  imagePrompt.value = defaultImagePrompt.value
}

async function saveConfig() {
  savingConfig.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await api.put('/admin/recommend-config', config.value)
    successMsg.value = '推荐配置已保存'
    configLastUpdate.value = new Date().toISOString()
  } catch (e) {
    error.value = e.message
  } finally {
    savingConfig.value = false
  }
}

onMounted(fetchAll)
</script>

<template>
  <div v-if="error" class="admin-error">{{ error }}</div>
  <div v-if="successMsg" class="config-success">{{ successMsg }}</div>

  <div v-if="loading" class="admin-loading">加载中...</div>

  <template v-else>
    <!-- AI Prompt Card -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">AI 文本审核规则</h3>
        <span class="config-card__time">上次更新: {{ formatDate(promptLastUpdate) }}</span>
      </div>
      <p class="config-card__desc">编辑 AI 文本审核规则。输出格式由系统固定，会自动拼接在规则末尾。</p>
      <div class="admin-form-group">
        <textarea
          v-model="prompt"
          class="admin-form-textarea config-prompt-textarea"
          placeholder="请输入文本审核规则..."
          maxlength="5000"
        ></textarea>
        <span class="config-char-count">{{ prompt.length }} / 5000</span>
      </div>
      <div class="config-card__actions">
        <button class="admin-btn admin-btn--outline" @click="resetPrompt">恢复默认</button>
        <button class="admin-btn admin-btn--primary" :disabled="savingPrompt" @click="savePrompt">
          {{ savingPrompt ? '保存中...' : '保存规则' }}
        </button>
      </div>
    </div>

    <!-- Image AI Prompt Card -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">AI 图像审核规则</h3>
        <span class="config-card__time">上次更新: {{ formatDate(imagePromptLastUpdate) }}</span>
      </div>
      <p class="config-card__desc">编辑 AI 图像审核规则（含图片特有规则）。输出格式由系统固定，会自动拼接在规则末尾。</p>
      <div class="admin-form-group">
        <textarea
          v-model="imagePrompt"
          class="admin-form-textarea config-prompt-textarea"
          placeholder="请输入 AI 图像审核规则..."
          maxlength="5000"
        ></textarea>
        <span class="config-char-count">{{ imagePrompt.length }} / 5000</span>
      </div>
      <div class="config-card__actions">
        <button class="admin-btn admin-btn--outline" @click="resetImagePrompt">恢复默认</button>
        <button class="admin-btn admin-btn--primary" :disabled="savingImagePrompt" @click="saveImagePrompt">
          {{ savingImagePrompt ? '保存中...' : '保存规则' }}
        </button>
      </div>
    </div>

    <!-- Recommend Config Card -->
    <div class="config-card">
      <div class="config-card__header">
        <h3 class="config-card__title">推荐算法配置</h3>
        <span class="config-card__time">上次更新: {{ formatDate(configLastUpdate) }}</span>
      </div>

      <h4 class="config-section-title">权重分配</h4>
      <p v-if="weightsWarning" class="config-weight-warning">权重之和为 {{ weightsSum }}，拖动游标调整比例</p>

      <div class="weight-bar-outer">
        <!-- Labels above the bar -->
        <div class="weight-labels">
          <div
            v-for="(seg, i) in segments"
            :key="seg.key"
            class="weight-label"
            :style="{
              left: (i === 0 ? 0 : handlePositions[i - 1]) * 100 + '%',
              width: ((i === 3 ? 1 : handlePositions[i]) - (i === 0 ? 0 : handlePositions[i - 1])) * 100 + '%',
            }"
          >
            <span class="weight-label__name">{{ seg.label }}</span>
            <span class="weight-label__pct">{{ (config[seg.key] * 100).toFixed(0) }}%</span>
          </div>
        </div>
        <!-- Bar -->
        <div
          ref="barRef"
          class="weight-bar"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointerleave="handlePointerUp"
        >
          <div
            v-for="(seg, i) in segments"
            :key="seg.key"
            class="weight-segment"
            :style="{
              background: seg.color,
              left: (i === 0 ? 0 : handlePositions[i - 1]) * 100 + '%',
              width: ((i === 3 ? 1 : handlePositions[i]) - (i === 0 ? 0 : handlePositions[i - 1])) * 100 + '%',
            }"
          ></div>
          <div
            v-for="(pos, i) in handlePositions"
            :key="'h' + i"
            class="weight-handle"
            :class="{ 'weight-handle--active': dragging === i }"
            :style="{ left: pos * 100 + '%' }"
            @pointerdown.prevent="handlePointerDown(i, $event)"
          ></div>
        </div>
      </div>

      <h4 class="config-section-title" style="margin-top: 24px;">召回数量限制</h4>

      <div class="config-limits-grid">
        <div class="admin-form-group">
          <label class="admin-form-label">标签匹配召回</label>
          <input v-model.number="config.tagMatchLimit" type="number" class="admin-form-input" min="10" max="1000" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">热门列表召回</label>
          <input v-model.number="config.hotLimit" type="number" class="admin-form-input" min="10" max="1000" />
        </div>
        <div class="admin-form-group">
          <label class="admin-form-label">Item-CF 召回</label>
          <input v-model.number="config.itemCfLimit" type="number" class="admin-form-input" min="10" max="1000" />
        </div>
      </div>

      <div class="config-card__actions">
        <button class="admin-btn admin-btn--primary" :disabled="savingConfig" @click="saveConfig">
          {{ savingConfig ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.config-success {
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

.config-card__time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.config-card__desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.config-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.config-prompt-textarea {
  min-height: 240px;
  font-size: 14px;
  line-height: 1.6;
}

.config-char-count {
  text-align: right;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
  display: block;
}

.config-section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 14px;
}

.config-weight-warning {
  font-size: 13px;
  color: #D97706;
  background: #FEF3C7;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

/* ===== Weight Bar ===== */
.weight-bar-outer {
  margin-bottom: 8px;
}

.weight-labels {
  position: relative;
  height: 40px;
}

.weight-label {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: left 0.08s, width 0.08s;
  overflow: hidden;
}

.weight-label__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.weight-label__pct {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text);
}

.weight-bar {
  position: relative;
  height: 12px;
  border-radius: 6px;
  overflow: visible;
  background: var(--color-border);
  cursor: default;
  user-select: none;
  touch-action: none;
}

.weight-segment {
  position: absolute;
  top: 0;
  height: 100%;
  transition: left 0.08s, width 0.08s;
}

.weight-segment:first-child { border-radius: 6px 0 0 6px; }
.weight-segment:last-child { border-radius: 0 6px 6px 0; }

.weight-handle {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  background: #fff;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  cursor: col-resize;
  z-index: 2;
  transition: left 0.08s, border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.weight-handle--active,
.weight-handle:hover {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.15);
}

.config-limits-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .config-limits-grid {
    grid-template-columns: 1fr;
  }
  .weight-segment__label {
    font-size: 10px;
  }
}
</style>
