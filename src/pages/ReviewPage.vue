<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Marked } from 'marked'
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'
import api, { BASE_URL } from '@/api'
import config from '@/config'

const router = useRouter()
const md = new Marked({ breaks: true, gfm: true })

// ===== Post state =====
const post = ref(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const noMore = ref(false)

// ===== Rejection modal =====
const showRejectModal = ref(false)
const rejectReason = ref('')

// ===== Media carousel =====
const currentMediaIndex = ref(0)
const slideDir = ref('next')

const currentMedia = computed(() => post.value?.media[currentMediaIndex.value])
const mediaCount = computed(() => post.value?.media?.length || 0)

function nextMedia() {
  if (mediaCount.value <= 1) return
  slideDir.value = 'next'
  currentMediaIndex.value = (currentMediaIndex.value + 1) % mediaCount.value
}

function prevMedia() {
  if (mediaCount.value <= 1) return
  slideDir.value = 'prev'
  currentMediaIndex.value = (currentMediaIndex.value - 1 + mediaCount.value) % mediaCount.value
}

// ===== Post rendering =====
const renderedContent = computed(() => {
  return post.value?.content ? md.parse(post.value.content) : ''
})

function toPostViewModel(data) {
  if (!data) return null
  const images = (data.images || []).map(url => ({
    type: 'image',
    src: url.startsWith('http') ? url : BASE_URL + url
  }))
  return {
    id: data.postId,
    title: data.title || '',
    author: data.authorName || '匿名用户',
    authorAvatar: data.authorAvatar || '',
    content: data.content || '',
    tags: (data.tags || []).map(t => t.name),
    likes: data.likes || 0,
    views: data.views || 0,
    commentCount: data.commentCount || 0,
    media: images,
  }
}

// ===== Fetch next post =====
async function fetchNextPost() {
  stopHeartbeat()
  releaseLock()
  loading.value = true
  error.value = ''
  post.value = null
  currentMediaIndex.value = 0
  noMore.value = false
  try {
    const data = await api.get('/review/post/next')
    if (!data) {
      noMore.value = true
    } else {
      post.value = toPostViewModel(data)
      startHeartbeat()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ===== Release lock =====
function releaseLock() {
  if (post.value?.id) {
    api.delete(`/review/post/${post.value.id}/lock`).catch(() => {})
  }
}

// ===== Heartbeat timer =====
let heartbeatTimer = null

function startHeartbeat() {
  stopHeartbeat()
  if (!post.value?.id) return
  heartbeatTimer = setInterval(async () => {
    try {
      const ok = await api.put(`/review/post/${post.value.id}/lock`)
      if (!ok) {
        stopHeartbeat()
        error.value = '审核锁已过期或被其他审核员抢占，请刷新重试'
        post.value = null
        noMore.value = false
      }
    } catch {
      // 心跳失败不中断，下次再试
    }
  }, config.reviewHeartbeatInterval)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ===== Approve =====
async function approve() {
  if (!post.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await api.put(`/review/post/${post.value.id}`, { action: 'approve', remark: '' })
    await fetchNextPost()
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}

// ===== Reject =====
function openRejectModal() {
  if (!post.value || submitting.value) return
  rejectReason.value = ''
  showRejectModal.value = true
  nextTick(() => {
    document.getElementById('reject-reason-input')?.focus()
  })
}

function cancelReject() {
  showRejectModal.value = false
  rejectReason.value = ''
}

async function confirmReject() {
  if (!post.value || submitting.value) return
  showRejectModal.value = false
  submitting.value = true
  error.value = ''
  try {
    await api.put(`/review/post/${post.value.id}`, {
      action: 'reject',
      remark: rejectReason.value.trim()
    })
    await fetchNextPost()
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}

// ===== Keyboard shortcuts =====
const scrollContainer = ref(null)

function onKeyDown(e) {
  if (showRejectModal.value) return

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault()
      scrollContainer.value?.scrollBy({ top: -200, behavior: 'smooth' })
      break
    case 'ArrowDown':
      e.preventDefault()
      scrollContainer.value?.scrollBy({ top: 200, behavior: 'smooth' })
      break
    case 'ArrowLeft':
      e.preventDefault()
      prevMedia()
      break
    case 'ArrowRight':
      e.preventDefault()
      nextMedia()
      break
    case 'Enter':
      e.preventDefault()
      approve()
      break
    case 'Backspace':
      e.preventDefault()
      openRejectModal()
      break
  }
}

onMounted(() => {
  fetchNextPost()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  stopHeartbeat()
  releaseLock()
})
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <div ref="scrollContainer" class="review-page">
    <!-- Header -->
    <div class="review-header">
      <button class="review-header__back" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span>返回</span>
      </button>
      <h1 class="review-header__title">帖子审核</h1>
      <span class="review-header__hint">Enter 通过 · Backspace 驳回 · ↑↓ 滚动 · ←→ 切图</span>
    </div>

    <!-- Error -->
    <div v-if="error" class="review-error">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="review-state">
      <p>加载中...</p>
    </div>

    <!-- No more -->
    <div v-else-if="noMore" class="review-state">
      <div class="review-state__icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="review-state__icon">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <p class="review-state__title">全部审核完毕</p>
      <p class="review-state__desc">没有待审核的帖子了，干得漂亮！</p>
      <button class="review-state__btn" @click="fetchNextPost">检查新帖子</button>
    </div>

    <!-- Post detail -->
    <template v-else-if="post">
      <div class="review-container">
        <!-- Left: Media -->
        <aside class="review-media">
          <div class="review-media__viewport">
            <transition v-if="currentMedia" :name="'media-slide-' + slideDir" mode="out-in">
              <div class="review-media__inner" :key="currentMediaIndex">
                <img
                  :src="currentMedia.src"
                  :alt="'图片 ' + (currentMediaIndex + 1)"
                  class="review-media__img"
                />
              </div>
            </transition>

            <button v-if="mediaCount > 1" class="review-media__arrow review-media__arrow--prev" @click="prevMedia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-if="mediaCount > 1" class="review-media__arrow review-media__arrow--next" @click="nextMedia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <div v-if="mediaCount > 1" class="review-media__counter">{{ currentMediaIndex + 1 }} / {{ mediaCount }}</div>

            <div v-if="mediaCount > 1" class="review-media__dots">
              <button
                v-for="(_, idx) in mediaCount"
                :key="idx"
                class="review-media__dot"
                :class="{ 'review-media__dot--active': idx === currentMediaIndex }"
                @click="currentMediaIndex = idx"
              ></button>
            </div>
          </div>
        </aside>

        <!-- Right: Content -->
        <main class="review-content">
          <div class="review-content__author">
            <div class="review-content__avatar">
              <img :src="post.authorAvatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
            </div>
            <span class="review-content__author-name">{{ post.author }}</span>
          </div>

          <h1 class="review-content__title">{{ post.title }}</h1>
          <div class="review-content__tags">
            <span v-for="tag in post.tags" :key="tag" class="review-content__tag">{{ tag }}</span>
          </div>
          <div class="review-content__body markdown-body" v-html="renderedContent"></div>
        </main>
      </div>

      <!-- Action bar -->
      <div class="review-actions">
        <button
          class="review-actions__btn review-actions__btn--reject"
          :disabled="submitting"
          @click="openRejectModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span>驳回 (Backspace)</span>
        </button>
        <button
          class="review-actions__btn review-actions__btn--approve"
          :disabled="submitting"
          @click="approve"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>通过 (Enter)</span>
        </button>
      </div>
    </template>
  </div>

  <!-- Rejection reason modal -->
  <Teleport to="body">
    <div v-if="showRejectModal" class="review-modal-overlay" @click.self="cancelReject">
      <div class="review-modal">
        <h2 class="review-modal__title">驳回原因</h2>
        <textarea
          id="reject-reason-input"
          v-model="rejectReason"
          class="review-modal__textarea"
          placeholder="请输入驳回原因..."
          rows="4"
          @keydown.enter.stop="confirmReject"
          @keydown.escape.stop="cancelReject"
        ></textarea>
        <div class="review-modal__actions">
          <button class="review-modal__btn review-modal__btn--cancel" @click="cancelReject">取消</button>
          <button class="review-modal__btn review-modal__btn--submit" @click="confirmReject">确认驳回</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.review-page {
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  margin-top: 76px;
  height: calc(100vh - 76px);
  overflow-y: auto;
  background: var(--color-background);
}

/* ===== Header ===== */
.review-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.review-header__back {
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

.review-header__back:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.review-header__back svg {
  width: 18px;
  height: 18px;
}

.review-header__title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

.review-header__hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-muted);
  padding: 4px 12px;
  border-radius: 12px;
}

/* ===== Error ===== */
.review-error {
  margin: 12px 24px 0;
  padding: 10px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--color-destructive);
  border-radius: 10px;
  font-size: 14px;
}

/* ===== State (loading / no more) ===== */
.review-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 0;
  color: var(--color-text-tertiary);
}

.review-state__icon-wrap {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.review-state__icon {
  width: 44px;
  height: 44px;
  color: var(--color-primary);
}

.review-state__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
}

.review-state__desc {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin-bottom: 24px;
}

.review-state__btn {
  padding: 10px 28px;
  border: 2px solid var(--color-primary);
  border-radius: 24px;
  background: transparent;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.review-state__btn:hover {
  background: var(--color-primary);
  color: #fff;
}

/* ===== Container ===== */
.review-container {
  display: flex;
  gap: 24px;
  width: 75vw;
  margin: 0 auto;
  padding: 24px 0;
}

/* ===== Media panel ===== */
.review-media {
  flex-shrink: 0;
  width: 420px;
}

.review-media__viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  background: #1a1a1a;
}

.review-media__inner {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.review-media__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Slide transitions */
.media-slide-next-enter-active,
.media-slide-next-leave-active,
.media-slide-prev-enter-active,
.media-slide-prev-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.media-slide-next-enter-from { transform: translateX(100%); opacity: 0; }
.media-slide-next-leave-to { transform: translateX(-100%); opacity: 0; }
.media-slide-prev-enter-from { transform: translateX(-100%); opacity: 0; }
.media-slide-prev-leave-to { transform: translateX(100%); opacity: 0; }

.review-media__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: 3;
}

.review-media__viewport:hover .review-media__arrow { opacity: 1; }
.review-media__arrow svg { width: 20px; height: 20px; }
.review-media__arrow--prev { left: 8px; }
.review-media__arrow--next { right: 8px; }

.review-media__counter {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  border-radius: 10px;
  z-index: 3;
}

.review-media__dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 3;
}

.review-media__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
  transition: all var(--transition-fast);
}

.review-media__dot--active { background: #fff; transform: scale(1.3); }

/* ===== Content ===== */
.review-content {
  flex: 1;
  min-width: 0;
  padding: 16px 0;
}

.review-content__author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.review-content__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.review-content__avatar svg { width: 26px; height: 26px; }
.review-content__avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

.review-content__author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.review-content__title {
  font-family: var(--font-heading);
  font-size: 26px;
  color: var(--color-foreground);
  line-height: 1.3;
  margin-bottom: 10px;
}

.review-content__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.review-content__tag {
  font-size: 12px;
  padding: 3px 10px;
  background: var(--color-muted);
  color: var(--color-primary);
  border-radius: 10px;
  font-weight: 500;
}

.review-content__body {
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text);
  white-space: pre-wrap;
}

.markdown-body :deep(p) { margin-bottom: 12px; }
.markdown-body :deep(strong) { font-weight: 600; color: var(--color-foreground); }
.markdown-body :deep(a) { color: var(--color-primary); }
.markdown-body :deep(img) { max-width: 100%; border-radius: 10px; margin: 8px 0; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--color-border); margin: 16px 0; }
.markdown-body :deep(blockquote) { border-left: 3px solid var(--color-primary); padding-left: 12px; color: var(--color-text-secondary); margin: 10px 0; }
.markdown-body :deep(code) { background: var(--color-muted); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.markdown-body :deep(pre) { background: #1E293B; color: #E2E8F0; padding: 14px; border-radius: 10px; overflow-x: auto; margin: 10px 0; }
.markdown-body :deep(pre code) { background: none; padding: 0; color: inherit; }

/* ===== Action bar ===== */
.review-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 24px 0 48px;
  border-top: 1px solid var(--color-border);
  width: 75vw;
  margin: 0 auto;
}

.review-actions__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
}

.review-actions__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.review-actions__btn svg { width: 22px; height: 22px; }

.review-actions__btn--approve {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.review-actions__btn--approve:hover:not(:disabled) {
  background: #15803D;
  border-color: #15803D;
}

.review-actions__btn--reject {
  background: var(--color-surface);
  color: var(--color-destructive);
  border-color: var(--color-destructive);
}

.review-actions__btn--reject:hover:not(:disabled) {
  background: var(--color-destructive);
  color: #fff;
}

/* ===== Rejection modal ===== */
.review-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.review-modal {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 28px;
  width: 440px;
  max-width: 90vw;
  box-shadow: var(--shadow-xl);
}

.review-modal__title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
  margin-bottom: 16px;
}

.review-modal__textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
}

.review-modal__textarea:focus {
  border-color: var(--color-primary);
}

.review-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.review-modal__btn {
  padding: 8px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.review-modal__btn--cancel {
  background: var(--color-muted);
  color: var(--color-text-secondary);
}

.review-modal__btn--cancel:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.review-modal__btn--submit {
  background: var(--color-destructive);
  color: #fff;
}

.review-modal__btn--submit:hover {
  background: #B91C1C;
}

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .review-container,
  .review-actions {
    width: 85vw;
  }
  .review-media {
    width: 340px;
  }
}

@media (max-width: 768px) {
  .review-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }

  .review-container,
  .review-actions {
    width: auto;
    padding: 16px;
  }

  .review-container {
    flex-direction: column;
    align-items: center;
  }

  .review-media {
    width: 100%;
    max-width: 400px;
  }

  .review-header__hint {
    display: none;
  }
}
</style>
