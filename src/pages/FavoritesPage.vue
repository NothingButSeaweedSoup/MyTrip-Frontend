<script setup>
import { ref, onMounted } from 'vue'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import PostCard from '@/components/PostCard.vue'
import api, { BASE_URL } from '@/api'

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
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function mapPost(vo) {
  const images = vo.images || []
  return {
    id: vo.postId,
    title: vo.title || '',
    author: vo.authorName || '匿名用户',
    authorAvatar: vo.authorAvatar || '',
    likes: vo.likes || 0,
    views: vo.views || 0,
    liked: vo.liked || false,
    favorited: vo.favorited || false,
    time: formatTime(vo.createTime),
    image: images.length > 0
      ? (images[0].startsWith('http') ? images[0] : BASE_URL + images[0])
      : '',
    height: 240 + Math.floor(Math.random() * 120),
  }
}

const posts = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const noMore = ref(false)

async function fetchFavorites() {
  if (loading.value) return
  loading.value = true
  try {
    const data = await api.get(`/favorite/list?page=${page.value}&pageSize=${pageSize}`)
    if (data && data.length > 0) {
      posts.value.push(...data.map(mapPost))
      if (data.length < pageSize) noMore.value = true
    } else {
      noMore.value = true
    }
    page.value++
  } catch (e) {
    console.error('获取收藏列表失败:', e)
  } finally {
    loading.value = false
  }
}

const diffScrollEnabled = ref(true)

onMounted(() => {
  fetchFavorites()
})
</script>

<template>
  <SearchBar v-model="diffScrollEnabled" :show-diff-toggle="false" />
  <SidebarNav />
  <main class="favorites-page" @scroll.passive="onScroll">
    <div class="favorites-header">
      <h1 class="favorites-title">我的收藏</h1>
    </div>
    <div v-if="posts.length > 0" class="favorites-grid">
      <PostCard v-for="post in posts" :key="post.postId" :post="post" />
    </div>
    <div v-else-if="!loading" class="favorites-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <p>还没有收藏任何帖子</p>
    </div>
    <div v-if="loading" class="favorites-loading">加载中...</div>
  </main>
</template>

<style scoped>
.favorites-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px;
}

.favorites-header {
  max-width: 960px;
  margin: 0 auto 24px;
}

.favorites-title {
  font-family: var(--font-heading);
  font-size: 24px;
  color: var(--color-foreground);
}

.favorites-grid {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.favorites-empty {
  max-width: 960px;
  margin: 80px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--color-text-tertiary);
  font-size: 15px;
}

.favorites-empty svg {
  width: 48px;
  height: 48px;
}

.favorites-loading {
  text-align: center;
  padding: 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .favorites-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px;
  }

  .favorites-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
