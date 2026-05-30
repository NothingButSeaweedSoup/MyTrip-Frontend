<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const words = ref([])
const baseTotal = ref(0)
const customTotal = ref(0)
const newWord = ref('')
const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const adding = ref(false)
const deleting = ref(null)

async function fetchWords() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get('/admin/sensitive-words')
    words.value = data.words || []
    baseTotal.value = data.baseTotal || 0
    customTotal.value = data.customTotal || 0
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function addWord() {
  const word = newWord.value.trim()
  if (!word) return
  adding.value = true
  error.value = ''
  successMsg.value = ''
  try {
    await api.post('/admin/sensitive-words', { word })
    newWord.value = ''
    successMsg.value = `已添加: ${word}`
    await fetchWords()
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

async function removeWord(word) {
  deleting.value = word
  error.value = ''
  successMsg.value = ''
  try {
    await api.delete(`/admin/sensitive-words?word=${encodeURIComponent(word)}`)
    successMsg.value = `已移除: ${word}`
    await fetchWords()
  } catch (e) {
    error.value = e.message
  } finally {
    deleting.value = null
  }
}

async function reloadWords() {
  error.value = ''
  successMsg.value = ''
  try {
    await api.post('/admin/sensitive-words/reload')
    successMsg.value = '已重新加载'
    await fetchWords()
  } catch (e) {
    error.value = e.message
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter') addWord()
}

onMounted(fetchWords)
</script>

<template>
  <div>
    <div v-if="error" class="admin-error">{{ error }}</div>
    <div v-if="successMsg" class="sw-success">{{ successMsg }}</div>

    <div class="sw-toolbar">
      <div class="sw-add-row">
        <input
          v-model="newWord"
          class="admin-form-input sw-add-input"
          placeholder="输入自定义敏感词，按回车添加..."
          :disabled="adding"
          @keydown="handleKeydown"
        />
        <button class="admin-btn admin-btn--primary" :disabled="adding || !newWord.trim()" @click="addWord">
          {{ adding ? '添加中...' : '添加' }}
        </button>
      </div>
      <div class="sw-toolbar-actions">
        <div class="sw-counts">
          <span class="sw-count sw-count--base">基础词库: {{ baseTotal }}</span>
          <span class="sw-count sw-count--custom">自定义: {{ customTotal }}</span>
        </div>
        <button class="admin-btn admin-btn--outline admin-btn--sm" @click="reloadWords">重新加载</button>
      </div>
    </div>

    <div v-if="loading" class="admin-loading">加载中...</div>

    <template v-else>
      <div v-if="words.length > 0" class="sw-list">
        <span
          v-for="word in words"
          :key="word"
          class="sw-tag"
        >
          {{ word }}
          <button
            class="sw-tag-remove"
            :disabled="deleting === word"
            @click="removeWord(word)"
            :title="`删除: ${word}`"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </span>
      </div>
      <div v-else class="admin-empty">暂无自定义敏感词</div>
    </template>
  </div>
</template>

<style scoped>
.sw-success {
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #ECFDF5;
  border: 1px solid #A7F3D0;
  color: #059669;
  border-radius: 10px;
  font-size: 14px;
}

.sw-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.sw-add-row {
  display: flex;
  gap: 10px;
}

.sw-add-input {
  flex: 1;
}

.sw-toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sw-counts {
  display: flex;
  gap: 16px;
}

.sw-count {
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 10px;
}

.sw-count--base {
  background: var(--color-muted);
  color: var(--color-text-tertiary);
}

.sw-count--custom {
  background: #ECFDF5;
  color: #059669;
  font-weight: 600;
}

.sw-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sw-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.sw-tag:hover {
  border-color: var(--color-destructive);
}

.sw-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: 3px;
  transition: all var(--transition-fast);
}

.sw-tag-remove svg {
  width: 12px;
  height: 12px;
}

.sw-tag-remove:hover {
  background: var(--color-destructive);
  color: #fff;
}

.sw-tag-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
