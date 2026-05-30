<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '480px' },
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="admin-modal">
      <div v-if="visible" class="admin-modal-overlay" @click.self="emit('close')">
        <div class="admin-modal" :style="{ maxWidth: width }">
          <div class="admin-modal__header">
            <h2 class="admin-modal__title">{{ title }}</h2>
            <button class="admin-modal__close" @click="emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="admin-modal__body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="admin-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.admin-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
  padding: 24px;
}

.admin-modal {
  background: var(--color-surface);
  border-radius: 16px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.admin-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.admin-modal__title {
  font-family: var(--font-heading);
  font-size: 18px;
  color: var(--color-foreground);
}

.admin-modal__close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.admin-modal__close:hover {
  background: var(--color-muted);
  color: var(--color-text);
}

.admin-modal__close svg {
  width: 18px;
  height: 18px;
}

.admin-modal__body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.admin-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 24px 20px;
}

/* Transition */
.admin-modal-enter-active,
.admin-modal-leave-active {
  transition: opacity 0.2s ease;
}

.admin-modal-enter-active .admin-modal,
.admin-modal-leave-active .admin-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.admin-modal-enter-from,
.admin-modal-leave-to {
  opacity: 0;
}

.admin-modal-enter-from .admin-modal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.admin-modal-leave-to .admin-modal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
