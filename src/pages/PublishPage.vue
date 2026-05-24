<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Marked } from 'marked'
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'

const API_PREFIX = '/api/v1'

function getToken() {
  return localStorage.getItem('token')
}

async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_PREFIX}/file/upload`, { method: 'POST', headers, body: form })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || '上传失败')
  return json.data
}

async function createPost(body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_PREFIX}/post`, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message || '发布失败')
  return json.data
}

const router = useRouter()

const title = ref('')
const content = ref('')
const previewing = ref(false)
const submitting = ref(false)
const imageFiles = ref([])
const imagePreviewUrls = ref([])
const error = ref('')

const md = new Marked({ breaks: true, gfm: true })

const renderedPreview = computed(() => md.parse(content.value || ''))

const canSubmit = computed(() => title.value.trim() && content.value.trim() && !submitting.value)

function handleImageFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    imageFiles.value.push(file)
    imagePreviewUrls.value.push(URL.createObjectURL(file))
  }
}

function onFileChange(e) {
  if (e.target.files?.length) handleImageFiles(e.target.files)
  e.target.value = ''
}

function onDrop(e) {
  e.preventDefault()
  if (e.dataTransfer.files?.length) handleImageFiles(e.dataTransfer.files)
}

function onDragOver(e) {
  e.preventDefault()
}

function removeImage(index) {
  URL.revokeObjectURL(imagePreviewUrls.value[index])
  imageFiles.value.splice(index, 1)
  imagePreviewUrls.value.splice(index, 1)
}

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    // 提交时才逐张上传
    const imageUrls = []
    for (const file of imageFiles.value) {
      const url = await uploadImage(file)
      imageUrls.push(url)
    }

    const postId = await createPost({
      title: title.value.trim(),
      content: content.value.trim(),
      images: imageUrls
    })
    router.push(`/post/${postId}`)
  } catch (e) {
    error.value = e.message
    submitting.value = false
  }
}
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <div class="publish-page">
    <div class="publish-header">
      <button class="publish-header__back" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span>返回</span>
      </button>
      <h1 class="publish-header__title">发布帖子</h1>
      <div class="publish-header__actions">
        <button
          class="publish-header__btn publish-header__btn--preview"
          :class="{ active: previewing }"
          @click="previewing = !previewing"
        >{{ previewing ? '编辑' : '预览' }}</button>
        <button
          class="publish-header__btn publish-header__btn--submit"
          :disabled="!canSubmit"
          @click="onSubmit"
        >{{ submitting ? '发布中...' : '提交' }}</button>
      </div>
    </div>

    <div v-if="error" class="publish-error">{{ error }}</div>

    <div class="publish-body">
      <!-- Left: Editor -->
      <section class="publish-editor">
        <input
          v-model="title"
          class="publish-editor__title"
          placeholder="输入标题..."
          maxlength="128"
        />

        <div v-if="previewing" class="publish-editor__preview markdown-body" v-html="renderedPreview"></div>

        <textarea
          v-else
          v-model="content"
          class="publish-editor__textarea"
          placeholder="支持 Markdown 语法编写正文..."
        ></textarea>
      </section>

      <!-- Right: Images -->
      <aside class="publish-images">
        <div
          class="publish-images__dropzone"
          @drop="onDrop"
          @dragover="onDragOver"
        >
          <label class="publish-images__upload-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>拖拽图片到此处或点击选择</span>
            <input type="file" accept="image/*" multiple hidden @change="onFileChange" />
          </label>
        </div>

        <div v-if="imagePreviewUrls.length" class="publish-images__list">
          <div v-for="(url, idx) in imagePreviewUrls" :key="idx" class="publish-images__item">
            <img :src="url" :alt="'图片 ' + (idx + 1)" />
            <button class="publish-images__remove" @click="removeImage(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.publish-page {
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  margin-top: 76px;
  height: calc(100vh - 76px);
  overflow-y: auto;
  background: var(--color-background);
}

/* ===== Header ===== */
.publish-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.publish-header__back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.publish-header__back:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.publish-header__back svg {
  width: 18px;
  height: 18px;
}

.publish-header__title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

.publish-header__actions {
  display: flex;
  gap: 10px;
}

.publish-header__btn {
  padding: 8px 22px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid var(--color-border);
}

.publish-header__btn--preview {
  background: var(--color-surface);
  color: var(--color-text);
}

.publish-header__btn--preview:hover,
.publish-header__btn--preview.active {
  background: var(--color-muted);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.publish-header__btn--submit {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.publish-header__btn--submit:hover:not(:disabled) {
  background: var(--color-foreground);
  border-color: var(--color-foreground);
}

.publish-header__btn--submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Error ===== */
.publish-error {
  margin: 12px 24px 0;
  padding: 10px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--color-destructive);
  border-radius: 10px;
  font-size: 14px;
}

/* ===== Body ===== */
.publish-body {
  display: flex;
  gap: 0;
  height: calc(100% - 69px);
}

/* ===== Editor ===== */
.publish-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  min-width: 0;
}

.publish-editor__title {
  width: 100%;
  padding: 12px 0;
  border: none;
  border-bottom: 2px solid var(--color-border);
  font-size: 22px;
  font-weight: 600;
  font-family: var(--font-heading);
  color: var(--color-foreground);
  background: transparent;
  outline: none;
  margin-bottom: 16px;
  transition: border-color var(--transition-fast);
}

.publish-editor__title:focus {
  border-bottom-color: var(--color-primary);
}

.publish-editor__title::placeholder {
  color: var(--color-text-tertiary);
}

.publish-editor__textarea {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text);
  resize: none;
  outline: none;
  font-family: var(--font-body);
}

.publish-editor__textarea::placeholder {
  color: var(--color-text-tertiary);
}

.publish-editor__preview {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text);
}

/* ===== Images ===== */
.publish-images {
  width: 340px;
  flex-shrink: 0;
  padding: 24px;
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  background: var(--color-surface);
}

.publish-images__dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 14px;
  padding: 32px 16px;
  text-align: center;
  transition: all var(--transition-fast);
  margin-bottom: 16px;
}

.publish-images__upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-tertiary);
  font-size: 13px;
  transition: color var(--transition-fast);
}

.publish-images__upload-btn:hover {
  color: var(--color-primary);
}

.publish-images__upload-btn svg {
  width: 32px;
  height: 32px;
}

.publish-images__list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.publish-images__item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-muted);
}

.publish-images__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publish-images__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background var(--transition-fast);
}

.publish-images__remove:hover {
  background: var(--color-destructive);
}

.publish-images__remove svg {
  width: 12px;
  height: 12px;
}

/* ===== Markdown preview ===== */
.markdown-body :deep(h1) { font-size: 1.6em; font-weight: 700; margin: 16px 0 10px; }
.markdown-body :deep(h2) { font-size: 1.35em; font-weight: 600; margin: 14px 0 8px; }
.markdown-body :deep(h3) { font-size: 1.15em; font-weight: 600; margin: 12px 0 6px; }
.markdown-body :deep(p) { margin-bottom: 10px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; margin-bottom: 10px; }
.markdown-body :deep(li) { margin-bottom: 4px; }
.markdown-body :deep(strong) { font-weight: 600; color: var(--color-foreground); }
.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: 12px;
  color: var(--color-text-secondary);
  margin: 10px 0;
}
.markdown-body :deep(code) {
  background: var(--color-muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.markdown-body :deep(pre) {
  background: #1E293B;
  color: #E2E8F0;
  padding: 14px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 10px 0;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}
.markdown-body :deep(del) { text-decoration: line-through; color: var(--color-text-tertiary); }
.markdown-body :deep(a) { color: var(--color-primary); }
.markdown-body :deep(img) { max-width: 100%; border-radius: 10px; margin: 8px 0; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--color-border); margin: 16px 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid var(--color-border); padding: 8px 12px; text-align: left; }
.markdown-body :deep(th) { background: var(--color-muted); font-weight: 600; }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .publish-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }

  .publish-body {
    flex-direction: column;
  }

  .publish-images {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding: 16px 24px;
  }
}
</style>
