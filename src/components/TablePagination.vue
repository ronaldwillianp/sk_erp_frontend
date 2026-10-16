<template>
  <div class="table-pagination">
    <!-- Izquierda: Información de registros -->
    <div class="text-xs text-zinc-500">
      Mostrando <span class="text-zinc-300 font-medium">{{ startItem }}</span>-<span class="text-zinc-300 font-medium">{{ endItem }}</span>
      de <span class="text-zinc-300 font-medium">{{ total }}</span>
    </div>

    <!-- Derecha: Controles -->
    <div class="flex items-center gap-4">
      
      <!-- Selector de Tamaño de Página -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-500 whitespace-nowrap hidden sm:inline">Por página:</span>
        <select 
          :value="pageSize" 
          @change="$emit('update:pageSize', Number($event.target.value))"
          class="page-size-select"
        >
          <option v-for="opt in pageSizeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Botones de Paginación (Solo si NO es "Todos") -->
      <div v-if="pageSize !== -1 && totalPages > 1" class="flex items-center gap-1">
        <!-- Anterior -->
        <button class="pagination-btn" :disabled="page <= 1" @click="goTo(page - 1)" title="Anterior">
          <v-icon size="16">mdi-chevron-left</v-icon>
        </button>

        <!-- Números de página -->
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="text-zinc-600 px-1 text-sm select-none">...</span>
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
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSize: { type: Number, default: 10 }, // Puede ser -1 para "Todos"
});

const emit = defineEmits(['update:page', 'update:pageSize']);

// Opciones para el selector
const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: 'Todos', value: -1 },
];

// Cálculos básicos
const totalPages = computed(() => {
  if (props.pageSize === -1) return 1;
  return Math.max(1, Math.ceil(props.total / props.pageSize));
});

const startItem = computed(() => {
  if (props.total === 0) return 0;
  if (props.pageSize === -1) return 1;
  return (props.page - 1) * props.pageSize + 1;
});

const endItem = computed(() => {
  if (props.pageSize === -1) return props.total;
  return Math.min(props.page * props.pageSize, props.total);
});

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

/* Estilo del selector */
.page-size-select {
  appearance: none;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 24px 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  
  /* Flechita custom SVG */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
}

.page-size-select:hover {
  border-color: var(--border-default);
  background-color: rgba(255, 255, 255, 0.06);
}

.page-size-select:focus {
  outline: none;
  border-color: var(--accent-start);
}

.page-size-select option {
  background-color: #18181b; /* Fondo oscuro para las opciones */
  color: #e4e4e7;
}

/* Botones de paginación existentes */
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