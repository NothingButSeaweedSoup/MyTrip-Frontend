<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useAuth } from '@/stores/auth'
import api from '@/api'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import { Marked } from 'marked'

const md = new Marked({ breaks: true, gfm: true })

function renderMarkdown(text) {
  if (!text) return ''
  return md.parse(text)
}

const { user } = useAuth()
const userAvatar = computed(() => user.value?.avatar || '/Akari.jpg')

// --- state ---
const sessions = ref([])
const activeSessionId = ref(null)
const localMessages = ref({})   // { [sessionId]: [{role, text}] }
const messageInput = ref('')
const chatContainer = ref(null)
const hasPlan = ref(false)
const currentPlan = ref(null)
const planTab = ref('map')
const loading = ref(false)
const loadingText = ref('思考中…')
let loadingTimer = null
const sessionCollapsed = ref(false)
const mapCollapsed = ref(false)
window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECRET }
const AMAP_JS = 'https://webapi.amap.com/maps?v=2.0&key=' + import.meta.env.VITE_AMAP_KEY + '&plugin=AMap.Walking,AMap.Geocoder'
const mapReady = ref(false)
let mapInstance = null

const messages = computed(() =>
  activeSessionId.value ? (localMessages.value[activeSessionId.value] || []) : []
)

// --- load sessions ---
onMounted(async () => {
  try {
    sessions.value = await api.get('/trip-session/my')
  } catch (e) { console.error('加载会话失败', e) }
})

// --- session ---
async function selectSession(s) {
  const sid = s.sessionId
  loading.value = true
  activeSessionId.value = sid
  hasPlan.value = s.planId != null
  planTab.value = 'map'
  if (s.planId) {
    try {
      const plan = await api.get(`/trip-session/${sid}/plan`)
      if (plan) currentPlan.value = plan
    } catch (e) { console.error('加载计划失败', e) }
  } else {
    currentPlan.value = null
  }
  try {
    const msgs = await api.get(`/trip-session/${s.sessionId}/messages`)
    localMessages.value[s.sessionId] = (msgs || [])
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        text: m.role === 'tool' ? (m.toolResult || m.content) : m.content,
      }))
  } catch (e) {
    localMessages.value[s.sessionId] = []
  }
  loading.value = false
  nextTick(() => scrollToBottom())
}

async function deleteSession(s) {
  if (!confirm(`确定删除会话「${s.title}」吗？`)) return
  try {
    await api.delete(`/trip-session/${s.sessionId}`)
    sessions.value = sessions.value.filter(x => x.sessionId !== s.sessionId)
    if (activeSessionId.value === s.sessionId) {
      activeSessionId.value = null
      hasPlan.value = false
    }
  } catch (e) { console.error('删除失败', e) }
}

async function newSession() {
  try {
    const s = await api.post('/trip-session', { city: '广州' })
    sessions.value.unshift(s)
    localMessages.value[s.sessionId] = []
    selectSession(s)
  } catch (e) { console.error('创建会话失败', e) }
}

// --- chat ---
async function sendMessage() {
  const text = messageInput.value.trim()
  if (!text || !activeSessionId.value) return

  const sid = activeSessionId.value
  if (!localMessages.value[sid]) localMessages.value[sid] = []
  localMessages.value[sid].push({ role: 'user', text })
  messageInput.value = ''
  loading.value = true
  loadingText.value = '思考中…'
  loadingTimer = setTimeout(() => {
    loadingText.value = 'AI 正在生成行程计划，预计需要较长时间，请耐心等待…'
  }, 8000)
  nextTick(() => scrollToBottom())

  try {
    const resp = await api.post(`/trip-session/${sid}/chat`, { message: text })

    if (resp.messages && resp.messages.length > 0) {
      localMessages.value[sid] = resp.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          text: m.role === 'tool' ? (m.toolResult || m.content) : m.content,
          toolName: m.toolName,
        }))
    } else {
      localMessages.value[sid].push({ role: 'ai', text: resp.reply })
    }

    if (resp.plan) {
      hasPlan.value = true
      currentPlan.value = resp.plan
      const sess = sessions.value.find(s => s.sessionId === sid)
      if (sess) sess.planId = resp.plan.planId
    }

    if (resp.reply && resp.reply.includes('[LOCATION_REQUEST]')) {
      requestGeolocation(sid)
    }
  } catch (e) {
    localMessages.value[sid].push({ role: 'ai', text: '请求失败: ' + e.message })
  }
  clearTimeout(loadingTimer)
  loading.value = false
  nextTick(() => scrollToBottom())
}

function requestGeolocation(sid) {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const locMsg = `我的当前位置: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}`
      localMessages.value[sid].push({ role: 'user', text: locMsg })
      nextTick(() => scrollToBottom())
      try {
        const resp = await api.post(`/trip-session/${sid}/chat`, { message: locMsg })
        localMessages.value[sid].push({ role: 'ai', text: resp.reply })
      } catch (e) {
        localMessages.value[sid].push({ role: 'ai', text: '请求失败: ' + e.message })
      }
    },
    () => {
      localMessages.value[sid].push({ role: 'ai', text: '未能获取位置，请在浏览器设置中允许定位权限。' })
    }
  )
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// --- 高德地图 ---
function loadAmapScript() {
  if (document.getElementById('amap-sdk')) return Promise.resolve()
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.id = 'amap-sdk'; s.src = AMAP_JS
    s.onload = resolve
    document.head.appendChild(s)
  })
}

async function initMap() {
  await loadAmapScript()
  await nextTick()
  const el = document.getElementById('amap-container')
  if (!el) return
  if (!mapInstance) {
    mapInstance = new window.AMap.Map('amap-container', {
      center: [113.33, 23.13], zoom: 12, resizeEnable: true,
    })
    mapReady.value = true
    // 延迟 resize 确保容器渲染完成
    setTimeout(() => mapInstance?.resize(), 100)
  }
  await nextTick()
  drawItinerary()
}

function resizeMap() {
  // 展开时总是重建地图（v-if 切换后旧实例已作废）
  mapInstance = null
  mapReady.value = false
  initMap()
}

// 折叠时自动清空地图实例，展开时 initMap 会重建
watch(mapCollapsed, (v) => {
  if (v) {
    mapInstance = null
    mapReady.value = false
  }
})

function drawItinerary() {
  if (!mapInstance || !currentPlan.value?.itinerary) return
  mapInstance.clearMap()
  const allPoints = []

  currentPlan.value.itinerary.forEach((day, di) => {
    const spots = day.spots || []
    spots.forEach((sp, si) => {
      const lng = sp.lng || 113.33 + Math.random() * 0.05
      const lat = sp.lat || 23.13 + Math.random() * 0.03
      const marker = new window.AMap.Marker({
        position: [lng, lat],
        title: sp.name,
        label: {
          content: `<span style="background:var(--color-primary);color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;white-space:nowrap">${sp.name}</span>`,
          direction: 'top',
        },
      })
      marker.setMap(mapInstance)
      allPoints.push([lng, lat])
    })
  })

  if (allPoints.length >= 2) {
    for (let i = 0; i < allPoints.length - 1; i++) {
      new window.AMap.Polyline({
        path: [allPoints[i], allPoints[i + 1]], strokeColor: '#16A34A',
        strokeWeight: 3, strokeOpacity: .7, showDir: true,
      }).setMap(mapInstance)
    }
  }
  mapInstance.setFitView(null, false, [80, 80, 80, 80])
}

// 监听 hasPlan 或 currentPlan 的变化，确保数据到位后再画图
watch([hasPlan, currentPlan], async ([hp, plan]) => {
  if (hp && plan?.itinerary?.length && activeSessionId.value) {
    await nextTick()
    setTimeout(initMap, 350)
  }
})

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) {
    const m = String(ts).match(/(\d+)\/(\d+)\s+(\d+):(\d+)/)
    if (m) return `${m[1]}/${m[2]} ${m[3]}:${m[4]}`
    return String(ts)
  }
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
</script>

<template>
  <div class="trip-root">
    <SearchBar />
    <SidebarNav />

    <main class="trip-body">
      <!-- ===== 会话列表 ===== -->
      <aside class="session-panel" :class="{ collapsed: sessionCollapsed }">
        <button class="btn-toggle-sidebar" @click="sessionCollapsed = !sessionCollapsed" aria-label="切换侧边栏">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline :points="sessionCollapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6'"/>
          </svg>
        </button>

        <template v-if="!sessionCollapsed">
          <button class="btn-new" @click="newSession" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>新建会话</span>
          </button>

          <nav class="session-list">
            <div
              v-for="s in sessions"
              :key="s.sessionId"
              class="session-item"
              :class="{ active: activeSessionId === s.sessionId }"
              role="button"
              tabindex="0"
              @click="selectSession(s)"
              @keydown.enter="selectSession(s)"
            >
              <div class="session-icon">
                <svg v-if="s.planId" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div class="session-info">
                <div class="session-title">{{ s.title }}</div>
                <div class="session-meta">{{ s.planId ? '已有计划' : '对话中' }} · {{ formatTime(s.updateTime || s.updatedAt) }}</div>
              </div>
              <button class="btn-delete-session" @click.stop="deleteSession(s)" aria-label="删除会话">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </nav>
        </template>
      </aside>

      <!-- ===== 聊天区 ===== -->
      <div class="main-area" :class="{ 'has-plan': hasPlan }">
        <section class="chat-panel" :class="{ 'chat-shrink': hasPlan && !mapCollapsed }">
          <div v-if="!activeSessionId" class="chat-empty">
            <div class="empty-illustration">
              <img src="/Bot.png" alt="AI助手" class="empty-bot" />
            </div>
            <h2 class="empty-title">AI 旅游规划师</h2>
            <p class="empty-desc">新建会话或选择历史对话，开始规划你的旅程</p>
            <div class="empty-actions">
              <button class="btn-new btn-new--large" @click="newSession">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>新建会话</span>
              </button>
            </div>
          </div>

          <template v-else>
            <header class="chat-header">
              <span class="chat-title">{{ sessions.find(s => s.sessionId === activeSessionId)?.title }}</span>
            </header>

            <div class="chat-messages" ref="chatContainer">
              <div v-if="!loading && messages.length === 0" class="chat-start-hint">
                <img src="/Bot.png" alt="AI" class="hint-bot" />
                <p>告诉我你的旅行需求，AI 会帮你规划</p>
              </div>

              <div v-for="(msg, i) in messages" :key="i" class="msg-row" :class="'msg--' + msg.role">
                <div v-if="msg.role === 'tool'" class="msg-tool">
                  <svg class="tool-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <b>{{ msg.toolName || 'tool' }}</b>
                  <span>{{ msg.text }}</span>
                </div>

                <template v-else>
                  <div class="msg-avatar">
                    <img v-if="msg.role === 'user'" :src="userAvatar" alt="用户" @error="e => e.target.src = '/Akari.jpg'" />
                    <img v-else src="/Bot.png" alt="AI" />
                  </div>
                  <div class="msg-body">
                    <span class="msg-sender">{{ msg.role === 'user' ? '我' : 'AI 规划师' }}</span>
                    <div v-if="msg.role === 'ai'" class="msg-bubble markdown-body" v-html="renderMarkdown(msg.text)"></div>
                    <div v-else class="msg-bubble">{{ msg.text }}</div>
                  </div>
                </template>
              </div>

              <div v-if="loading" class="msg-row msg--ai">
                <div class="msg-avatar">
                  <img src="/Bot.png" alt="AI" />
                </div>
                <div class="msg-body">
                  <span class="msg-sender">AI 规划师</span>
                  <div class="msg-bubble msg-thinking">
                    <span class="spinner"></span>
                    <span>{{ loadingText }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="chat-footer">
              <textarea
                v-model="messageInput"
                class="chat-input"
                placeholder="输入旅行需求"
                rows="2"
                @keydown="handleKeydown"
                :disabled="loading"
              />
              <button class="btn-send" @click="sendMessage" :disabled="!messageInput.trim() || loading" aria-label="发送">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                </svg>
              </button>
            </div>
          </template>
        </section>

        <!-- ===== 路线图 / 行程详情 ===== -->
          <aside v-show="hasPlan && activeSessionId && !mapCollapsed" class="map-panel">
            <header class="map-header">
              <div class="map-tabs">
                <button class="map-tab" :class="{ active: planTab === 'map' }" @click="planTab = 'map'; nextTick(resizeMap)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                  <span>路线图</span>
                </button>
                <button class="map-tab" :class="{ active: planTab === 'itinerary' }" @click="planTab = 'itinerary'">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  <span>行程详情</span>
                </button>
              </div>
              <button class="btn-toggle-map" @click="mapCollapsed = !mapCollapsed" aria-label="切换路线图">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
            </header>
            <div class="map-body">
              <div v-show="planTab === 'map'" id="amap-container" class="map-real"></div>
              <div v-if="!mapReady && planTab === 'map'" class="map-loading">
                <span class="spinner"></span>
                <span>地图加载中…</span>
              </div>

              <div v-if="planTab === 'itinerary'" class="itinerary-panel">
                <div v-for="day in (currentPlan?.itinerary || [])" :key="day.day" class="itinerary-day">
                  <div class="itinerary-day-header">
                    <span class="itinerary-day-badge">第 {{ day.day }} 天</span>
                    <span v-if="day.weather" class="itinerary-day-weather">{{ day.weather }}</span>
                  </div>
                  <div class="itinerary-spots">
                    <div v-for="(sp, si) in (day.spots || [])" :key="si" class="itinerary-spot">
                      <div class="itinerary-spot-dot" :class="'dot-' + (sp.timeSlot === '上午' ? 'morning' : sp.timeSlot === '下午' ? 'afternoon' : 'evening')"></div>
                      <div class="itinerary-spot-body">
                        <div class="itinerary-spot-header">
                          <span class="itinerary-spot-name">{{ sp.name }}</span>
                          <span v-if="sp.timeSlot" class="itinerary-spot-time">{{ sp.timeSlot }}</span>
                        </div>
                        <div class="itinerary-spot-meta">
                          <span v-if="sp.duration" class="itinerary-spot-tag">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {{ sp.duration }}
                          </span>
                          <span v-if="sp.transport" class="itinerary-spot-tag">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            {{ sp.transport }}
                          </span>
                        </div>
                        <p v-if="sp.note" class="itinerary-spot-note">{{ sp.note }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!currentPlan?.itinerary?.length" class="itinerary-empty">暂无行程数据</div>
              </div>
            </div>
          </aside>

        <!-- 路线图展开按钮（折叠在右侧时显示） -->
        <button v-if="hasPlan && mapCollapsed && activeSessionId" class="btn-show-map" @click="mapCollapsed = false; planTab = 'map'; nextTick(resizeMap)" aria-label="展开路线图">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.trip-root { min-height: 100vh; background: var(--color-background); }
.trip-body { display: flex; margin-left: var(--sidebar-collapsed); margin-top: 76px; height: calc(100vh - 76px); overflow: hidden; }

/* 会话面板 */
.session-panel { width: 260px; flex-shrink: 0; border-right: 1px solid var(--color-border); background: var(--color-surface); display: flex; flex-direction: column; padding: 20px 12px; gap: 8px; overflow-y: auto; transition: width .25s ease, padding .25s ease; }
.session-panel.collapsed { width: 48px; padding: 20px 4px; overflow: hidden; }
.btn-toggle-sidebar { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 36px; border: none; background: transparent; color: var(--color-text-tertiary); cursor: pointer; border-radius: 8px; transition: background .15s, color .15s; flex-shrink: 0; }
.btn-toggle-sidebar:hover { background: var(--color-background); color: var(--color-text); }
.session-panel.collapsed .btn-toggle-sidebar { width: 36px; margin: 0 auto; }
/* 侧边栏展开时箭头在右侧、折叠时箭头在中间 */
.session-panel:not(.collapsed) .btn-toggle-sidebar { justify-content: flex-end; padding-right: 4px; }
.btn-new { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; padding: 0 16px; border: 1.5px dashed var(--color-border); border-radius: 12px; background: transparent; color: var(--color-primary); font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: border-color .2s, background .2s; }
.btn-new:hover { border-color: var(--color-primary); background: rgba(22,163,74,.04); }
.btn-new:active { transform: scale(.98); }
.btn-new:disabled { opacity: .5; cursor: not-allowed; }
.session-list { display: flex; flex-direction: column; gap: 2px; }
.session-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 56px; padding: 10px 12px; border: 1px solid transparent; border-radius: 10px; background: transparent; text-align: left; font-family: inherit; cursor: pointer; transition: background .15s, border-color .15s; outline: none; }
.session-item:focus-visible { border-color: var(--color-primary); }
.session-item:hover { background: var(--color-background); }
.session-item.active { background: var(--color-background); border-color: var(--color-primary); }
.session-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--color-background); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-text-tertiary); }
.session-item.active .session-icon { color: var(--color-primary); }
.session-info { flex: 1; min-width: 0; }
.session-title { font-size: 14px; font-weight: 500; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-meta { font-size: 12px; color: var(--color-text-tertiary); margin-top: 2px; }

.btn-delete-session {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: transparent; color: var(--color-text-tertiary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; opacity: 0; transition: opacity .15s, color .15s, background .15s;
}
.session-item:hover .btn-delete-session { opacity: 1; }
.btn-delete-session:hover { color: #dc2626; background: #fef2f2; }

/* 主区域 */
.main-area { flex: 1; display: flex; overflow: hidden; position: relative; }
.chat-panel { flex: 1; display: flex; flex-direction: column; min-width: 0; transition: flex .3s cubic-bezier(.4,0,.2,1); }
.chat-panel.chat-shrink { flex: .55; border-right: 1px solid var(--color-border); }

/* 空状态 */
.chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 40px 20px; }
.empty-illustration { margin-bottom: 8px; }
.empty-bot { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
.empty-title { font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0; }
.empty-desc { font-size: 14px; color: var(--color-text-secondary); margin: 0; }
.empty-actions { margin-top: 8px; }
.btn-new--large { min-height: 48px; padding: 0 24px; font-size: 15px; }

/* 聊天头 */
.chat-header { display: flex; align-items: center; padding: 0 20px; min-height: 52px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); flex-shrink: 0; }
.chat-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 消息区 */
.chat-messages { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 20px; background: linear-gradient(180deg, #fafdf7 0%, #f7faf5 100%); }
.chat-start-hint { text-align: center; margin-top: 48px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.hint-bot { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; opacity: .6; }

.msg-thinking { display: flex; align-items: center; gap: 10px; color: var(--color-text-tertiary); font-size: 14px; background: #fff; border: 1px solid var(--color-border); border-radius: 16px 16px 16px 4px; padding: 12px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.spinner { width: 20px; height: 20px; border: 2px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.msg-row { display: flex; gap: 10px; }
.msg--user { flex-direction: row-reverse; }
.msg--ai { flex-direction: row; }
.msg-tool { display: flex; align-items: flex-start; gap: 8px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 13px; color: #1e40af; max-width: 100%; }
.tool-icon { flex-shrink: 0; margin-top: 1px; opacity: .7; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: #e5e7eb; }
.msg-avatar img { width: 100%; height: 100%; object-fit: cover; }
.msg-body { max-width: 75%; display: flex; flex-direction: column; gap: 4px; }
.msg--user .msg-body { align-items: flex-end; }
.msg--ai .msg-body { align-items: flex-start; }
.msg-sender { font-size: 12px; color: var(--color-text-tertiary); padding: 0 4px; }
.msg-bubble { padding: 10px 16px; border-radius: 16px; font-size: 14px; line-height: 1.65; word-break: break-word; }
.msg--user .msg-bubble { background: var(--color-primary); color: #fff; border-radius: 16px 16px 4px 16px; }
.msg--ai .msg-bubble { background: #fff; border: 1px solid var(--color-border); border-radius: 16px 16px 16px 4px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }

/* 输入区 */
.chat-footer { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--color-border); background: var(--color-surface); align-items: flex-end; }
.chat-input { flex: 1; border: 1px solid var(--color-border); border-radius: 16px; padding: 12px 16px; font-size: 14px; font-family: inherit; resize: none; outline: none; background: var(--color-background); min-height: 44px; transition: border-color .2s, box-shadow .2s; }
.chat-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(22,163,74,.1); }
.chat-input:disabled { opacity: .5; }
.btn-send { width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--color-primary); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity .2s, transform .1s; }
.btn-send:disabled { opacity: .35; cursor: not-allowed; }
.btn-send:not(:disabled):active { transform: scale(.92); }

/* 地图 */
.map-panel { flex: .45; display: flex; flex-direction: column; background: var(--color-surface); min-width: 0; }
.map-header { display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 20px; min-height: 52px; border-bottom: 1px solid var(--color-border); }
.btn-toggle-map { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; color: var(--color-text-tertiary); border-radius: 6px; cursor: pointer; transition: background .15s, color .15s; flex-shrink: 0; }
.btn-toggle-map:hover { background: var(--color-background); color: var(--color-text); }
/* 路线图展开按钮（折叠在右侧时，贴在聊天区右边缘） */
.btn-show-map { position: absolute; top: 50%; right: 0; z-index: 10; width: 28px; height: 64px; transform: translateY(-50%); border: none; background: var(--color-surface); color: var(--color-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px 0 0 8px; border: 1px solid var(--color-border); border-right: none; transition: color .15s, background .15s, box-shadow .15s; box-shadow: -2px 0 8px rgba(0,0,0,.06); }
.btn-show-map:hover { background: var(--color-background); color: var(--color-primary); box-shadow: -2px 0 12px rgba(0,0,0,.1); }
.map-tabs { display: flex; gap: 4px; }
.map-tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; background: transparent; color: var(--color-text-tertiary); font-size: 13px; font-weight: 500; font-family: inherit; border-radius: 8px; cursor: pointer; transition: background .15s, color .15s; }
.map-tab:hover { background: var(--color-background); color: var(--color-text); }
.map-tab.active { background: var(--color-background); color: var(--color-primary); }
.map-body { flex: 1; position: relative; overflow: hidden; }
.map-real { position: absolute; inset: 0; }
.map-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--color-text-tertiary); font-size: 14px; background: var(--color-surface); z-index: 2; }

/* 行程详情面板 */
.itinerary-panel { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.itinerary-day { background: var(--color-background); border-radius: 12px; border: 1px solid var(--color-border); overflow: hidden; }
.itinerary-day-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.itinerary-day-badge { font-size: 14px; font-weight: 600; color: var(--color-primary); }
.itinerary-day-weather { font-size: 13px; color: var(--color-text-secondary); }
.itinerary-spots { padding: 12px 16px; display: flex; flex-direction: column; gap: 0; position: relative; }
.itinerary-spot { display: flex; gap: 12px; padding: 8px 0; position: relative; }
.itinerary-spot + .itinerary-spot::before { content: ''; position: absolute; left: 7px; top: -4px; bottom: 50%; width: 2px; background: var(--color-border); }
.itinerary-spot-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; border: 3px solid; background: #fff; }
.dot-morning { border-color: #f59e0b; }
.dot-afternoon { border-color: #3b82f6; }
.dot-evening { border-color: #8b5cf6; }
.itinerary-spot-body { flex: 1; min-width: 0; }
.itinerary-spot-header { display: flex; align-items: baseline; gap: 8px; }
.itinerary-spot-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
.itinerary-spot-time { font-size: 12px; color: var(--color-text-tertiary); flex-shrink: 0; }
.itinerary-spot-meta { display: flex; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
.itinerary-spot-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--color-text-secondary); background: var(--color-surface); padding: 2px 8px; border-radius: 6px; }
.itinerary-spot-note { font-size: 13px; color: var(--color-text-secondary); margin: 4px 0 0; line-height: 1.5; }
.itinerary-empty { text-align: center; padding: 40px 20px; color: var(--color-text-tertiary); font-size: 14px; }

.map-slide-enter-active { transition: all .3s cubic-bezier(.4,0,.2,1); }
.map-slide-leave-active { transition: all .2s cubic-bezier(.4,0,1,1); }
.map-slide-enter-from { opacity: 0; transform: translateX(30px); }
.map-slide-leave-to { opacity: 0; transform: translateX(30px); }

/* ===== Markdown 渲染 ===== */
.markdown-body :deep(h1) { font-size: 1.5em; font-weight: 700; margin: 14px 0 8px; }
.markdown-body :deep(h2) { font-size: 1.3em; font-weight: 600; margin: 12px 0 6px; }
.markdown-body :deep(h3) { font-size: 1.1em; font-weight: 600; margin: 10px 0 4px; }
.markdown-body :deep(p) { margin-bottom: 8px; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 20px; margin-bottom: 8px; }
.markdown-body :deep(li) { margin-bottom: 2px; }
.markdown-body :deep(strong) { font-weight: 600; }
.markdown-body :deep(blockquote) { border-left: 3px solid var(--color-primary); padding-left: 12px; color: var(--color-text-secondary); margin: 8px 0; }
.markdown-body :deep(code) { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.markdown-body :deep(pre) { background: #1E293B; color: #E2E8F0; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 8px 0; }
.markdown-body :deep(pre code) { background: none; padding: 0; color: inherit; }
.markdown-body :deep(a) { color: var(--color-primary); }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--color-border); margin: 12px 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 0.9em; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid var(--color-border); padding: 6px 10px; text-align: left; }
.markdown-body :deep(th) { background: #f8fafc; font-weight: 600; }

@media (max-width: 768px) {
  .trip-body { margin-left: 48px; margin-top: 64px; }
  .session-panel { position: fixed; left: 48px; top: 64px; bottom: 0; z-index: 50; width: 220px; transform: translateX(-100%); transition: transform .25s ease; }
  .chat-panel.chat-shrink { flex: 1; }
  .map-panel { position: fixed; inset: 0; z-index: 60; margin-left: 48px; margin-top: 64px; }
  .msg-body { max-width: 90%; }
}
</style>
