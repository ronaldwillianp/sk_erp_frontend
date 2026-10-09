<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Alertas de stock mínimo</h1>
          <p class="page-subtitle">Productos que necesitan reabastecimiento</p>
        </div>
        <button class="btn-secondary" @click="loadAlerts">
          <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Resumen de alertas -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Alertas totales</div>
            <div class="stat-value">{{ summary.total_alerts }}</div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-alert-circle-outline</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card stat-card-critical">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Sin stock (crítico)</div>
            <div class="stat-value">{{ summary.critical_count }}</div>
          </div>
          <div class="stat-icon" style="background: var(--error-bg);">
            <v-icon size="22" class="text-red-400">mdi-alert-octagon</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card stat-card-warning">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Bajo mínimo</div>
            <div class="stat-value">{{ summary.warning_count }}</div>
          </div>
          <div class="stat-icon" style="background: var(--warning-bg);">
            <v-icon size="22" class="text-yellow-400">mdi-alert</v-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Filtro de severidad -->
    <div class="content-card !p-4 mb-5">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <div class="flex gap-3">
          <DarkSelect v-model="severityFilter" :options="severityOptions" @change="loadAlerts" />
        </div>
      </div>
    </div>

    <!-- Tabla de alertas -->
    <div class="content-card-flush">
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Verificando niveles de stock...</p>
      </div>

      <div v-else-if="!alerts.length" class="empty-state">
        <div class="empty-state-icon" style="background: var(--success-bg);">
          <v-icon size="32" class="text-green-400">mdi-check-circle-outline</v-icon>
        </div>
        <div class="empty-state-title" style="color: var(--success);">
          Todo en orden
        </div>
        <div class="empty-state-text">
          No hay productos por debajo del stock mínimo. ¡Excelente gestión de inventario!
        </div>
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Severidad</th>
                <th>Producto</th>
                <th class="text-right">Stock actual</th>
                <th class="text-right">Stock mínimo</th>
                <th class="text-right">Déficit</th>
                <th>Distribución por almacén</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="alert in alerts" :key="alert.product_id">
                <td>
                  <span :class="['badge', alert.severity === 'CRITICAL' ? 'badge-error' : 'badge-warning']">
                    <v-icon size="12" class="mr-1">
                      {{ alert.severity === 'CRITICAL' ? 'mdi-alert-octagon' : 'mdi-alert' }}
                    </v-icon>
                    {{ alert.severity === 'CRITICAL' ? 'Crítico' : 'Bajo mínimo' }}
                  </span>
                </td>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="table-avatar avatar-gradient">
                      <v-icon size="18" color="white">mdi-package-variant</v-icon>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-zinc-200">{{ alert.product_name }}</div>
                      <div class="text-xs text-zinc-500 font-mono">{{ alert.sku }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-right">
                  <span :class="['text-sm font-mono font-semibold', alert.severity === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400']">
                    {{ formatQuantity(alert.current_stock) }}
                  </span>
                </td>
                <td class="text-right text-sm font-mono text-zinc-400">
                  {{ formatQuantity(alert.min_stock) }}
                </td>
                <td class="text-right">
                  <span class="text-sm font-mono font-semibold text-red-400">
                    -{{ formatQuantity(alert.deficit) }}
                  </span>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(wh, idx) in alert.stock_by_warehouse"
                      :key="idx"
                      class="badge badge-neutral"
                    >
                      {{ wh.warehouse__code }}: {{ formatQuantity(wh.quantity) }} {{ wh.presentation__measure_unit__short_name }}
                    </span>
                    <span v-if="!alert.stock_by_warehouse.length" class="text-zinc-600 text-xs">
                      Sin stock en ningún almacén
                    </span>
                  </div>
                </td>
                <td class="text-right">
                  <button
                    class="btn-primary !px-3 !py-1.5 !text-xs"
                    @click="goToMovement(alert)"
                  >
                    <v-icon size="14" class="mr-1">mdi-package-down</v-icon>
                    Registrar entrada
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/utils/axios';
import DarkSelect from '@/components/DarkSelect.vue';

const router = useRouter();
const API_URL = 'inventory/stock/alerts/';

// ===== Estado =====
const loading = ref(false);
const alerts = ref([]);
const summary = ref(null);
const severityFilter = ref('');
const snackbar = ref({ show: false, message: '', color: 'success' });

// ===== Opciones de filtro =====
const severityOptions = [
  { value: '', label: 'Todas las alertas' },
  { value: 'CRITICAL', label: 'Solo críticos (sin stock)' },
  { value: 'WARNING', label: 'Solo bajo mínimo' },
];

// ===== Helpers =====
const formatQuantity = (qty) => {
  const num = parseFloat(qty);
  return isNaN(num) ? '0' : num.toLocaleString('es-CU', { maximumFractionDigits: 2 });
};

// ===== Cargar alertas =====
const loadAlerts = async () => {
  loading.value = true;
  try {
    let url = API_URL;
    if (severityFilter.value) {
      url += `?severity=${severityFilter.value}`;
    }
    const response = await api.get(url);
    summary.value = response.data.summary;
    alerts.value = response.data.alerts;
  } catch (error) {
    console.error('Error cargando alertas:', error);
    snackbar.value = { show: true, message: 'Error al cargar alertas', color: 'error' };
  } finally {
    loading.value = false;
  }
};

// ===== Navegar a movimientos con producto pre-llenado =====
const goToMovement = (alert) => {
  router.push({
    path: '/inventory/movements',
    query: {
      new_entry: 'true',
      product_id: alert.product_id,
      suggested_quantity: Math.ceil(alert.deficit),
    },
  });
};

onMounted(loadAlerts);
</script>

<style scoped>
.stat-card-critical {
  border-color: rgba(244, 63, 94, 0.3);
}

.stat-card-warning {
  border-color: rgba(245, 158, 11, 0.3);
}
</style>