<script setup>
import AdminModal from './AdminModal.vue'

defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '确认' },
  variant: { type: String, default: 'destructive' },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <AdminModal :visible="visible" :title="title" width="400px" @close="emit('cancel')">
    <p class="admin-confirm__message">{{ message }}</p>
    <template #footer>
      <button class="admin-btn admin-btn--outline" @click="emit('cancel')">取消</button>
      <button
        class="admin-btn"
        :class="variant === 'destructive' ? 'admin-btn--destructive' : 'admin-btn--primary'"
        @click="emit('confirm')"
      >{{ confirmLabel }}</button>
    </template>
  </AdminModal>
</template>

<style scoped>
.admin-confirm__message {
  font-size: 14px;
  color: var(--color-text);
  line-height: 1.6;
}
</style>
