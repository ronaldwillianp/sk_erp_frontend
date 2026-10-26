<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Gestión de Caja</h1>
          <p class="page-subtitle">Administra las sesiones de caja del punto de venta</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openCashDialog = true" :disabled="hasOpenRegister">
            <v-icon size="18" class="mr-2">mdi-cash-register</v-icon>
            Abrir caja
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla de sesiones -->
    <div class="content-card-flush">
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando sesiones...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-cash-register</v-icon>
        </div>
        <div class="empty-state-title">Sin sesiones de caja</div>
        <div class="empty-state-text">
          Aún no hay sesiones de caja registradas. Abre una caja para comenzar.
        </div>
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Almacén</th>
                <th>Usuario</th>
                <th>Apertura</th>
                <th>Cierre</th>
                <th class="text-right">Saldo inicial</th>
                <th class="text-right">Ventas</th>
                <th class="text-right">Saldo esperado</th>
                <th class="text-right">Saldo contado</th>
                <th class="text-right">Diferencia</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>
                  <span :class="['badge', item.status === 'OPEN' ? 'badge-success' : 'badge-neutral']">
                    <v-icon size="12" class="mr-1">mdi-circle-medium</v-icon>
                    {{ item.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
                  </span>
                </td>
                <td class="text-sm text-zinc-200">{{ item.warehouse_name }}</td>
                <td class="text-sm text-zinc-400">{{ item.user_name }}</td>
                <td class="text-sm text-zinc-400 whitespace-nowrap">{{ formatDateTime(item.opening_date) }}</td>
                <td class="text-sm text-zinc-400 whitespace-nowrap">
                  {{ item.closing_date ? formatDateTime(item.closing_date) : '—' }}
                </td>
                <td class="text-right text-sm font-mono text-zinc-300">{{ formatPrice(item.opening_balance) }}</td>
                <td class="text-right text-sm font-mono text-zinc-300">{{ formatPrice(item.total_sales) }}</td>
                <td class="text-right text-sm font-mono text-zinc-300">{{ formatPrice(item.expected_balance) }}</td>
                <td class="text-right text-sm font-mono text-zinc-300">{{ formatPrice(item.closing_balance) }}</td>
                <td class="text-right">
                  <span v-if="item.difference !== null" :class="['font-mono', getDifferenceClass(item.difference)]">
                    {{ formatPrice(item.difference) }}
                  </span>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="item.status === 'OPEN'"
                      class="icon-btn !text-orange-400 hover:!bg-orange-500/10"
                      title="Cerrar caja"
                      @click="confirmClose(item)"
                    >
                      <v-icon size="16">mdi-lock</v-icon>
                    </button>
                    <button
                      v-if="item.status === 'CLOSED'"
                      class="icon-btn"
                      title="Ver reporte"
                      @click="viewReport(item)"
                    >
                      <v-icon size="16">mdi-file-chart-outline</v-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <TablePagination
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />
      </template>
    </div>

    <!-- Dialog: Abrir caja -->
    <v-dialog v-model="openCashDialog" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Abrir caja</h3>
          <button class="icon-btn" @click="openCashDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="mb-4">
            <label class="input-label">Almacén / Punto de Venta</label>
            <DarkSelect
              v-model="openCashForm.warehouse_id"
              :options="warehouseOptions"
              placeholder="Seleccionar almacén"
              class="full-width-select"
            />
          </div>
          <div>
            <label class="input-label">Efectivo inicial (fondo de cambio)</label>
            <v-text-field
              v-model="openCashForm.opening_balance"
              type="number"
              placeholder="0.00"
              variant="outlined"
              density="comfortable"
              hide-details
              class="dark-input"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="openCashDialog = false">Cancelar</button>
          <button class="btn-primary" @click="openCash" :disabled="openingCash">
            <v-progress-circular v-if="openingCash" indeterminate size="16" color="white" class="mr-2" />
            Abrir caja
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Cerrar caja -->
    <v-dialog v-model="closeCashDialog" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Cerrar caja</h3>
          <button class="icon-btn" @click="closeCashDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-info mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-information</v-icon>
            <span>
              <strong>Resumen de la sesión:</strong><br>
              Ventas: {{ registerToClose?.invoices_count || 0 }}<br>
              Total vendido: {{ formatPrice(registerToClose?.total_sales || 0) }}
            </span>
          </div>
          <div class="mb-4">
            <label class="input-label">Efectivo contado</label>
            <v-text-field
              v-model="closeCashForm.closing_balance"
              type="number"
              placeholder="0.00"
              variant="outlined"
              density="comfortable"
              hide-details
              class="dark-input"
            />
          </div>
          <div>
            <label class="input-label">Notas (opcional)</label>
            <v-textarea
              v-model="closeCashForm.notes"
              placeholder="Observaciones del cierre..."
              variant="outlined"
              density="comfortable"
              hide-details
              rows="2"
              class="dark-input"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="closeCashDialog = false">Cancelar</button>
          <button class="btn-primary" @click="closeCash" :disabled="closingCash">
            <v-progress-circular v-if="closingCash" indeterminate size="16" color="white" class="mr-2" />
            Cerrar caja
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Reporte -->
    <v-dialog v-model="reportDialog" max-width="700" class="dark-dialog">
      <div class="dialog-card" v-if="reportData">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Reporte de caja</h3>
          <button class="icon-btn" @click="reportDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div class="text-xs text-zinc-500 mb-1">Almacén</div>
              <div class="text-sm text-zinc-200">{{ reportData.register.warehouse_name }}</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Cajero</div>
              <div class="text-sm text-zinc-200">{{ reportData.register.user_name }}</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Apertura</div>
              <div class="text-sm text-zinc-200">{{ formatDateTime(reportData.register.opening_date) }}</div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Cierre</div>
              <div class="text-sm text-zinc-200">{{ formatDateTime(reportData.register.closing_date) }}</div>
            </div>
          </div>

          <div class="mb-5">
            <div class="text-sm font-semibold text-zinc-200 mb-2">Ventas</div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-zinc-500">Cantidad</div>
                <div class="text-lg font-mono text-zinc-200">{{ reportData.invoices_count }}</div>
              </div>
              <div>
                <div class="text-xs text-zinc-500">Total</div>
                <div class="text-lg font-mono text-indigo-400">{{ formatPrice(reportData.total_sales) }}</div>
              </div>
            </div>
          </div>

          <div class="mb-5">
            <div class="text-sm font-semibold text-zinc-200 mb-2">Desglose por método de pago</div>
            <div v-if="reportData.payments_by_method.length === 0" class="text-sm text-zinc-500">
              Sin pagos registrados
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="payment in reportData.payments_by_method"
                :key="payment.method"
                class="flex justify-between p-2 bg-zinc-900/50 rounded"
              >
                <span class="text-sm text-zinc-300">{{ payment.method }}</span>
                <span class="text-sm font-mono text-zinc-200">{{ formatPrice(payment.total) }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-zinc-900/50 rounded-lg">
            <div class="text-sm font-semibold text-zinc-200 mb-2">Arqueo de caja</div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-zinc-400">Efectivo inicial</span>
                <span class="text-sm font-mono text-zinc-200">{{ formatPrice(reportData.register.opening_balance) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-zinc-400">Ventas en efectivo</span>
                <span class="text-sm font-mono text-zinc-200">
                  {{ formatPrice(getCashSales(reportData.payments_by_method)) }}
                </span>
              </div>
              <div class="flex justify-between border-t border-zinc-700 pt-2">
                <span class="text-sm font-semibold text-zinc-200">Efectivo esperado</span>
                <span class="text-sm font-mono font-semibold text-zinc-200">
                  {{ formatPrice(reportData.register.expected_balance) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-zinc-400">Efectivo contado</span>
                <span class="text-sm font-mono text-zinc-200">{{ formatPrice(reportData.register.closing_balance) }}</span>
              </div>
              <div class="flex justify-between border-t border-zinc-700 pt-2">
                <span class="text-sm font-semibold" :class="getDifferenceClass(reportData.register.difference)">
                  Diferencia
                </span>
                <span class="text-sm font-mono font-bold" :class="getDifferenceClass(reportData.register.difference)">
                  {{ formatPrice(reportData.register.difference) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="reportDialog = false">Cerrar</button>
        </div>
      </div>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import api from "@/utils/axios";
import { useTable } from "@/composables/useTable";
import TablePagination from "@/components/TablePagination.vue";
import DarkSelect from "@/components/DarkSelect.vue";

const API_URL = "pos/cash-registers/";
const WAREHOUSES_URL = "inventory/warehouses/enabled/";

// ===== Tabla =====
const {
  items,
  loading,
  total,
  page,
  pageSize,
  loadData,
  changePage,
  changePageSize,
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: "-opening_date",
});

// ===== Estado =====
const warehouseOptions = ref([]);
const openCashDialog = ref(false);
const openingCash = ref(false);
const openCashForm = ref({
  warehouse_id: "",
  opening_balance: 0,
});

const closeCashDialog = ref(false);
const closingCash = ref(false);
const registerToClose = ref(null);
const closeCashForm = ref({
  closing_balance: 0,
  notes: "",
});

const reportDialog = ref(false);
const reportData = ref(null);

const snackbar = ref({ show: false, message: "", color: "success" });

// ===== Computed =====
const hasOpenRegister = computed(() => {
  return items.value.some(item => item.status === "OPEN");
});

// ===== Helpers =====
const formatPrice = (price) => {
  const num = parseFloat(price);
  return isNaN(num) ? "—" : num.toLocaleString("es-CU", { minimumFractionDigits: 2 });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDifferenceClass = (difference) => {
  const num = parseFloat(difference);
  if (num === 0) return "text-green-400";
  if (num > 0) return "text-blue-400";
  return "text-red-400";
};

const getCashSales = (payments) => {
  const cashPayment = payments.find(p => p.method.toLowerCase().includes("efectivo"));
  return cashPayment ? cashPayment.total : 0;
};

// ===== Cargar opciones =====
const loadWarehouses = async () => {
  try {
    const response = await api.get(WAREHOUSES_URL);
    const data = Array.isArray(response.data) ? response.data : response.data.results || [];
    warehouseOptions.value = data.map((w) => ({ value: w.id, label: w.name }));
  } catch (error) {
    console.error("Error cargando almacenes:", error);
  }
};

// ===== Abrir caja =====
const openCash = async () => {
  if (!openCashForm.value.warehouse_id) {
    showSnackbar("Selecciona un almacén", "error");
    return;
  }

  openingCash.value = true;
  try {
    await api.post(`${API_URL}open/`, {
      warehouse_id: parseInt(openCashForm.value.warehouse_id),
      opening_balance: parseFloat(openCashForm.value.opening_balance) || 0,
    });
    showSnackbar("Caja abierta correctamente", "success");
    openCashDialog.value = false;
    openCashForm.value = { warehouse_id: "", opening_balance: 0 };
    await loadData();
  } catch (error) {
    const msg = error.response?.data?.error || "Error al abrir caja";
    showSnackbar(msg, "error");
  } finally {
    openingCash.value = false;
  }
};

// ===== Cerrar caja =====
const confirmClose = (register) => {
  registerToClose.value = register;
  closeCashForm.value = { closing_balance: 0, notes: "" };
  closeCashDialog.value = true;
};

const closeCash = async () => {
  closingCash.value = true;
  try {
    await api.post(`${API_URL}${registerToClose.value.id}/close/`, {
      closing_balance: parseFloat(closeCashForm.value.closing_balance) || 0,
      notes: closeCashForm.value.notes,
    });
    showSnackbar("Caja cerrada correctamente", "success");
    closeCashDialog.value = false;
    registerToClose.value = null;
    await loadData();
  } catch (error) {
    const msg = error.response?.data?.error || "Error al cerrar caja";
    showSnackbar(msg, "error");
  } finally {
    closingCash.value = false;
  }
};

// ===== Ver reporte =====
const viewReport = async (register) => {
  try {
    const response = await api.get(`${API_URL}${register.id}/report/`);
    reportData.value = response.data;
    reportDialog.value = true;
  } catch (error) {
    showSnackbar("Error al cargar reporte", "error");
  }
};

const showSnackbar = (message, color = "success") => {
  snackbar.value = { show: true, message, color };
};

onMounted(() => {
  loadWarehouses();
});
</script>

<style scoped>
.dialog-card {
  background: rgba(24, 24, 27, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.dialog-body {
  padding: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
}

.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}

.alert-info {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
}
</style>