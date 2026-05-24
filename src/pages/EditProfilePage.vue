<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import api from '@/api'

const router = useRouter()
const { user, fetchUser } = useAuth()

const allTags = ref([])
const avatarPreview = ref('')
const uploading = ref(false)
const form = ref({
  avatar: '',
  bio: '',
  budgetLevel: 'middle',
  preferredTags: [],
})
const saving = ref(false)
const message = ref('')

// ===== Crop state =====
const cropVisible = ref(false)
const cropSrc = ref('')
const cropScale = ref(1)
const cropX = ref(0)
const cropY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const dragImgStart = ref({ x: 0, y: 0 })
const cropMinScale = ref(0.05)
const cropMaxScale = ref(5)
const imgW = ref(0)
const imgH = ref(0)
const SIZE = 300

onMounted(async () => {
  await fetchUser()
  if (user.value) {
    form.value.avatar = user.value.avatar || ''
    avatarPreview.value = user.value.avatar || ''
    form.value.bio = user.value.bio || ''
    form.value.budgetLevel = user.value.budgetLevel || 'middle'
    form.value.preferredTags = user.value.preferredTags || []
  }
  try {
    const tags = await api.get('/tag/hot?limit=50')
    allTags.value = tags || []
  } catch { /* ignore */ }
})

function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    message.value = '图片不能超过5MB'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const minS = SIZE / Math.min(img.width, img.height)
      cropMinScale.value = minS
      cropMaxScale.value = minS * 4
      imgW.value = img.width
      imgH.value = img.height
      cropSrc.value = reader.result
      cropScale.value = minS
      cropX.value = 0
      cropY.value = 0
      cropVisible.value = true
      e.target.value = ''
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function clampPosition(s) {
  const scale = s ?? cropScale.value
  const scaledW = imgW.value * scale
  const scaledH = imgH.value * scale
  const maxX = 0
  const minX = SIZE - scaledW
  const maxY = 0
  const minY = SIZE - scaledH
  cropX.value = Math.min(maxX, Math.max(minX, cropX.value))
  cropY.value = Math.min(maxY, Math.max(minY, cropY.value))
}

function onWheel(e) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  const newScale = Math.min(cropMaxScale.value, Math.max(cropMinScale.value, cropScale.value + delta))
  if (newScale !== cropScale.value) {
    cropScale.value = newScale
    clampPosition(newScale)
  }
}

function startDrag(e) {
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  dragImgStart.value = { x: cropX.value, y: cropY.value }
  e.preventDefault()
}

function onDrag(e) {
  if (!dragging.value) return
  cropX.value = dragImgStart.value.x + (e.clientX - dragStart.value.x)
  cropY.value = dragImgStart.value.y + (e.clientY - dragStart.value.y)
  clampPosition()
}

function stopDrag() {
  dragging.value = false
}

async function confirmCrop() {
  const img = new Image()
  img.src = cropSrc.value
  await new Promise(r => { img.onload = r })

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  const scaled = img.width * cropScale.value
  const offsetX = -cropX.value
  const offsetY = -cropY.value
  const cropSize = SIZE / cropScale.value

  ctx.drawImage(img, offsetX / cropScale.value, offsetY / cropScale.value, cropSize, cropSize, 0, 0, SIZE, SIZE)

  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85))
  uploading.value = true
  cropVisible.value = false
  try {
    const path = await api.upload(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    form.value.avatar = path
    avatarPreview.value = path + '?t=' + Date.now()
  } catch {
    message.value = '头像上传失败'
  } finally {
    uploading.value = false
  }
}

function cancelCrop() {
  cropVisible.value = false
  cropSrc.value = ''
}

function toggleTag(tagId) {
  const idx = form.value.preferredTags.indexOf(tagId)
  if (idx >= 0) {
    form.value.preferredTags.splice(idx, 1)
  } else {
    form.value.preferredTags.push(tagId)
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    await api.put('/user/profile', {
      avatar: form.value.avatar || null,
      bio: form.value.bio || null,
      budgetLevel: form.value.budgetLevel,
      preferredTags: form.value.preferredTags,
    })
    message.value = '保存成功'
    await fetchUser()
    setTimeout(() => router.push('/profile'), 800)
  } catch {
    message.value = '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

const budgetOptions = [
  { value: 'low', label: '穷游' },
  { value: 'middle', label: '舒适' },
  { value: 'high', label: '高端' },
]
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <main class="edit-page">
    <div class="edit-card">
      <h1 class="edit-title">编辑个人资料</h1>

      <div class="edit-field">
        <label class="edit-label">头像</label>
        <div class="edit-avatar-row">
          <div class="edit-avatar-preview">
            <img :src="avatarPreview || '/Akari.jpg'" alt="头像预览" @error="e => e.target.src = '/Akari.jpg'" />
          </div>
          <label class="edit-avatar-upload">
            {{ uploading ? '上传中...' : '选择图片' }}
            <input type="file" accept="image/*" hidden @change="onAvatarChange" :disabled="uploading" />
          </label>
        </div>
        <p class="edit-hint">支持 JPG、PNG，最大 5MB，裁剪后自动压缩</p>
      </div>

      <div class="edit-field">
        <label class="edit-label">个人简介</label>
        <textarea v-model="form.bio" class="edit-textarea" placeholder="介绍一下自己..." maxlength="200" rows="3"></textarea>
        <span class="edit-hint">{{ form.bio.length }}/200</span>
      </div>

      <div class="edit-field">
        <label class="edit-label">预算偏好</label>
        <div class="edit-budget-group">
          <button
            v-for="opt in budgetOptions"
            :key="opt.value"
            type="button"
            class="edit-budget-btn"
            :class="{ 'edit-budget-btn--active': form.budgetLevel === opt.value }"
            @click="form.budgetLevel = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="edit-field">
        <label class="edit-label">偏好标签</label>
        <div v-if="allTags.length > 0" class="edit-tags">
          <button
            v-for="tag in allTags"
            :key="tag.tagId"
            type="button"
            class="edit-tag"
            :class="{ 'edit-tag--active': form.preferredTags.includes(tag.tagId) }"
            @click="toggleTag(tag.tagId)"
          >{{ tag.name }}</button>
        </div>
        <p v-else class="edit-hint">加载标签中...</p>
      </div>

      <div class="edit-actions">
        <button class="edit-save-btn" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <button class="edit-cancel-btn" @click="router.push('/profile')">取消</button>
      </div>

      <p v-if="message" class="edit-message" :class="{ 'edit-message--error': message !== '保存成功' }">
        {{ message }}
      </p>
    </div>

    <!-- Crop dialog -->
    <Teleport to="body">
      <div v-if="cropVisible" class="crop-overlay" @mousedown="cancelCrop">
        <div class="crop-dialog" @mousedown.stop>
          <h3 class="crop-title">裁剪头像</h3>

          <div class="crop-area"
            @mousedown="startDrag"
            @mousemove="onDrag"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
            @wheel="onWheel"
          >
            <div class="crop-frame">
              <div class="crop-grid"></div>
            </div>
            <img
              :src="cropSrc"
              class="crop-img"
              :style="{
                transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                transformOrigin: 'top left'
              }"
              draggable="false"
            />
          </div>

          <p class="crop-hint">滚轮缩放 · 拖拽移动</p>

          <div class="crop-actions">
            <button class="crop-btn crop-btn--cancel" @click="cancelCrop">取消</button>
            <button class="crop-btn crop-btn--confirm" @click="confirmCrop">确认裁剪</button>
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.edit-page {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow-y: auto;
  padding: 24px 32px 80px;
}

.edit-card {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px;
  background: var(--color-surface);
  border-radius: 16px;
}

.edit-title {
  font-family: var(--font-heading);
  font-size: 22px;
  color: var(--color-foreground);
  margin-bottom: 28px;
}

.edit-field {
  margin-bottom: 22px;
}

.edit-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 10px;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.edit-input:focus,
.edit-textarea:focus {
  border-color: var(--color-primary);
}

.edit-textarea {
  resize: vertical;
  min-height: 72px;
}

.edit-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
  display: block;
}

.edit-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.edit-avatar-preview svg {
  width: 44px;
  height: 44px;
}

.edit-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-avatar-upload {
  padding: 8px 20px;
  border-radius: 18px;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-avatar-upload:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Budget */
.edit-budget-group {
  display: flex;
  gap: 8px;
}

.edit-budget-btn {
  padding: 8px 20px;
  border-radius: 20px;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-family: var(--font-body);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-budget-btn:hover {
  border-color: var(--color-primary);
}

.edit-budget-btn--active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* Tags */
.edit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-tag {
  padding: 6px 14px;
  border-radius: 16px;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-tag:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.edit-tag--active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* Actions */
.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
}

.edit-save-btn {
  padding: 10px 28px;
  border-radius: 22px;
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-save-btn:hover:not(:disabled) {
  background: var(--color-foreground);
}

.edit-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-cancel-btn {
  padding: 10px 22px;
  border-radius: 22px;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.edit-cancel-btn:hover {
  background: var(--color-muted);
}

.edit-message {
  margin-top: 16px;
  font-size: 14px;
  color: var(--color-primary);
  text-align: center;
}

.edit-message--error {
  color: var(--color-error, #dc2626);
}

/* ===== Crop dialog ===== */
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-dialog {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  width: 420px;
  max-width: 95vw;
}

.crop-title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
  margin-bottom: 16px;
  text-align: center;
}

.crop-area {
  width: 300px;
  height: 300px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  background: #1a1a1a;
  cursor: grab;
}

.crop-area:active {
  cursor: grabbing;
}

.crop-img {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 100px;
  user-select: none;
  -webkit-user-drag: none;
}

.crop-frame {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: 50%;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.crop-grid {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.crop-hint {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 12px;
}

.crop-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  justify-content: flex-end;
}

.crop-btn {
  padding: 8px 22px;
  border-radius: 18px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.crop-btn--cancel {
  background: var(--color-muted);
  color: var(--color-text);
}

.crop-btn--cancel:hover {
  background: var(--color-border);
}

.crop-btn--confirm {
  background: var(--color-primary);
  color: #fff;
}

.crop-btn--confirm:hover {
  background: var(--color-foreground);
}

@media (max-width: 768px) {
  .edit-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
    padding: 16px;
  }

  .edit-card {
    padding: 20px;
  }

  .crop-dialog {
    width: 95vw;
    padding: 16px;
  }

  .crop-area {
    width: 260px;
    height: 260px;
  }
}
</style>
