<script setup>
import { ref, watch } from 'vue'
import SidebarNav from '@/components/SidebarNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import PostGrid from '@/components/PostGrid.vue'

const diffScrollEnabled = ref(localStorage.getItem('diffScroll') !== 'false')

watch(diffScrollEnabled, (val) => {
  localStorage.setItem('diffScroll', val ? 'true' : 'false')
})
</script>

<template>
  <SearchBar />
  <SidebarNav />
  <main class="main-content">
    <PostGrid :diff-scroll-enabled="diffScrollEnabled" />
  </main>
</template>

<style scoped>
.main-content {
  height: calc(100vh - 76px);
  margin-top: 76px;
  margin-left: var(--sidebar-collapsed);
  width: calc(100vw - var(--sidebar-collapsed));
  overflow: hidden;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .main-content {
    height: calc(100vh - 64px);
    margin-top: 64px;
    margin-left: 48px;
    width: calc(100vw - 48px);
  }
}
</style>
