<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import PostCard from '@/components/PostCard.vue'
import api, { BASE_URL } from '@/api'

const router = useRouter()
const { user, fetchUser } = useAuth()

const activeTab = ref('posts')
const posts = ref([])
const favorites = ref([])
const loading = ref(false)
const postsPage = ref(1)
const favPage = ref(1)
const postsNoMore = ref(false)
const favNoMore = ref(false)
const pageSize = 10

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

async function fetchPosts() {
  if (loading.value || postsNoMore.value) return
  loading.value = true
  try {
    const data = await api.get(`/post/my-posts?page=${postsPage.value}&pageSize=${pageSize}`)
    const list = data?.records || data || []
    if (list.length > 0) {
      posts.value.push(...list.map(mapPost))
      if (list.length < pageSize) postsNoMore.value = true
      postsPage.value++
    } else {
      postsNoMore.value = true
    }
  } catch (e) {
    console.error('获取帖子列表失败:', e)
  } finally {
    loading.value = false
  }
}

async function fetchFavorites() {
  if (loading.value || favNoMore.value) return
  loading.value = true
  try {
    const data = await api.get(`/favorite/list?page=${favPage.value}&pageSize=${pageSize}`)
    if (data && data.length > 0) {
      favorites.value.push(...data.map(mapPost))
      if (data.length < pageSize) favNoMore.value = true
      favPage.value++
    } else {
      favNoMore.value = true
    }
  } catch (e) {
    console.error('获取收藏列表失败:', e)
  } finally {
    loading.value = false
  }
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'favorites' && favorites.value.length === 0 && !loading.value) {
    fetchFavorites()
  }
}

const currentList = computed(() => activeTab.value === 'posts' ? posts.value : favorites.value)
const currentNoMore = computed(() => activeTab.value === 'posts' ? postsNoMore.value : favNoMore.value)

const budgetLabel = computed(() => {
  const map = { low: '穷游', middle: '舒适', high: '高端' }
  return map[user.value?.budgetLevel] || '舒适'
})

const budgetClass = computed(() => {
  return `profile-budget--${user.value?.budgetLevel || 'middle'}`
})

onMounted(async () => {
  await fetchUser()
  fetchPosts()
})
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <main class="profile-page">
    <!-- User info card -->
    <div class="profile-card">
      <div class="profile-card__avatar">
        <img :src="user?.avatar || '/Akari.jpg'" alt="头像" @error="e => e.target.src = '/Akari.jpg'" />
      </div>
      <div class="profile-card__info">
        <h1 class="profile-card__name">{{ user?.username || '未知用户' }}</h1>
        <p class="profile-card__bio">{{ user?.bio || '这个人很懒，什么都没写' }}</p>
        <span class="profile-card__budget" :class="budgetClass">{{ budgetLabel }}</span>
        <button class="profile-card__edit-btn" @click="router.push('/profile/edit')">编辑资料</button>
      </div>
      <div class="profile-card__stats">
        <div class="profile-stat">
          <span class="profile-stat__num">{{ user?.postCount ?? 0 }}</span>
          <span class="profile-stat__label">帖子</span>
        </div>
        <div class="profile-stat">
          <span class="profile-stat__num">{{ user?.favoriteCount ?? 0 }}</span>
          <span class="profile-stat__label">收藏</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="profile-tabs">
      <button
        class="profile-tab"
        :class="{ 'profile-tab--active': activeTab === 'posts' }"
        @click="switchTab('posts')"
      >我的帖子</button>
      <button
        class="profile-tab"
        :class="{ 'profile-tab--active': activeTab === 'favorites' }"
        @click="switchTab('favorites')"
        >我的收藏</button>
    </div>

    <!-- Content -->
    <div class="profile-grid">
      <PostCard v-for="post in currentList" :key="post.id + activeTab" :post="post" />
    </div>
    <div v-if="loading" class="profile-loading">加载中...</div>
    <div v-else-if="currentList.length === 0" class="profile-empty">
      {{ activeTab === 'posts' ? '还没有发布过帖子' : '还没有收藏任何帖子' }}
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px 80px;
}

/* Card */
.profile-card {
  max-width: 960px;
  margin: 0 auto 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
  background: var(--color-surface);
  border-radius: 16px;
}

.profile-card__avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.profile-card__avatar svg {
  width: 40px;
  height: 40px;
}

.profile-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-card__info {
  flex: 1;
  min-width: 0;
}

.profile-card__name {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 4px;
}

.profile-card__bio {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.profile-card__budget {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 600;
  background: var(--color-muted);
  color: var(--color-primary);
  margin-right: 10px;
}

.profile-card__edit-btn {
  padding: 6px 16px;
  border-radius: 16px;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.profile-card__edit-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.profile-budget--low { color: var(--color-secondary); }
.profile-budget--high { color: var(--color-accent); }

.profile-card__stats {
  display: flex;
  gap: 32px;
  flex-shrink: 0;
}

.profile-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.profile-stat__num {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--color-foreground);
}

.profile-stat__label {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* Tabs */
.profile-tabs {
  max-width: 960px;
  margin: 0 auto 20px;
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border);
}

.profile-tab {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  font-family: var(--font-body);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
}

.profile-tab:hover {
  color: var(--color-text);
}

.profile-tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* Grid */
.profile-grid {
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.profile-loading {
  text-align: center;
  padding: 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.profile-empty {
  max-width: 640px;
  margin: 40px auto 0;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 15px;
}

@media (max-width: 768px) {
  .profile-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px 16px 80px;
  }

  .profile-card {
    flex-wrap: wrap;
    padding: 20px;
  }

  .profile-card__stats {
    width: 100%;
    justify-content: space-around;
  }

  .profile-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
