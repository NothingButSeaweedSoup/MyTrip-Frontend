<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const imgLoaded = ref(false)
const liked = ref(props.post.liked || false)
const localLikes = ref(props.post.likes || 0)

function onImageLoad() {
  imgLoaded.value = true
}

function goToDetail() {
  router.push(`/post/${props.post.id}`)
}

async function toggleLike(e) {
  e.stopPropagation()
  try {
    const newLikes = await api.post(`/post/${props.post.id}/like`, { action: liked.value ? 'unlike' : 'like' })
    liked.value = !liked.value
    localLikes.value = newLikes
  } catch (e) {
    console.error('点赞失败:', e)
  }
}

function formatCount(count) {
  if (count >= 10000) return (count / 10000).toFixed(1) + 'w'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return String(count)
}
</script>

<template>
  <div class="post-card" @click="goToDetail">
    <img
      class="post-card-image"
      :src="post.image"
      :alt="post.title"
      loading="lazy"
      :style="{ height: post.height + 'px' }"
      @load="onImageLoad"
      @error="($event.target).style.background = 'linear-gradient(135deg, #86EFAC, #6EE7B7, #0D9488)'"
    />

    <!-- Stats badges: top-left -->
    <div v-if="imgLoaded" class="post-card-badges">
      <button class="post-card-badge post-card-badge--like" :class="{ 'post-card-badge--liked': liked }" @click="toggleLike">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>{{ formatCount(localLikes) }}</span>
      </button>
      <div class="post-card-badge post-card-badge--views">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>{{ formatCount(post.views || 0) }}</span>
      </div>
    </div>

    <!-- Bottom overlay -->
    <div v-if="imgLoaded" class="post-card-overlay">
      <div class="post-card-info">
        <h3 class="post-card-title">{{ post.title }}</h3>
        <span class="post-card-time">{{ post.time }}</span>
      </div>
      <div class="post-card-author">
        <div class="post-card-avatar">
          <img :src="post.authorAvatar || '/Akari.jpg'" @error="e => e.target.src = '/Akari.jpg'" />
        </div>
        <span class="post-card-author-name">{{ post.author }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  break-inside: avoid;
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface);
  cursor: pointer;
  position: relative;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.post-card-image {
  width: 100%;
  display: block;
  object-fit: cover;
  background: linear-gradient(135deg, #86EFAC, #6EE7B7, #0D9488);
}

.post-card-overlay {
  pointer-events: none;
}

/* ===== Stats badges ===== */
.post-card-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.post-card-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px 6px 10px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 20px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  font-size: 13px;
  font-weight: 600;
  border: none;
  font-family: inherit;
}

.post-card-badge--like {
  cursor: pointer;
  transition: background 0.2s;
}

.post-card-badge--like:hover {
  background: rgba(0, 0, 0, 0.6);
}

.post-card-badge--liked {
  background: rgba(220, 38, 38, 0.7);
}

.post-card-badge--liked:hover {
  background: rgba(220, 38, 38, 0.85);
}

.post-card-badge--views {
  pointer-events: none;
}

.post-card-badge svg {
  width: 16px;
  height: 16px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
  flex-shrink: 0;
}

/* ===== Bottom overlay ===== */
.post-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  padding: 40px 12px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.70) 0%, rgba(0, 0, 0, 0.35) 50%, transparent 100%);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* ===== Info ===== */
.post-card-info {
  flex: 1;
  min-width: 0;
  color: #fff;
}

.post-card-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.post-card-time {
  font-size: 11px;
  opacity: 0.8;
}

/* ===== Author ===== */
.post-card-author {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 44px;
}

.post-card-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.post-card-avatar svg {
  width: 18px;
  height: 18px;
}

.post-card-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.post-card-author-name {
  font-size: 11px;
  color: #fff;
  opacity: 0.85;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
