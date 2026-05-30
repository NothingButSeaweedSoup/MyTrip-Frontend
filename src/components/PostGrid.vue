<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import PostCard from './PostCard.vue'
import api, { BASE_URL } from '@/api'

const BATCH_SIZE = 30

const loading = ref(false)

const MOCK_POSTS = [
  { id: 1, title: '大理洱海边的日出，治愈了我所有的疲惫', author: '旅行者小陈', likes: 2391, views: 12800, time: '3小时前', image: 'https://picsum.photos/seed/trip1/400/500', height: 320 },
  { id: 2, title: '成都街头最地道的火锅，本地人都在排队', author: '美食猎人', likes: 4827, views: 23100, time: '5小时前', image: 'https://picsum.photos/seed/trip2/400/420', height: 260 },
  { id: 3, title: '日本京都红叶季🍁必去的5个寺庙', author: '自由行达人', likes: 3856, views: 19500, time: '8小时前', image: 'https://picsum.photos/seed/trip3/400/380', height: 240 },
  { id: 4, title: '三亚小众海滩推荐，比天涯海角美十倍', author: '海岛控小王', likes: 6712, views: 34200, time: '昨天', image: 'https://picsum.photos/seed/trip4/400/550', height: 350 },
  { id: 5, title: '新疆独库公路自驾攻略｜最美的风景在路上', author: '越野爱好者', likes: 9123, views: 45800, time: '昨天', image: 'https://picsum.photos/seed/trip5/400/360', height: 220 },
  { id: 6, title: '丽江古城民宿推荐，人均100住进花园里', author: '背包客小李', likes: 3456, views: 16700, time: '2天前', image: 'https://picsum.photos/seed/trip6/400/480', height: 300 },
  { id: 7, title: '桂林阳朔骑行路线，十里画廊美到窒息', author: '单车旅行家', likes: 5034, views: 28900, time: '2天前', image: 'https://picsum.photos/seed/trip7/400/400', height: 250 },
  { id: 8, title: '重庆洪崖洞夜景拍摄最佳机位分享', author: '摄影师阿杰', likes: 7890, views: 52100, time: '3天前', image: 'https://picsum.photos/seed/trip8/400/520', height: 330 },
  { id: 9, title: '西藏旅行必备清单｜高原反应怎么办？', author: '高原行者', likes: 2156, views: 9800, time: '3天前', image: 'https://picsum.photos/seed/trip9/400/340', height: 210 },
  { id: 10, title: '杭州西湖边的隐藏咖啡馆，安静又出片', author: '城市漫游者', likes: 1678, views: 7200, time: '4天前', image: 'https://picsum.photos/seed/trip10/400/460', height: 290 },
  { id: 11, title: '哈尔滨冰雪大世界攻略｜零下30度的快乐', author: '东北老铁', likes: 4567, views: 21300, time: '5天前', image: 'https://picsum.photos/seed/trip11/400/500', height: 310 },
  { id: 12, title: '厦门鼓浪屿一日游，文艺青年的天堂', author: '海岛日记', likes: 3210, views: 15400, time: '6天前', image: 'https://picsum.photos/seed/trip12/400/380', height: 240 },
  { id: 13, title: '张家界玻璃栈道！吓哭但值得的体验', author: '极限挑战者', likes: 8432, views: 67500, time: '1周前', image: 'https://picsum.photos/seed/trip13/400/440', height: 280 },
  { id: 14, title: '云南香格里拉徒步，遇见心中的日月', author: '户外探险家', likes: 5678, views: 38900, time: '1周前', image: 'https://picsum.photos/seed/trip14/400/560', height: 360 },
  { id: 15, title: '广州早茶探店｜人均50吃到撑的老字号', author: '吃货小分队', likes: 2987, views: 14200, time: '1周前', image: 'https://picsum.photos/seed/trip15/400/360', height: 230 },
]

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

function randomHeight() {
  return 200 + Math.floor(Math.random() * 200)
}

function resolveImageUrl(p) {
  if (p.images && p.images.length > 0) {
    const img = p.images[0]
    if (img.startsWith('http')) return img
    return BASE_URL + img
  }
  return `https://picsum.photos/seed/${p.postId}/400/400`
}

function mapPost(p) {
  return {
    id: p.postId,
    title: p.title,
    author: p.authorName || '匿名用户',
    authorAvatar: p.authorAvatar || '',
    likes: p.likes || 0,
    views: p.views || 0,
    liked: p.liked || false,
    time: formatTime(p.createTime),
    image: resolveImageUrl(p),
    height: randomHeight()
  }
}

function applyPosts(postList) {
  posts.value = postList
  columns.value = distributePosts(posts.value, columnCount.value)
  halfHeights.value = Array(columnCount.value).fill(0)
  scrollOffsets.value = Array(columnCount.value).fill(0)
  velocity.value = 0
  nextTick(calculateHalfHeights)
}

function applyMock() {
  applyPosts([...MOCK_POSTS])
}

async function fetchFeed() {
  loading.value = true
  try {
    const data = await api.get(`/recommend/feed?page=1&pageSize=${BATCH_SIZE}`)
    if (data.records && data.records.length > 0) {
      applyPosts(data.records.map(mapPost))
    } else {
      applyMock()
    }
  } catch (e) {
    console.error('推荐接口请求失败:', e)
    applyMock()
  } finally {
    loading.value = false
  }
}

async function nextBatch() {
  if (loading.value) return
  await fetchFeed()
}

const posts = ref([])

const CARD_GAP = 24
const SPEED_MIN = 0.45
const SPEED_MAX = 1.55
const INFLUENCE_RADIUS = 380
const FRICTION = 0.94
const VELOCITY_THRESHOLD = 0.3

function getColumnCount() {
  const w = window.innerWidth
  if (w <= 768) return 2
  if (w <= 1200) return 3
  return 4
}

const columnCount = ref(getColumnCount())

function distributePosts(postList, count) {
  const columns = Array.from({ length: count }, () => [])
  const heights = Array(count).fill(0)
  for (const post of postList) {
    const minIdx = heights.indexOf(Math.min(...heights))
    columns[minIdx].push(post)
    heights[minIdx] += post.height + CARD_GAP
  }
  return columns
}

const columns = ref(distributePosts(posts.value, columnCount.value))

// 3 copies per column: left padding | visible middle | right padding
const loopedColumns = computed(() =>
  columns.value.map(col => [...col, ...col, ...col])
)

// Momentum scroll state
const mouseX = ref(window.innerWidth / 2)
const velocity = ref(0)
const halfHeights = ref(Array(columnCount.value).fill(0))
const scrollOffsets = ref(Array(columnCount.value).fill(0))

const columnRefs = ref([])
let animFrameId = null

function setColumnRef(el, index) {
  if (el) columnRefs.value[index] = el
}

function getMainTop() {
  return window.innerWidth <= 768 ? 64 : 76
}

function calculateHalfHeights() {
  columnRefs.value.forEach((wrapper, i) => {
    if (wrapper) {
      halfHeights.value[i] = wrapper.scrollHeight / 3
    }
  })
  // Initialize offsets at halfHeight (start of middle copy)
  scrollOffsets.value = halfHeights.value.map(h => h || 0)
}

function recalculateLayout() {
  const newCount = getColumnCount()
  if (newCount !== columnCount.value) {
    columnCount.value = newCount
    columns.value = distributePosts(posts.value, newCount)
    halfHeights.value = Array(newCount).fill(0)
    scrollOffsets.value = Array(newCount).fill(0)
    velocity.value = 0
    nextTick(calculateHalfHeights)
  } else {
    calculateHalfHeights()
  }
}

const props = defineProps({
  diffScrollEnabled: { type: Boolean, default: true }
})

function onMouseMove(e) {
  mouseX.value = e.clientX
}

function onWheel(e) {
  e.preventDefault()
  velocity.value += e.deltaY * 1.2
  startAnimation()
}

function startAnimation() {
  if (!animFrameId) {
    animFrameId = requestAnimationFrame(animate)
  }
}

function getMouseSpeed(colIndex) {
  if (!props.diffScrollEnabled) return 1.0

  const count = columnCount.value
  const sidebarWidth = window.innerWidth <= 768 ? 48 : 60
  const contentStart = sidebarWidth
  const contentWidth = window.innerWidth - sidebarWidth
  const columnWidth = contentWidth / count

  const columnCenterX = contentStart + columnWidth * colIndex + columnWidth / 2
  const distance = Math.abs(mouseX.value - columnCenterX)
  const influence = Math.max(0, 1 - distance / INFLUENCE_RADIUS)
  return SPEED_MIN + (SPEED_MAX - SPEED_MIN) * influence
}

function animate() {
  velocity.value *= FRICTION

  const count = columnCount.value
  let anyMoved = false

  for (let i = 0; i < count; i++) {
    const hh = halfHeights.value[i]
    if (!hh || hh <= 0) continue

    const speed = getMouseSpeed(i)
    const step = velocity.value * speed * 0.12
    if (Math.abs(step) < 0.01) continue
    anyMoved = true

    let offset = scrollOffsets.value[i] + step

    // Wrap within [halfHeight, 2*halfHeight) — the middle copy range
    if (offset >= 2 * hh) {
      offset -= hh
    } else if (offset < hh) {
      offset += hh
    }

    scrollOffsets.value[i] = offset
  }

  if (Math.abs(velocity.value) > VELOCITY_THRESHOLD || anyMoved) {
    animFrameId = requestAnimationFrame(animate)
  } else {
    velocity.value = 0
    animFrameId = null
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('resize', recalculateLayout)
  nextTick(calculateHalfHeights)
  fetchFeed()
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('resize', recalculateLayout)
  if (animFrameId) cancelAnimationFrame(animFrameId)
})
</script>

<template>
  <div class="post-grid-wrapper">
    <div class="post-grid-area">
      <div class="post-grid">
        <div
          v-for="(col, colIndex) in loopedColumns"
          :key="colIndex"
          :ref="(el) => setColumnRef(el, colIndex)"
          class="post-column"
        >
          <div
            class="post-column-inner"
            :style="{ transform: `translateY(${-scrollOffsets[colIndex]}px)` }"
          >
            <PostCard
              v-for="(post, idx) in col"
              :key="`${colIndex}-${post.id}-${idx}`"
              :post="post"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="batch-sidebar">
      <button
        class="refresh-btn"
        :class="{ loading: loading }"
        :disabled="loading"
        @click="nextBatch"
      >
        <span v-if="loading" class="spinner"></span>
        <span>{{ loading ? '加载中...' : '换一批' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.post-grid-wrapper {
  display: flex;
  width: 100%;
  height: 100%;
}

.post-grid-area {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
  height: 100%;
  min-width: 0;
}

.post-grid {
  display: flex;
  gap: 24px;
  height: 100%;
  width: 100%;
  max-width: 1100px;
  padding: 0 24px;
}

.post-column {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.post-column-inner {
  will-change: transform;
}

.batch-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 16px;
  flex-shrink: 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 10px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 20px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
  writing-mode: vertical-rl;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--accent-color, #4a90d9);
  color: #fff;
  border-color: var(--accent-color, #4a90d9);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1200px) {
  .post-grid {
    gap: 20px;
    padding: 0 16px;
  }
}

@media (max-width: 768px) {
  .post-grid {
    gap: 12px;
    padding: 0 8px;
  }
  .batch-sidebar {
    padding: 0 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-column-inner {
    transition: none;
  }
}
</style>
