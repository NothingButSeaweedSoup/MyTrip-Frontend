<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Marked } from 'marked'
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'
import api from '@/api'

const router = useRouter()
const md = new Marked({ breaks: true, gfm: true })

const title = ref('')
const content = ref('')
const previewing = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const imageFiles = ref([])
const imagePreviewUrls = ref([])
const error = ref('')
const attempted = ref(false)
const searchTags = ref([])
const selectedTags = ref([])
const tagSearch = ref('')
const tagLoading = ref(false)

let tagTimer = null
function onTagInput() {
  clearTimeout(tagTimer)
  const q = tagSearch.value.trim()
  if (!q) { searchTags.value = []; return }
  tagTimer = setTimeout(async () => {
    tagLoading.value = true
    try { searchTags.value = await api.get(`/tag/search?q=${encodeURIComponent(q)}`) } catch { searchTags.value = [] }
    finally { tagLoading.value = false }
  }, 200)
}

const renderedPreview = computed(() => md.parse(content.value || ''))

const titleValid = computed(() => title.value.trim().length > 0)
const contentValid = computed(() => content.value.trim().length > 0)
const imagesValid = computed(() => imageFiles.value.length > 0)
const canSubmit = computed(() => titleValid.value && contentValid.value && imagesValid.value && !submitting.value)

function toggleTag(tagId) {
  const idx = selectedTags.value.indexOf(tagId)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tagId)
}

function handleImageFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    if (imageFiles.value.length >= 9) break
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
  attempted.value = true
  error.value = ''
  if (!titleValid.value) { error.value = '请填写标题'; return }
  if (!contentValid.value) { error.value = '请填写正文'; return }
  if (!imagesValid.value) { error.value = '请至少上传一张图片'; return }

  submitting.value = true
  try {
    const imageUrls = []
    for (const file of imageFiles.value) {
      imageUrls.push(await api.upload(file))
    }
    const postId = await api.post('/post', {
      title: title.value.trim(),
      content: content.value.trim(),
      images: imageUrls,
      tagIds: selectedTags.value,
    })
    submitted.value = true
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
    <div v-if="submitted" class="publish-success">
      <div class="publish-success__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h2 class="publish-success__title">提交成功</h2>
      <p class="publish-success__desc">帖子已提交，等待审核员审核后正式发布</p>
      <button class="publish-success__btn" @click="router.push('/')">返回首页</button>
      <button class="publish-success__btn--secondary" @click="router.push('/profile')">查看我的帖子</button>
    </div>

    <template v-else>
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
          :disabled="submitting"
          @click="onSubmit"
        >{{ submitting ? '发布中...' : '发布' }}</button>
      </div>
    </div>

    <div v-if="error" class="publish-error">{{ error }}</div>

    <div class="publish-body">
      <section class="publish-editor">
        <div class="publish-field">
          <input
            v-model="title"
            class="publish-editor__title"
            :class="{ 'publish-editor__title--invalid': attempted && !titleValid }"
            placeholder="输入标题（必填）..."
            maxlength="128"
            @input="attempted = false"
          />
          <span v-if="attempted && !titleValid" class="publish-field__hint publish-field__hint--error">标题不能为空</span>
          <span class="publish-field__count">{{ title.length }}/128</span>
        </div>

        <div v-if="previewing" class="publish-editor__preview markdown-body" v-html="renderedPreview"></div>
        <div v-else class="publish-field publish-field--grow">
          <textarea
            v-model="content"
            class="publish-editor__textarea"
            :class="{ 'publish-editor__textarea--invalid': attempted && !contentValid }"
            placeholder="支持 Markdown 语法编写正文（必填）..."
            @input="attempted = false"
          ></textarea>
          <span v-if="attempted && !contentValid" class="publish-field__hint publish-field__hint--error">正文不能为空</span>
        </div>
      </section>

      <aside class="publish-images">
        <h3 class="publish-images__heading">图片 <span class="publish-images__required">*必填</span></h3>

        <div
          class="publish-images__dropzone"
          :class="{ 'publish-images__dropzone--invalid': attempted && !imagesValid }"
          @drop="onDrop"
          @dragover="onDragOver"
        >
          <label class="publish-images__upload-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>拖拽或点击上传</span>
            <span class="publish-images__limit">{{ imageFiles.length }}/9</span>
            <input type="file" accept="image/*" multiple hidden @change="onFileChange" />
          </label>
        </div>
        <p v-if="attempted && !imagesValid" class="publish-field__hint publish-field__hint--error">至少需要一张图片</p>

        <div v-if="imagePreviewUrls.length" class="publish-images__list">
          <div v-for="(url, idx) in imagePreviewUrls" :key="idx" class="publish-images__item">
            <img :src="url" :alt="'图片 ' + (idx + 1)" />
            <button class="publish-images__remove" @click="removeImage(idx)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="publish-tags">
          <div class="publish-tags__header">
            <h4 class="publish-tags__heading">标签</h4>
            <span v-if="selectedTags.length" class="publish-tags__count">{{ selectedTags.length }} 个已选</span>
          </div>
          <input v-model="tagSearch" class="publish-tags__search" placeholder="搜索标签..." @input="onTagInput" />
          <div v-if="tagLoading" class="publish-tags__empty">搜索中...</div>
          <div v-else class="publish-tags__list">
            <button
              v-for="tag in searchTags"
              :key="tag.tagId"
              type="button"
              class="publish-tag"
              :class="{ 'publish-tag--active': selectedTags.includes(tag.tagId) }"
              @click="toggleTag(tag.tagId)"
            >{{ tag.name }}</button>
          </div>
          <p v-if="!tagLoading && tagSearch && searchTags.length === 0" class="publish-tags__empty">无匹配标签</p>
        </div>
      </aside>
    </div>
    </template>
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

.publish-success {
  max-width: 480px;
  margin: 80px auto 0;
  text-align: center;
  padding: 48px 32px;
  background: var(--color-surface);
  border-radius: 16px;
}

.publish-success__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.publish-success__icon svg { width: 32px; height: 32px; }

.publish-success__title {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 8px;
}

.publish-success__desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}

.publish-success__btn {
  display: inline-block;
  padding: 10px 28px;
  border-radius: 22px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  margin: 0 6px;
  transition: all var(--transition-fast);
}

.publish-success__btn:hover { background: var(--color-foreground); }

.publish-success__btn--secondary {
  display: inline-block;
  padding: 10px 28px;
  border-radius: 22px;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  margin: 0 6px;
  transition: all var(--transition-fast);
}

.publish-success__btn--secondary:hover { background: var(--color-muted); }

.publish-header {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.publish-error {
  max-width: 960px;
  margin: 10px auto 0;
  padding: 8px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--color-destructive);
  border-radius: 10px;
  font-size: 13px;
}

.publish-header__back {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.publish-header__back:hover { background: var(--color-muted); color: var(--color-text); }
.publish-header__back svg { width: 16px; height: 16px; }

.publish-header__title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 17px;
  color: var(--color-foreground);
}

.publish-header__actions { display: flex; gap: 8px; }

.publish-header__btn {
  padding: 6px 18px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid var(--color-border);
  font-family: var(--font-body);
}

.publish-header__btn--preview { background: var(--color-surface); color: var(--color-text); }
.publish-header__btn--preview:hover,
.publish-header__btn--preview.active {
  background: var(--color-muted);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.publish-header__btn--submit { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.publish-header__btn--submit:hover:not(:disabled) { background: var(--color-foreground); border-color: var(--color-foreground); }
.publish-header__btn--submit:disabled { opacity: 0.5; cursor: not-allowed; }

.publish-body {
  display: flex;
  max-width: 960px;
  margin: 0 auto;
  height: calc(100% - 55px);
}

/* ===== Editor ===== */
.publish-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  min-width: 0;
}

.publish-field {
  position: relative;
}
.publish-field--grow { flex: 1; display: flex; flex-direction: column; }

.publish-field__hint {
  font-size: 12px;
  margin-top: 2px;
  display: block;
}
.publish-field__hint--error { color: var(--color-destructive); }

.publish-field__count {
  position: absolute;
  right: 0;
  top: -4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.publish-editor__title {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 2px solid var(--color-border);
  font-size: 19px;
  font-weight: 600;
  font-family: var(--font-heading);
  color: var(--color-foreground);
  background: transparent;
  outline: none;
  margin-bottom: 4px;
  transition: border-color var(--transition-fast);
}

.publish-editor__title:focus { border-bottom-color: var(--color-primary); }
.publish-editor__title::placeholder { color: var(--color-text-tertiary); }
.publish-editor__title--invalid { border-bottom-color: var(--color-destructive); }

.publish-editor__textarea {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text);
  resize: none;
  outline: none;
  font-family: var(--font-body);
  margin-top: 10px;
}
.publish-editor__textarea::placeholder { color: var(--color-text-tertiary); }
.publish-editor__textarea--invalid { color: var(--color-destructive); }

.publish-editor__preview {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text);
}

/* ===== Images ===== */
.publish-images {
  width: 260px;
  flex-shrink: 0;
  padding: 20px 18px;
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  background: var(--color-surface);
}

.publish-images__heading {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
  margin-bottom: 10px;
}

.publish-images__required {
  font-size: 11px;
  color: var(--color-destructive);
  font-weight: 400;
}

.publish-images__dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 20px 12px;
  text-align: center;
  transition: all var(--transition-fast);
  margin-bottom: 10px;
}
.publish-images__dropzone--invalid { border-color: var(--color-destructive); background: #FEF2F2; }

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
.publish-images__upload-btn:hover { color: var(--color-primary); }
.publish-images__upload-btn svg { width: 26px; height: 26px; }

.publish-images__limit {
  font-size: 12px;
  color: var(--color-text-tertiary);
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
.publish-images__item img { width: 100%; height: 100%; object-fit: cover; }

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
.publish-images__remove:hover { background: var(--color-destructive); }
.publish-images__remove svg { width: 12px; height: 12px; }

/* ===== Tags ===== */
.publish-tags {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.publish-tags__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.publish-tags__heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.publish-tags__count {
  font-size: 11px;
  color: var(--color-primary);
  font-weight: 500;
}

.publish-tags__search {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.publish-tags__search:focus { border-color: var(--color-primary); }
.publish-tags__search::placeholder { color: var(--color-text-tertiary); }

.publish-tags__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.publish-tag {
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.publish-tag:hover { border-color: var(--color-primary); color: var(--color-primary); }

.publish-tag--active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.publish-tags__empty {
  font-size: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 8px 0;
}

/* Markdown preview */
.markdown-body :deep(h1) { font-size: 1.6em; font-weight: 700; margin: 16px 0 10px; }
.markdown-body :deep(h2) { font-size: 1.35em; font-weight: 600; margin: 14px 0 8px; }
.markdown-body :deep(h3) { font-size: 1.15em; font-weight: 600; margin: 12px 0 6px; }
.markdown-body :deep(p) { margin-bottom: 10px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; margin-bottom: 10px; }
.markdown-body :deep(li) { margin-bottom: 4px; }
.markdown-body :deep(strong) { font-weight: 600; color: var(--color-foreground); }
.markdown-body :deep(blockquote) { border-left: 3px solid var(--color-primary); padding-left: 12px; color: var(--color-text-secondary); margin: 10px 0; }
.markdown-body :deep(code) { background: var(--color-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.markdown-body :deep(pre) { background: #1E293B; color: #E2E8F0; padding: 14px; border-radius: 10px; overflow-x: auto; margin: 10px 0; }
.markdown-body :deep(pre code) { background: none; padding: 0; color: inherit; }
.markdown-body :deep(del) { text-decoration: line-through; color: var(--color-text-tertiary); }
.markdown-body :deep(a) { color: var(--color-primary); }
.markdown-body :deep(img) { max-width: 100%; border-radius: 10px; margin: 8px 0; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--color-border); margin: 16px 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid var(--color-border); padding: 8px 12px; text-align: left; }
.markdown-body :deep(th) { background: var(--color-muted); font-weight: 600; }

@media (max-width: 768px) {
  .publish-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }
  .publish-body { flex-direction: column; }
  .publish-images {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding: 16px 24px;
  }
}
</style>
