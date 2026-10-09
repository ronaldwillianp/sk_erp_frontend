<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">
            Bienvenido de vuelta, {{ authStore.user?.first_name || authStore.user?.username }} 👋
          </p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary">
            <v-icon size="18" class="mr-2">mdi-download-outline</v-icon>
            Exportar
          </button>
          <button class="btn-primary">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nueva venta
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <div v-for="stat in stats" :key="stat.title" class="stat-card">
        <div class="flex items-start justify-between mb-4">
          <div :class="['stat-icon', stat.iconClass]">
            <v-icon :color="stat.iconColor" size="22">{{ stat.icon }}</v-icon>
          </div>
          <span :class="['badge', stat.trend > 0 ? 'badge-success' : 'badge-error']">
            <v-icon size="12" class="mr-0.5">{{ stat.trend > 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
            {{ Math.abs(stat.trend) }}%
          </span>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.title }}</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
      
      <!-- Chart Card -->
      <div class="lg:col-span-2 content-card">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="card-title">Resumen de ventas</h3>
            <p class="card-description">Últimos 7 días</p>
          </div>
          <div class="period-toggle">
            <button 
              v-for="p in periods" 
              :key="p.value"
              :class="['period-btn', period === p.value ? 'period-active' : '']"
              @click="period = p.value"
            >
              {{ p.label }}
            </button>
          </div>
        </div>
        
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div v-for="(bar, i) in chartBars" :key="i" class="chart-bar-container">
              <div 
                class="chart-bar" 
                :style="{ height: bar.height + '%' }"
                :class="{ 'chart-bar-highlight': bar.highlight }"
              ></div>
              <span class="chart-label">{{ bar.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Products -->
      <div class="content-card">
        <div class="flex items-center justify-between mb-6">
          <h3 class="card-title">Top productos</h3>
          <button class="icon-btn">
            <v-icon size="18">mdi-dots-vertical</v-icon>
          </button>
        </div>
        
        <div class="space-y-4">
          <div v-for="(product, index) in topProducts" :key="product.name" class="product-row">
            <div :class="['rank-badge', product.rankClass]">{{ index + 1 }}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-zinc-200 truncate">{{ product.name }}</div>
              <div class="text-[11px] text-zinc-500">{{ product.sold }} vendidos</div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-zinc-200">{{ product.revenue }}</div>
              <div class="text-[11px] text-zinc-500">{{ product.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="content-card-flush">
      <div class="card-header">
        <div>
          <h3 class="card-title">Transacciones recientes</h3>
          <p class="card-description">Últimas 5 transacciones del sistema</p>
        </div>
        <a href="#" class="link-accent text-[13px] inline-flex items-center">
          Ver todas
          <v-icon size="14" class="ml-1">mdi-arrow-right</v-icon>
        </a>
      </div>
      
      <div class="overflow-x-auto">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td>
                <div class="flex items-center gap-3">
                  <div :class="['table-avatar', tx.avatarClass]">{{ tx.initials }}</div>
                  <div>
                    <div class="text-sm font-medium text-zinc-200">{{ tx.customer }}</div>
                    <div class="text-[11px] text-zinc-500">{{ tx.email }}</div>
                  </div>
                </div>
              </td>
              <td class="text-sm text-zinc-400">{{ tx.product }}</td>
              <td class="text-sm font-semibold text-zinc-200">{{ tx.amount }}</td>
              <td>
                <span :class="['badge', tx.statusClass]">{{ tx.status }}</span>
              </td>
              <td class="text-sm text-zinc-500">{{ tx.date }}</td>
              <td>
                <button class="icon-btn">
                  <v-icon size="16">mdi-dots-vertical</v-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const period = ref('week');

const periods = [
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
  { label: 'Año', value: 'year' },
];

const stats = [
  { title: 'Ventas totales', value: '$24,580', icon: 'mdi-currency-usd', iconClass: 'icon-indigo', iconColor: '#818cf8', trend: 12.5 },
  { title: 'Nuevos clientes', value: '142', icon: 'mdi-account-plus', iconClass: 'icon-emerald', iconColor: '#34d399', trend: 8.2 },
  { title: 'Pedidos', value: '1,280', icon: 'mdi-cart-outline', iconClass: 'icon-amber', iconColor: '#fbbf24', trend: -3.1 },
  { title: 'Gastos', value: '$8,450', icon: 'mdi-wallet-outline', iconClass: 'icon-rose', iconColor: '#fb7185', trend: 5.7 },
];

const chartBars = [
  { label: 'Lun', height: 45, highlight: false },
  { label: 'Mar', height: 62, highlight: false },
  { label: 'Mié', height: 38, highlight: false },
  { label: 'Jue', height: 78, highlight: true },
  { label: 'Vie', height: 55, highlight: false },
  { label: 'Sáb', height: 85, highlight: true },
  { label: 'Dom', height: 42, highlight: false },
];

const topProducts = [
  { name: 'Producto Premium', sold: 145, revenue: '$4,850', percentage: 32, rankClass: 'rank-1' },
  { name: 'Producto Estándar', sold: 98, revenue: '$2,940', percentage: 24, rankClass: 'rank-2' },
  { name: 'Producto Básico', sold: 76, revenue: '$1,520', percentage: 18, rankClass: 'rank-3' },
  { name: 'Servicio Plus', sold: 54, revenue: '$3,240', percentage: 15, rankClass: 'rank-other' },
  { name: 'Servicio Básico', sold: 41, revenue: '$820', percentage: 11, rankClass: 'rank-other' },
];

const transactions = [
  { id: 1, customer: 'María González', email: 'maria@email.com', product: 'Producto Premium', amount: '$245.00', status: 'Completado', statusClass: 'badge-success', date: 'Hace 2h', avatarClass: 'av-indigo', initials: 'MG' },
  { id: 2, customer: 'Carlos Rodríguez', email: 'carlos@email.com', product: 'Servicio Plus', amount: '$180.00', status: 'Pendiente', statusClass: 'badge-warning', date: 'Hace 5h', avatarClass: 'av-purple', initials: 'CR' },
  { id: 3, customer: 'Ana Martínez', email: 'ana@email.com', product: 'Producto Estándar', amount: '$95.00', status: 'Completado', statusClass: 'badge-success', date: 'Hace 1d', avatarClass: 'av-pink', initials: 'AM' },
  { id: 4, customer: 'Luis Pérez', email: 'luis@email.com', product: 'Producto Básico', amount: '$45.00', status: 'Cancelado', statusClass: 'badge-error', date: 'Hace 2d', avatarClass: 'av-blue', initials: 'LP' },
  { id: 5, customer: 'Sofía López', email: 'sofia@email.com', product: 'Servicio Básico', amount: '$60.00', status: 'Completado', statusClass: 'badge-success', date: 'Hace 3d', avatarClass: 'av-teal', initials: 'SL' },
];
</script>

<style scoped>
/* Solo estilos específicos del Dashboard */
.icon-indigo { background: rgba(99, 102, 241, 0.12); }
.icon-emerald { background: rgba(16, 185, 129, 0.12); }
.icon-amber { background: rgba(245, 158, 11, 0.12); }
.icon-rose { background: rgba(244, 63, 94, 0.12); }

.period-toggle {
  display: flex;
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 3px;
  border: 1px solid var(--border-subtle);
}

.period-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-btn:hover { color: var(--text-secondary); }
.period-active {
  background: var(--accent-soft);
  color: var(--accent-light);
}

.chart-placeholder {
  height: 240px;
  display: flex;
  align-items: flex-end;
  padding-top: 20px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 8px;
}

.chart-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.chart-bar {
  width: 100%;
  max-width: 40px;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 6px 6px 2px 2px;
  transition: all 0.5s ease;
  min-height: 4px;
}

.chart-bar-highlight {
  background: linear-gradient(to top, var(--accent-start), var(--accent-end));
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.3);
}

.chart-label {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-faint);
}

.product-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.product-row:last-child { border-bottom: none; }

.rank-badge {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}

.rank-1 { background: linear-gradient(135deg, var(--accent-start), var(--accent-end)); color: white; }
.rank-2 { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.rank-3 { background: rgba(236, 72, 153, 0.15); color: #f9a8d4; }
.rank-other { background: var(--bg-elevated); color: var(--text-dim); }

.av-indigo { background: linear-gradient(135deg, #6366f1, #818cf8); }
.av-purple { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.av-pink { background: linear-gradient(135deg, #ec4899, #f472b6); }
.av-blue { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.av-teal { background: linear-gradient(135deg, #14b8a6, #2dd4bf); }
</style>