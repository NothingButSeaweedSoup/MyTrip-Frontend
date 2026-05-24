<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import PostCard from '@/components/PostCard.vue'
import api, { BASE_URL } from '@/api'

const route = useRoute()

const keyword = ref('')
const posts = ref([])
const suggestions = ref([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(0)
const pageSize = 20

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
    time: formatTime(vo.createTime),
    image: images.length > 0
      ? (images[0].startsWith('http') ? images[0] : BASE_URL + images[0])
      : '',
    height: 240 + Math.floor(Math.random() * 120),
  }
}

async function doSearch(q, p = 1) {
  if (!q) return
  keyword.value = q
  loading.value = true
  try {
    const [result, sug] = await Promise.all([
      api.get(`/search?keyword=${encodeURIComponent(q)}&page=${p}&pageSize=${pageSize}`),
      api.get(`/search/suggest?keyword=${encodeURIComponent(q)}`),
    ])
    if (p === 1) {
      posts.value = (result.records || []).map(mapPost)
    } else {
      posts.value.push(...(result.records || []).map(mapPost))
    }
    totalPages.value = result.pages || 0
    page.value = p
    suggestions.value = sug || []
  } catch {
    posts.value = []
  } finally {
    loading.value = false
  }
}

function searchTag(tag) {
  doSearch(tag)
}

let scrollEl = null

function onScroll() {
  if (!scrollEl || loading.value || page.value >= totalPages.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollEl
  if (scrollHeight - scrollTop - clientHeight < 200) {
    doSearch(keyword.value, page.value + 1)
  }
}

onMounted(() => {
  nextTick(() => {
    scrollEl = document.querySelector('.search-page')
    if (scrollEl) scrollEl.addEventListener('scroll', onScroll, { passive: true })
  })
  const q = route.query.q
  if (q) doSearch(q)
})

onUnmounted(() => {
  if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
})

watch(() => route.query.q, (q) => {
  if (q) doSearch(q)
})
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <main class="search-page">
    <div v-if="keyword" class="search-header">
      <h1 class="search-header__title">"{{ keyword }}" 的搜索结果</h1>
      <div v-if="suggestions.length > 0" class="search-suggestions">
        <span class="search-suggestions__label">相关标签：</span>
        <button v-for="s in suggestions" :key="s" class="search-suggestion-tag" @click="searchTag(s)">{{ s }}</button>
      </div>
    </div>

    <div v-if="posts.length > 0" class="search-grid">
      <PostCard v-for="post in posts" :key="post.id" :post="post" />
    </div>

    <div v-else-if="!loading && keyword" class="search-empty">
      未找到相关内容
    </div>

    <div v-if="loading && posts.length > 0" class="search-loading">加载中...</div>
  </main>
</template>

<style scoped>
.search-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px 80px;
}

.search-header {
  max-width: 960px;
  margin: 0 auto 24px;
}

.search-header__title {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 12px;
}

.search-suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-suggestions__label {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.search-suggestion-tag {
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-suggestion-tag:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.search-grid {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.search-empty {
  max-width: 960px;
  margin: 80px auto;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 15px;
}

.search-loading {
  text-align: center;
  padding: 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

@media (max-width: 768px) {
  .search-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px;
  }

  .search-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
