<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Marked } from 'marked'

const md = new Marked({ gfm: true, breaks: true })
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'
import api, { BASE_URL } from '@/api'
import { useAuth } from '@/stores/auth'

const { user } = useAuth()
const router = useRouter()

const route = useRoute()

function formatTime(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(minutes, 1)}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function flattenComments(tree) {
  const result = []
  function walk(nodes) {
    for (const c of nodes) {
      result.push({
        id: c.commentId,
        user: c.authorName || '匿名用户',
        avatar: c.authorAvatar || '',
        body: c.content,
        time: formatTime(c.createTime),
        likes: c.likes || 0,
        liked: c.liked || false
      })
      if (c.children && c.children.length > 0) walk(c.children)
    }
  }
  walk(tree)
  return result
}

async function toggleCommentLike(comment) {
  try {
    const newLikes = await api.post(`/comment/${comment.id}/like`, { action: comment.liked ? 'unlike' : 'like' })
    comment.liked = !comment.liked
    comment.likes = newLikes
  } catch {
    // ignore
  }
}

const post = ref({
  id: null,
  title: '',
  author: '',
  authorAvatar: '',
  authorId: null,
  time: '',
  content: '',
  tags: [],
  likes: 0,
  views: 0,
  liked: false,
  comments: 0,
  bookmarked: false,
  status: 1,
  rejectReason: '',
  media: [],
})
const notFound = ref(false)
const comments = ref([])

async function fetchPost() {
  const id = route.params.id
  if (!id) return
  try {
    const data = await api.get(`/post/${id}`)
    const images = (data.images || []).map(url => ({
      type: 'image',
      src: url.startsWith('http') ? url : BASE_URL + url
    }))
    post.value = {
      id: data.postId,
      title: data.title || '',
      author: data.authorName || '匿名用户',
      authorAvatar: data.authorAvatar || '',
      authorId: data.authorId || null,
      time: formatTime(data.createTime),
      content: data.content || '',
      tags: (data.tags || []).map(t => t.name),
      likes: data.likes || 0,
      views: data.views || 0,
      liked: data.liked || false,
      comments: data.commentCount || 0,
      bookmarked: data.favorited || false,
      status: data.status ?? 1,
      rejectReason: data.rejectReason || '',
      media: images,
    }
  } catch (e) {
    notFound.value = true
  }
}

async function fetchComments() {
  const id = route.params.id
  if (!id) return
  try {
    const data = await api.get(`/comment/list/${id}`)
    comments.value = flattenComments(data || [])
  } catch {
    // comments are optional
  }
}

onMounted(() => {
  fetchPost()
  fetchComments()
})

// ===== Media carousel =====
const currentMediaIndex = ref(0)
const slideDir = ref('next')
const isHovering = ref(false)
const isVideoPlaying = ref(false)
const videoRef = ref(null)
let autoTimer = null

const currentMedia = computed(() => post.value.media[currentMediaIndex.value])
const mediaCount = computed(() => post.value.media.length)

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

function goToMedia(index) {
  if (index === currentMediaIndex.value) return
  slideDir.value = index > currentMediaIndex.value ? 'next' : 'prev'
  currentMediaIndex.value = index
}

const shouldPause = computed(() => isHovering.value || isVideoPlaying.value)

function startAutoScroll() {
  stopAutoScroll()
  autoTimer = setInterval(() => {
    if (!shouldPause.value) {
      nextMedia()
    }
  }, 5000)
}

function stopAutoScroll() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

watch(shouldPause, (paused) => {
  if (paused) stopAutoScroll()
  else startAutoScroll()
})

watch(currentMediaIndex, () => {
  isVideoPlaying.value = false
})

function onVideoPlay() { isVideoPlaying.value = true }
function onVideoPause() { isVideoPlaying.value = false }
function onVideoEnded() { isVideoPlaying.value = false }

// ===== Image expansion =====
const isExpanded = ref(false)

function onMediaImageLoad(e) {
  const img = e.target
  if (!img) return
  const ratio = img.naturalHeight / img.naturalWidth
  isExpanded.value = ratio < 0.9
}

// ===== Markdown =====
const renderedContent = computed(() => md.parse(post.value.content))

async function toggleBookmark() {
  const action = post.value.bookmarked ? 'unfavorite' : 'favorite'
  try {
    await api.post(`/favorite/${post.value.id}`, { action })
    post.value.bookmarked = !post.value.bookmarked
  } catch (e) {
    console.error('收藏操作失败:', e)
  }
}

const isAuthor = computed(() => user.value?.userId === post.value.authorId || user.value?.role === 9)
const menuOpen = ref(false)

function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }
function onDocClick() { menuOpen.value = false }

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const shareTip = ref(false)

async function copyShareLink() {
  const text = `${post.value.title} - 我的旅行\n${window.location.href}`
  try {
    await navigator.clipboard.writeText(text)
    shareTip.value = true
    setTimeout(() => { shareTip.value = false }, 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

async function deletePost() {
  if (!confirm('确定删除这篇帖子吗？')) return
  try {
    await api.delete(`/post/${post.value.id}`)
    router.push('/')
  } catch (e) {
    console.error('删除失败:', e)
  }
}

const newComment = ref('')

async function submitComment() {
  if (!newComment.value.trim()) return
  try {
    await api.post('/comment', {
      postId: post.value.id,
      content: newComment.value.trim(),
      parentCommentId: null
    })
    newComment.value = ''
    fetchComments()
  } catch (e) {
    console.error('评论失败:', e)
  }
}

async function toggleLike() {
  const action = post.value.liked ? 'unlike' : 'like'
  try {
    await api.post(`/post/${post.value.id}/like`, { action })
    post.value.liked = !post.value.liked
    post.value.likes += post.value.liked ? 1 : -1
  } catch (e) {
    console.error('点赞失败:', e)
  }
}

function formatLikes(count) {
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}

onMounted(startAutoScroll)
onUnmounted(stopAutoScroll)
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <div v-if="notFound" class="detail-page">
    <div class="detail-not-found">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h2>帖子暂时不可查看</h2>
      <p>该帖子正在审核中，或已被删除</p>
      <button class="detail-not-found__btn" @click="router.push('/')">返回首页</button>
    </div>
  </div>
  <div v-else class="detail-page">
    <div class="detail-container">
      <!-- ===== Left: Media panel ===== -->
      <aside class="detail-media">
        <div
          class="detail-media__viewport"
          @mouseenter="isHovering = true"
          @mouseleave="isHovering = false"
        >
          <transition v-if="currentMedia" :name="'media-slide-' + slideDir" mode="out-in">
            <div class="detail-media__inner" :key="currentMediaIndex">
              <!-- Image -->
              <template v-if="currentMedia.type === 'image'">
                <div v-if="isExpanded" class="detail-media__blur-bg" :style="{ backgroundImage: `url(${currentMedia.src})` }"></div>
                <img
                  :key="currentMedia.src"
                  :src="currentMedia.src"
                  :alt="'图片 ' + (currentMediaIndex + 1)"
                  class="detail-media__img"
                  :class="{ 'detail-media__img--expanded': isExpanded }"
                  @load="onMediaImageLoad"
                />
              </template>
              <!-- Video -->
              <template v-else-if="currentMedia.type === 'video'">
                <video
                  ref="videoRef"
                  :poster="currentMedia.poster"
                  class="detail-media__video"
                  controls
                  @play="onVideoPlay"
                  @pause="onVideoPause"
                  @ended="onVideoEnded"
                >
                  <source :src="currentMedia.src" type="video/mp4" />
                </video>
              </template>
            </div>
          </transition>

          <!-- Nav arrows -->
          <button v-if="mediaCount > 1" class="detail-media__arrow detail-media__arrow--prev" @click.stop="prevMedia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button v-if="mediaCount > 1" class="detail-media__arrow detail-media__arrow--next" @click.stop="nextMedia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <!-- Counter -->
          <div v-if="mediaCount > 1" class="detail-media__counter">{{ currentMediaIndex + 1 }} / {{ mediaCount }}</div>

          <!-- Dots -->
          <div v-if="mediaCount > 1" class="detail-media__dots">
            <button
              v-for="(_, idx) in mediaCount"
              :key="idx"
              class="detail-media__dot"
              :class="{ 'detail-media__dot--active': idx === currentMediaIndex }"
              @click.stop="goToMedia(idx)"
            ></button>
          </div>
        </div>
      </aside>

      <!-- ===== Center: Content ===== -->
      <main class="detail-content">
        <!-- Author info -->
        <div class="detail-content__author">
          <div class="detail-content__author-avatar">
            <img :src="post.authorAvatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
          </div>
          <span class="detail-content__author-name">{{ post.author }}</span>
          <div v-if="isAuthor" class="detail-content__menu">
            <button class="detail-content__menu-btn" @click.stop="toggleMenu">
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <div v-if="menuOpen" class="detail-content__menu-dropdown" @click.stop>
              <button @click="deletePost(); closeMenu()">删除帖子</button>
            </div>
          </div>
        </div>

        <div v-if="post.status !== 1" class="detail-content__banner" :class="{ 'detail-content__banner--rejected': post.status === 2 }">
          <template v-if="post.status === 0">正在审核中，审核通过后将公开展示...</template>
          <template v-else-if="post.status === 2">
            审核未通过
            <span v-if="post.rejectReason" class="detail-content__banner-reason">原因：{{ post.rejectReason }}</span>
          </template>
          <template v-else>仅自己可见</template>
        </div>
        <h1 class="detail-content__title">{{ post.title }}</h1>
        <div class="detail-content__meta">
          <span class="detail-content__time">{{ post.time }}</span>
          <span class="detail-content__tags">
            <span v-for="tag in post.tags" :key="tag" class="detail-content__tag">{{ tag }}</span>
          </span>
        </div>
        <div class="detail-content__body" v-html="renderedContent"></div>

        <!-- Action buttons -->
        <div class="detail-content__actions">
          <button class="detail-actions__btn" :class="{ 'detail-actions__btn--active': post.liked }" @click="toggleLike">
            <svg viewBox="0 0 24 24" :fill="post.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ formatLikes(post.likes) }}</span>
          </button>
          <button class="detail-actions__btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ post.comments }}</span>
          </button>
          <div class="detail-actions__btn detail-actions__views">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{{ formatLikes(post.views) }}</span>
          </div>
          <button class="detail-actions__btn" :class="{ 'detail-actions__btn--active': post.bookmarked }" @click="toggleBookmark">
            <svg viewBox="0 0 24 24" :fill="post.bookmarked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <div class="detail-actions__share" style="position:relative">
            <button class="detail-actions__btn" @click="copyShareLink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <span v-if="shareTip" class="detail-actions__share-tip">链接已复制至剪切板</span>
          </div>
        </div>
      </main>
    </div>

    <!-- ===== Bottom: Comments ===== -->
    <section class="detail-comments">
      <div class="detail-comments__header">
        <h2 class="detail-comments__title">评论 {{ post.comments }}</h2>
      </div>

      <!-- Write comment -->
      <div class="detail-comments__write">
        <div class="detail-comments__write-avatar">
          <img :src="user?.avatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
        </div>
        <div class="detail-comments__write-body">
          <textarea
            v-model="newComment"
            class="detail-comments__write-input"
            placeholder="说点什么吧..."
            rows="3"
          ></textarea>
          <div class="detail-comments__write-actions">
            <button
              class="detail-comments__write-btn"
              :disabled="!newComment.trim()"
              @click="submitComment"
            >发表评论</button>
          </div>
        </div>
      </div>

      <div class="detail-comments__list">
        <div v-for="(comment, idx) in comments" :key="comment.id" class="detail-comments__item">
          <div class="detail-comments__avatar">
            <img :src="comment.avatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
          </div>
          <div class="detail-comments__body">
            <div class="detail-comments__top">
              <span class="detail-comments__user">{{ comment.user }}</span>
              <span class="detail-comments__floor">#{{ idx + 1 }}</span>
              <span class="detail-comments__time">{{ comment.time }}</span>
            </div>
            <p class="detail-comments__text">{{ comment.body }}</p>
          </div>
          <button
            class="detail-comments__like"
            :class="{ 'detail-comments__like--liked': comment.liked }"
            @click="toggleCommentLike(comment)"
          >
            <svg viewBox="0 0 24 24" :fill="comment.liked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>{{ comment.likes > 0 ? comment.likes : '' }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  width: 100vw;
  height: 100vh;
  background: var(--color-background);
  overflow-y: auto;
  overflow-x: hidden;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  margin-top: 76px;
  height: calc(100vh - 76px);
}

.detail-not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--color-text-tertiary);
}

.detail-not-found svg {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
}

.detail-not-found h2 {
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

.detail-not-found p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.detail-not-found__btn {
  padding: 10px 24px;
  border-radius: 22px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.detail-not-found__btn:hover {
  background: var(--color-foreground);
}

.detail-container {
  display: flex;
  gap: 24px;
  width: 70vw;
  margin: 0 auto;
  padding: 24px 0;
}

/* ===== Left: Media ===== */
.detail-media {
  flex-shrink: 0;
  width: 420px;
}

.detail-media__viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  background: #1a1a1a;
}

.detail-media__inner {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.detail-media__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Expansion: blurred bg + centered original */
.detail-media__blur-bg {
  position: absolute;
  inset: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(24px) brightness(0.55);
  transform: scale(1.1);
  z-index: 0;
}

.detail-media__img--expanded {
  position: relative;
  z-index: 1;
  object-fit: contain;
}

.detail-media__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ===== Media slide transitions ===== */
.media-slide-next-enter-active,
.media-slide-next-leave-active,
.media-slide-prev-enter-active,
.media-slide-prev-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Next: enter from right, leave to left */
.media-slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.media-slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Prev: enter from left, leave to right */
.media-slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.media-slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Nav arrows */
.detail-media__arrow {
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
  backdrop-filter: blur(4px);
}

.detail-media__viewport:hover .detail-media__arrow {
  opacity: 1;
}

.detail-media__arrow svg {
  width: 20px;
  height: 20px;
}

.detail-media__arrow--prev { left: 8px; }
.detail-media__arrow--next { right: 8px; }

/* Counter */
.detail-media__counter {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  border-radius: 10px;
  z-index: 3;
  backdrop-filter: blur(4px);
}

/* Dots */
.detail-media__dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 3;
}

.detail-media__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
  transition: all var(--transition-fast);
}

.detail-media__dot--active {
  background: #fff;
  transform: scale(1.3);
}

/* ===== Center: Content ===== */
.detail-content {
  flex: 1;
  min-width: 0;
  padding: 16px 0;
}

/* ===== Author row ===== */
.detail-content__author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.detail-content__author-avatar {
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

.detail-content__author-avatar svg {
  width: 26px;
  height: 26px;
}

.detail-content__author-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.detail-content__author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.detail-content__banner {
  padding: 10px 16px;
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 10px;
  color: #92400E;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
  line-height: 1.6;
}

.detail-content__banner--rejected {
  background: #FEE2E2;
  border-color: #FECACA;
  color: #991B1B;
}

.detail-content__banner-reason {
  display: block;
  margin-top: 4px;
  color: #B91C1C;
}

.detail-content__menu {
  position: relative;
  flex-shrink: 0;
}

.detail-content__menu-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.detail-content__menu-btn:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.detail-content__menu-btn svg {
  width: 18px;
  height: 18px;
}

.detail-content__menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 20;
  min-width: 120px;
}

.detail-content__menu-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-destructive);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.detail-content__menu-dropdown button:hover {
  background: var(--color-muted);
}

.detail-content__title {
  font-family: var(--font-heading);
  font-size: 26px;
  color: var(--color-foreground);
  line-height: 1.3;
  margin-bottom: 12px;
}

.detail-content__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.detail-content__time {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.detail-content__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-content__tag {
  font-size: 12px;
  padding: 3px 10px;
  background: var(--color-muted);
  color: var(--color-primary);
  border-radius: 10px;
  font-weight: 500;
}

.detail-content__body {
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-text);
  white-space: pre-wrap;
}

.detail-content__body :deep(p) {
  margin-bottom: 12px;
}

.detail-content__body :deep(strong) {
  font-weight: 600;
  color: var(--color-foreground);
}

.detail-content__body :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.detail-content__body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 0.9em;
}

.detail-content__body :deep(th),
.detail-content__body :deep(td) {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
}

.detail-content__body :deep(th) {
  background: #f8fafc;
  font-weight: 600;
}

.detail-content__body :deep(tr:nth-child(even)) {
  background: #fafafa;
}

/* ===== Action buttons ===== */
.detail-content__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.detail-actions__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 22px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.detail-actions__btn:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.detail-actions__btn--active {
  color: var(--color-primary);
}

.detail-actions__btn--active:hover {
  color: var(--color-primary);
}

.detail-actions__share-tip {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-foreground);
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  white-space: nowrap;
  pointer-events: none;
}

.detail-actions__views {
  pointer-events: none;
}

.detail-actions__btn svg {
  width: 20px;
  height: 20px;
}

/* ===== Comments ===== */
.detail-comments {
  width: 70vw;
  margin: 0 auto;
  padding: 0 0 40px;
}

.detail-comments__header {
  margin-bottom: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.detail-comments__title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
}

/* ===== Write comment ===== */
.detail-comments__write {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: 14px;
}

.detail-comments__write-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.detail-comments__write-avatar svg {
  width: 22px;
  height: 22px;
}

.detail-comments__write-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.detail-comments__write-body {
  flex: 1;
  min-width: 0;
}

.detail-comments__write-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  border: 2px solid transparent;
  border-radius: 12px;
  outline: none;
  resize: vertical;
  min-height: 44px;
  transition: all var(--transition-fast);
}

.detail-comments__write-input::placeholder {
  color: var(--color-text-tertiary);
}

.detail-comments__write-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
}

.detail-comments__write-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.detail-comments__write-btn {
  padding: 8px 22px;
  border-radius: 18px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.detail-comments__write-btn:hover:not(:disabled) {
  background: var(--color-foreground);
}

.detail-comments__write-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.detail-comments__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-comments__item {
  display: flex;
  gap: 14px;
  padding: 18px 20px;
  background: var(--color-surface);
  border-radius: 14px;
  transition: background var(--transition-fast);
}

.detail-comments__item:hover {
  background: var(--color-surface-hover);
}

.detail-comments__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-accent));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.detail-comments__avatar svg {
  width: 22px;
  height: 22px;
}

.detail-comments__avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.detail-comments__body {
  flex: 1;
  min-width: 0;
}

.detail-comments__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.detail-comments__user {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.detail-comments__floor {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 500;
}

.detail-comments__time {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.detail-comments__text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.detail-comments__like {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  align-self: flex-start;
}

.detail-comments__like:hover {
  background: var(--color-muted);
  color: var(--color-primary);
}

.detail-comments__like--liked {
  color: var(--color-primary);
}

.detail-comments__like svg {
  width: 16px;
  height: 16px;
}

/* ===== Responsive ===== */
@media (max-width: 1200px) {
  .detail-container,
  .detail-comments {
    width: 80vw;
  }

  .detail-container {
    gap: 16px;
    padding: 16px 0;
  }

  .detail-media {
    width: 340px;
  }
}

@media (max-width: 768px) {
  .detail-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }

  .detail-container,
  .detail-comments {
    width: auto;
    padding: 16px;
  }

  .detail-container {
    flex-direction: column;
    align-items: center;
  }

  .detail-media {
    width: 100%;
    max-width: 400px;
  }
}
</style>
