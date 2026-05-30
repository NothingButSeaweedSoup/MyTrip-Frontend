<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'
import SidebarNav from '@/components/SidebarNav.vue'
import DashboardTab from '@/pages/admin/DashboardTab.vue'
import UsersTab from '@/pages/admin/UsersTab.vue'
import SpotsTab from '@/pages/admin/SpotsTab.vue'
import TagsTab from '@/pages/admin/TagsTab.vue'
import ConfigTab from '@/pages/admin/ConfigTab.vue'
import AuditTab from '@/pages/admin/AuditTab.vue'
import SensitiveWordsTab from '@/pages/admin/SensitiveWordsTab.vue'
import ModelConfigTab from '@/pages/admin/ModelConfigTab.vue'

const router = useRouter()

const activeTab = ref('dashboard')

const tabs = [
  { id: 'dashboard', label: '总览', icon: 'dashboard' },
  { id: 'users', label: '用户管理', icon: 'users' },
  { id: 'spots', label: '景点管理', icon: 'spots' },
  { id: 'tags', label: '标签管理', icon: 'tags' },
  { id: 'config', label: 'AI配置', icon: 'config' },
  { id: 'sensitive', label: '敏感词', icon: 'sensitive' },
  { id: 'model-config', label: '模型配置', icon: 'model' },
  { id: 'audit', label: '审核记录', icon: 'audit' },
]

function switchTab(tabId) {
  activeTab.value = tabId
}
</script>

<template>
  <SearchBar :show-diff-toggle="false" />
  <SidebarNav />
  <div class="admin-page">
    <!-- Header -->
    <div class="admin-header">
      <button class="admin-header__back" @click="router.push('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        <span>返回</span>
      </button>
      <h1 class="admin-header__title">管理面板</h1>
    </div>

    <!-- Tab Bar -->
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="admin-tab"
        :class="{ 'admin-tab--active': activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="admin-content">
      <DashboardTab v-if="activeTab === 'dashboard'" @switch-tab="switchTab" />
      <UsersTab v-else-if="activeTab === 'users'" />
      <SpotsTab v-else-if="activeTab === 'spots'" />
      <TagsTab v-else-if="activeTab === 'tags'" />
      <ConfigTab v-else-if="activeTab === 'config'" />
      <SensitiveWordsTab v-else-if="activeTab === 'sensitive'" />
      <ModelConfigTab v-else-if="activeTab === 'model-config'" />
      <AuditTab v-else-if="activeTab === 'audit'" />
    </div>
  </div>
</template>

<!-- Shared admin styles (unscoped for child components) -->
<style>
/* ===== Buttons ===== */
.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
  white-space: nowrap;
}

.admin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-btn svg { width: 16px; height: 16px; }

.admin-btn--primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.admin-btn--primary:hover:not(:disabled) {
  background: #15803D;
  border-color: #15803D;
}

.admin-btn--outline {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border);
}

.admin-btn--outline:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-btn--destructive {
  background: var(--color-destructive);
  color: #fff;
  border-color: var(--color-destructive);
}

.admin-btn--destructive:hover:not(:disabled) {
  background: #B91C1C;
  border-color: #B91C1C;
}

.admin-btn--sm {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 8px;
}

.admin-btn--sm svg { width: 14px; height: 14px; }

/* ===== Error ===== */
.admin-error {
  margin-bottom: 16px;
  padding: 10px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--color-destructive);
  border-radius: 10px;
  font-size: 14px;
}

/* ===== Loading ===== */
.admin-loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 15px;
}

/* ===== Empty ===== */
.admin-empty {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}

/* ===== Table ===== */
.admin-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.admin-table th,
.admin-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
}

.admin-table th {
  background: var(--color-muted);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.admin-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-table tbody tr:hover {
  background: var(--color-surface-hover);
}

/* ===== Badges ===== */
.admin-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.admin-badge--role-0 {
  background: var(--color-muted);
  color: var(--color-text-secondary);
}

.admin-badge--role-1 {
  background: #DBEAFE;
  color: #1D4ED8;
}

.admin-badge--role-9 {
  background: #FEF3C7;
  color: #B45309;
}

.admin-badge--status-0 {
  background: #ECFDF5;
  color: #059669;
}

.admin-badge--status-1 {
  background: #FEF2F2;
  color: #DC2626;
}

.admin-badge--approve {
  background: #ECFDF5;
  color: #059669;
}

.admin-badge--reject {
  background: #FEF2F2;
  color: #DC2626;
}

.admin-badge--transfer {
  background: #FEF3C7;
  color: #B45309;
}

/* ===== Toolbar ===== */
.admin-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.admin-toolbar__search {
  flex: 1;
  min-width: 200px;
  max-width: 320px;
  padding: 8px 14px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  transition: border-color var(--transition-fast);
}

.admin-toolbar__search:focus {
  border-color: var(--color-primary);
}

.admin-toolbar__search::placeholder {
  color: var(--color-text-tertiary);
}

.admin-toolbar__spacer {
  flex: 1;
}

/* ===== Pagination ===== */
.admin-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.admin-pagination__btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.admin-pagination__btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.admin-pagination__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.admin-pagination__info {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

/* ===== Form ===== */
.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.admin-form-group--row {
  flex-direction: row;
  align-items: center;
}

.admin-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.admin-form-input,
.admin-form-select,
.admin-form-textarea {
  padding: 8px 12px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  transition: border-color var(--transition-fast);
}

.admin-form-input:focus,
.admin-form-select:focus,
.admin-form-textarea:focus {
  border-color: var(--color-primary);
}

.admin-form-textarea {
  resize: vertical;
  min-height: 80px;
}

.admin-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* ===== Select ===== */
.admin-select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--font-body);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}

.admin-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-muted);
}
</style>

<style scoped>
.admin-page {
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  margin-top: 76px;
  height: calc(100vh - 76px);
  overflow-y: auto;
  background: var(--color-background);
}

/* ===== Header ===== */
.admin-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin-header__back {
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

.admin-header__back:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.admin-header__back svg {
  width: 18px;
  height: 18px;
}

.admin-header__title {
  flex: 1;
  font-family: var(--font-heading);
  font-size: 20px;
  color: var(--color-foreground);
}

/* ===== Tabs ===== */
.admin-tabs {
  display: flex;
  gap: 0;
  padding: 0 24px;
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-border);
  position: sticky;
  top: 61px;
  z-index: 9;
  overflow-x: auto;
}

.admin-tab {
  padding: 14px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.admin-tab:hover {
  color: var(--color-text);
}

.admin-tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* ===== Content ===== */
.admin-content {
  padding: 24px;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .admin-page {
    margin-left: 48px;
    width: calc(100vw - 48px);
    margin-top: 64px;
    height: calc(100vh - 64px);
  }

  .admin-content {
    padding: 16px;
  }

  .admin-tabs {
    padding: 0 16px;
    top: 53px;
  }

  .admin-tab {
    padding: 10px 14px;
    font-size: 13px;
  }
}
</style>
