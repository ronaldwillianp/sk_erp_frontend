<template>
  <div class="table-pagination">
    <div class="text-xs text-zinc-500">
      Mostrando <span class="text-zinc-300 font-medium">{{ startItem }}</span>-<span class="text-zinc-300 font-medium">{{ endItem }}</span>
      de <span class="text-zinc-300 font-medium">{{ total }}</span>
    </div>

    <div class="flex items-center gap-1">
      <!-- Anterior -->
      <button class="pagination-btn" :disabled="page <= 1" @click="goTo(page - 1)" title="Anterior">
        <v-icon size="16">mdi-chevron-left</v-icon>
      </button>

      <!-- Números de página -->
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="text-zinc-600 px-1 text-sm">...</span>
        <button
          v-else
          :class="['pagination-btn', { 'pagination-btn-active': p === page }]"
          @click="goTo(p)"
        >
          {{ p }}
        </button>
      </template>

      <!-- Siguiente -->
      <button class="pagination-btn" :disabled="page >= totalPages" @click="goTo(page + 1)" title="Siguiente">
        <v-icon size="16">mdi-chevron-right</v-icon>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
});

const emit = defineEmits(['update:page']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const startItem = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1);
const endItem = computed(() => Math.min(props.page * props.pageSize, props.total));

const goTo = (p) => {
  if (p >= 1 && p <= totalPages.value && p !== props.page) {
    emit('update:page', p);
  }
};

// Genera la lista de páginas a mostrar (con "..." cuando hay muchas)
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = props.page;
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
});
</script>

<style scoped>
.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-default);
  color: var(--text-secondary);
}

.pagination-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pagination-btn-active {
  background: var(--accent-soft) !important;
  border-color: var(--accent-start) !important;
  color: var(--accent-light) !important;
  font-weight: 600;
}
</style>