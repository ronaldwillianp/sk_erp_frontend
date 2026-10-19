<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Movimientos de inventario</h1>
          <p class="page-subtitle">
            Historial de entradas, salidas, traslados y ajustes
          </p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button
            class="btn-danger"
            @click="confirmPurge"
            :disabled="!items.length || purging"
          >
            <v-progress-circular
              v-if="purging"
              indeterminate
              size="16"
              class="mr-2"
            />
            <v-icon v-else size="18" class="mr-2">mdi-delete-sweep</v-icon>
            {{ purgeButtonText }}
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo movimiento
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="content-card !p-4 mb-5">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <div class="search-box flex-1 md:max-w-sm">
          <v-icon size="16" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por producto, SKU o referencia..."
            @keyup.enter="onSearch"
          />
          <button
            v-if="search"
            class="icon-btn !w-6 !h-6"
            @click="clearSearch"
            title="Limpiar"
          >
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect
            v-model="filters.movement_type"
            :options="typeFilterOptions"
            @change="onSearch"
          />
          <DarkSelect
            v-model="filters.warehouse"
            :options="warehouseFilterOptions"
            @change="onSearch"
          />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="content-card-flush">
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando movimientos...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-swap-horizontal</v-icon>
        </div>
        <div class="empty-state-title">
          {{
            hasActiveFilters ? "Sin resultados" : "Sin movimientos registrados"
          }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? "No se encontraron movimientos con los filtros aplicados."
              : "Aún no hay movimientos. Registra una entrada para comenzar."
          }}
        </div>
        <button
          v-if="!hasActiveFilters"
          class="btn-primary mt-6"
          @click="openDialog()"
        >
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Registrar movimiento
        </button>
        <button v-else class="btn-secondary mt-6" @click="resetAll">
          <v-icon size="18" class="mr-2">mdi-filter-remove-outline</v-icon>
          Limpiar filtros
        </button>
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Presentación</th>
                <th>Almacén</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Costo unit.</th>
                <th>Referencia</th>
                <th>Usuario</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td class="text-sm text-zinc-400 whitespace-nowrap">
                  {{ formatDate(item.created_at) }}
                </td>
                <td>
                  <span :class="['badge', getTypeBadge(item.movement_type)]">
                    <v-icon size="12" class="mr-1">{{
                      getTypeIcon(item.movement_type)
                    }}</v-icon>
                    {{ getTypeLabel(item.movement_type) }}
                  </span>
                </td>
                <td>
                  <div class="text-sm font-medium text-zinc-200">
                    {{ item.product.name }}
                  </div>
                  <div class="text-xs text-zinc-500 font-mono">
                    {{ item.product.sku }}
                  </div>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.presentation?.measure_unit?.short_name || "—" }}
                  <template
                    v-if="
                      item.movement_type === 'TRANSFER' &&
                      item.destination_presentation
                    "
                  >
                    <v-icon size="12" class="mx-1 text-zinc-600"
                      >mdi-arrow-right</v-icon
                    >
                    {{ item.destination_presentation.measure_unit.short_name }}
                  </template>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.warehouse.name }}
                  <template
                    v-if="
                      item.movement_type === 'TRANSFER' &&
                      item.destination_warehouse
                    "
                  >
                    <v-icon size="12" class="mx-1 text-zinc-600"
                      >mdi-arrow-right</v-icon
                    >
                    {{ item.destination_warehouse.name }}
                  </template>
                </td>
                <td class="text-right">
                  <span class="text-sm font-mono font-semibold text-zinc-200">
                    {{ formatQuantity(item.quantity) }}
                  </span>
                </td>
                <td class="text-right text-sm font-mono text-zinc-400">
                  {{ item.unit_cost > 0 ? formatPrice(item.unit_cost) : "—" }}
                </td>
                <td class="text-sm text-zinc-500">
                  {{ item.reference || "—" }}
                </td>
                <td class="text-sm text-zinc-500">
                  {{ item.user || "—" }}
                </td>
                <td class="text-right">
                  <button
                    class="icon-btn !text-red-400 hover:!bg-red-500/10"
                    title="Eliminar movimiento"
                    @click="confirmDelete(item)"
                  >
                    <v-icon size="16">mdi-delete-outline</v-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <TablePagination
          v-model:page="page"
          :total="total"
          :page-size="pageSize"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />
      </template>
    </div>

    <!-- ============================================ -->
    <!-- Dialog: Nuevo movimiento                     -->
    <!-- ============================================ -->
    <v-dialog v-model="dialogOpen" max-width="850" class="dark-dialog">
      <div class="dialog-card dialog-card-scrollable">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            Registrar movimiento
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <!-- Tipo de movimiento -->
          <div class="mb-5">
            <label class="input-label">Tipo de movimiento</label>
            <div class="movement-type-selector">
              <button
                v-for="opt in movementTypeOptions"
                :key="opt.value"
                :class="[
                  'movement-type-btn',
                  { active: form.movement_type === opt.value },
                ]"
                @click="onMovementTypeChange(opt.value)"
                type="button"
              >
                <v-icon size="16" class="mr-1.5">{{ opt.icon }}</v-icon>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Grid: Producto + Presentación -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Producto</label>
              <DarkSelect
                v-model="form.product_id"
                :options="productOptions"
                :searchable="true"
                search-placeholder="Buscar producto..."
                placeholder="Seleccionar producto"
                class="full-width-select"
                @change="onProductChange"
              />
              <p v-if="formErrors.product_id?.length" class="field-error">
                {{ formErrors.product_id[0] }}
              </p>
            </div>
            <div>
              <label class="input-label">Presentación</label>
              <DarkSelect
                v-model="form.presentation_id"
                :options="presentationOptions"
                placeholder="Seleccionar presentación"
                class="full-width-select"
              />
              <p v-if="formErrors.presentation_id?.length" class="field-error">
                {{ formErrors.presentation_id[0] }}
              </p>
            </div>
          </div>

          <!-- Grid: Almacén + Almacén destino -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">
                {{
                  form.movement_type === "TRANSFER"
                    ? "Almacén origen"
                    : "Almacén"
                }}
              </label>
              <DarkSelect
                v-model="form.warehouse_id"
                :options="warehouseOptions"
                placeholder="Seleccionar"
                class="full-width-select"
              />
              <p v-if="formErrors.warehouse_id?.length" class="field-error">
                {{ formErrors.warehouse_id[0] }}
              </p>
            </div>
            <div v-if="form.movement_type === 'TRANSFER'">
              <label class="input-label">Almacén destino</label>
              <DarkSelect
                v-model="form.destination_warehouse_id"
                :options="destinationWarehouseOptions"
                placeholder="Seleccionar"
                class="full-width-select"
              />
              <p
                v-if="formErrors.destination_warehouse_id?.length"
                class="field-error"
              >
                {{ formErrors.destination_warehouse_id[0] }}
              </p>
            </div>
          </div>

          <!-- Grid: Cantidad + Costo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Cantidad</label>
              <v-text-field
                v-model="form.quantity"
                placeholder="0"
                type="number"
                variant="outlined"
                density="comfortable"
                hide-details
                :error-messages="formErrors.quantity"
                class="dark-input"
                @update:model-value="clearFieldError('quantity')"
              />
            </div>
            <div
              v-if="
                form.movement_type === 'ENTRY' ||
                form.movement_type === 'ADJUSTMENT'
              "
            >
              <label class="input-label">Costo unitario</label>
              <v-text-field
                v-model="form.unit_cost"
                placeholder="0.00"
                type="number"
                variant="outlined"
                density="comfortable"
                hide-details
                :error-messages="formErrors.unit_cost"
                class="dark-input"
                @update:model-value="clearFieldError('unit_cost')"
              />
            </div>
          </div>

          <!-- Grid: Referencia + Notas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="input-label">Referencia</label>
              <v-text-field
                v-model="form.reference"
                placeholder="Ej: FAC-001, OC-2026-01"
                variant="outlined"
                density="comfortable"
                hide-details
                class="dark-input"
              />
            </div>
            <div>
              <label class="input-label">Notas</label>
              <v-text-field
                v-model="form.notes"
                placeholder="Observaciones opcionales"
                variant="outlined"
                density="comfortable"
                hide-details
                class="dark-input"
              />
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="dialogOpen = false">
            Cancelar
          </button>
          <button class="btn-primary" @click="saveMovement" :disabled="saving">
            <v-progress-circular
              v-if="saving"
              indeterminate
              size="16"
              color="white"
              class="mr-2"
            />
            Registrar movimiento
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Confirmar eliminación individual     -->
    <!-- ============================================ -->
    <v-dialog v-model="deleteDialogOpen" max-width="450" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            Eliminar movimiento
          </h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-warning mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert</v-icon>
            <span
              ><strong>Advertencia:</strong> Esta acción solo elimina el
              registro del movimiento.
              <strong>No restaura el stock</strong> asociado.</span
            >
          </div>
          <p class="text-sm text-zinc-400">
            ¿Estás seguro de eliminar este movimiento de
            <strong class="text-zinc-200">{{
              itemToDelete?.product?.name
            }}</strong>
            ({{ getTypeLabel(itemToDelete?.movement_type) }})?
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteDialogOpen = false">
            Cancelar
          </button>
          <button class="btn-danger" @click="deleteItem" :disabled="deleting">
            <v-progress-circular
              v-if="deleting"
              indeterminate
              size="16"
              class="mr-2"
            />
            Eliminar movimiento
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Confirmar vaciado total              -->
    <!-- ============================================ -->
    <v-dialog v-model="purgeDialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400"
              >mdi-alert-octagon</v-icon
            >
            Vaciar historial completo
          </h3>
          <button class="icon-btn" @click="cancelPurge">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0"
              >mdi-alert-octagon</v-icon
            >
            <span
              ><strong>Peligro:</strong> Esta acción eliminará
              <strong>TODOS</strong> los movimientos y reiniciará los IDs desde
              1. El stock actual <strong>NO se modificará</strong>.</span
            >
          </div>
          <p class="text-sm text-zinc-400 mb-2">
            Se eliminarán
            <strong class="text-zinc-200">{{ total }}</strong> movimientos de
            forma permanente.
          </p>
          <p class="text-xs text-zinc-500">
            Esta acción no se puede deshacer. Los IDs se reiniciarán a 1.
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="cancelPurge">Cancelar</button>
          <button
            class="btn-danger"
            @click="executePurge"
            :disabled="purgeCountdown > 0 || purging"
          >
            <v-progress-circular
              v-if="purging"
              indeterminate
              size="16"
              class="mr-2"
            />
            {{
              purgeCountdown > 0
                ? `Espera ${purgeCountdown}s...`
                : "Eliminar todo"
            }}
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top right"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import api from "@/utils/axios";
import { useTable } from "@/composables/useTable";
import TablePagination from "@/components/TablePagination.vue";
import DarkSelect from "@/components/DarkSelect.vue";

const route = useRoute();
const API_URL = "inventory/movements/";
const PRODUCTS_URL = "inventory/products/enabled/?is_service=false";
const WAREHOUSES_URL = "inventory/warehouses/enabled/";

// ===== Opciones =====
const movementTypeOptions = [
  { value: "ENTRY", label: "Entrada", icon: "mdi-package-down" },
  { value: "EXIT", label: "Salida", icon: "mdi-package-up" },
  { value: "TRANSFER", label: "Traslado", icon: "mdi-swap-horizontal" },
  { value: "ADJUSTMENT", label: "Ajuste", icon: "mdi-tune-vertical" },
];

const typeFilterOptions = [
  { value: "", label: "Todos los tipos" },
  ...movementTypeOptions.map((o) => ({ value: o.value, label: o.label })),
];

// ===== Tabla =====
const {
  items,
  loading,
  total,
  page,
  pageSize,
  search,
  filters,
  loadData,
  onSearch,
  clearSearch,
  clearFilters,
  changePage,
  changePageSize,
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: "-created_at",
  defaultFilters: { movement_type: "", warehouse: "" },
});

// ===== Estado =====
const dialogOpen = ref(false);
const saving = ref(false);

const deleteDialogOpen = ref(false);
const deleting = ref(false);
const itemToDelete = ref(null);

const purgeDialogOpen = ref(false);
const purging = ref(false);
const purgeCountdown = ref(0);
let purgeTimer = null;

const productOptions = ref([]);
const warehouseOptions = ref([]);
const presentationOptions = ref([]);

const emptyForm = () => ({
  movement_type: "ENTRY",
  product_id: "",
  presentation_id: "",
  warehouse_id: "",
  destination_warehouse_id: "",
  quantity: "",
  unit_cost: "",
  reference: "",
  notes: "",
});

const form = ref(emptyForm());
const formErrors = ref({});
const snackbar = ref({ show: false, message: "", color: "success" });

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== "" ||
    filters.value.movement_type !== "" ||
    filters.value.warehouse !== ""
  );
});

const warehouseFilterOptions = computed(() => [
  { value: "", label: "Todos los almacenes" },
  ...warehouseOptions.value,
]);

const destinationWarehouseOptions = computed(() => {
  return warehouseOptions.value.filter(
    (w) => w.value !== form.value.warehouse_id,
  );
});

const purgeButtonText = computed(() => {
  if (purging.value) return "Vaciando...";
  return "Vaciar historial";
});

// ===== Helpers =====
const getTypeLabel = (type) => {
  const map = {
    ENTRY: "Entrada",
    EXIT: "Salida",
    TRANSFER: "Traslado",
    ADJUSTMENT: "Ajuste",
    CONVERSION: "Conversión",
  };
  return map[type] || type;
};

const getTypeBadge = (type) => {
  const map = {
    ENTRY: "badge-success",
    EXIT: "badge-warning",
    TRANSFER: "badge-info",
    ADJUSTMENT: "badge-neutral",
    CONVERSION: "badge-neutral",
  };
  return map[type] || "badge-neutral";
};

const getTypeIcon = (type) => {
  const map = {
    ENTRY: "mdi-package-down",
    EXIT: "mdi-package-up",
    TRANSFER: "mdi-swap-horizontal",
    ADJUSTMENT: "mdi-tune-vertical",
    CONVERSION: "mdi-repeat",
  };
  return map[type] || "mdi-help-circle-outline";
};

const formatDate = (dateStr) => {
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

const formatQuantity = (qty) => {
  const num = parseFloat(qty);
  return isNaN(num)
    ? "0"
    : num.toLocaleString("es-CU", { maximumFractionDigits: 2 });
};

const formatPrice = (price) => {
  const num = parseFloat(price);
  return isNaN(num)
    ? "—"
    : num.toLocaleString("es-CU", { minimumFractionDigits: 2 });
};

// ===== Cargar opciones =====
const loadProducts = async () => {
  try {
    const response = await api.get(PRODUCTS_URL);
    productOptions.value = response.data.map((p) => ({
      value: p.id,
      label: `${p.sku} - ${p.name}`,
    }));
  } catch (error) {
    console.error("Error cargando productos:", error);
  }
};

const loadWarehouses = async () => {
  try {
    const response = await api.get(WAREHOUSES_URL);
    warehouseOptions.value = response.data.map((w) => ({
      value: w.id,
      label: w.name,
    }));
  } catch (error) {
    console.error("Error cargando almacenes:", error);
  }
};

const loadPresentations = async (productId) => {
  if (!productId) {
    presentationOptions.value = [];
    return;
  }
  try {
    const response = await api.get(`inventory/products/${productId}/`);
    presentationOptions.value = response.data.presentations.map((p) => ({
      value: p.id,
      label: `${p.measure_unit.name} (x${p.conversion_factor})`,
    }));
  } catch (error) {
    console.error("Error cargando presentaciones:", error);
    presentationOptions.value = [];
  }
};

// ===== Dialog: Crear =====
const openDialog = () => {
  formErrors.value = {};
  form.value = emptyForm();
  presentationOptions.value = [];
  dialogOpen.value = true;
};

const onMovementTypeChange = (type) => {
  form.value.movement_type = type;
  formErrors.value = {};
};

const onProductChange = (productId) => {
  form.value.presentation_id = "";
  loadPresentations(productId);
};

// ===== Guardar =====
const saveMovement = async () => {
  formErrors.value = {};
  let hasErrors = false;

  if (!form.value.product_id) {
    formErrors.value.product_id = ["Selecciona un producto"];
    hasErrors = true;
  }
  if (!form.value.presentation_id) {
    formErrors.value.presentation_id = ["Selecciona una presentación"];
    hasErrors = true;
  }
  if (!form.value.warehouse_id) {
    formErrors.value.warehouse_id = ["Selecciona un almacén"];
    hasErrors = true;
  }
  if (
    form.value.movement_type === "TRANSFER" &&
    !form.value.destination_warehouse_id
  ) {
    formErrors.value.destination_warehouse_id = [
      "Selecciona un almacén destino",
    ];
    hasErrors = true;
  }
  if (!form.value.quantity || parseFloat(form.value.quantity) <= 0) {
    formErrors.value.quantity = ["La cantidad debe ser mayor a 0"];
    hasErrors = true;
  }
  if (
    form.value.movement_type === "ENTRY" &&
    (!form.value.unit_cost || parseFloat(form.value.unit_cost) < 0)
  ) {
    formErrors.value.unit_cost = [
      "El costo unitario es requerido para entradas",
    ];
    hasErrors = true;
  }

  if (hasErrors) return;

  saving.value = true;
  try {
    const payload = {
      movement_type: form.value.movement_type,
      product_id: parseInt(form.value.product_id),
      presentation_id: parseInt(form.value.presentation_id),
      warehouse_id: parseInt(form.value.warehouse_id),
      quantity: parseFloat(form.value.quantity),
      reference: form.value.reference,
      notes: form.value.notes,
    };

    if (form.value.movement_type === "TRANSFER") {
      payload.destination_warehouse_id = parseInt(
        form.value.destination_warehouse_id,
      );
    }

    if (
      form.value.movement_type === "ENTRY" ||
      form.value.movement_type === "ADJUSTMENT"
    ) {
      payload.unit_cost = parseFloat(form.value.unit_cost) || 0;
    }

    await api.post(API_URL, payload);
    showSnackbar("Movimiento registrado correctamente");
    dialogOpen.value = false;
    await loadData();
  } catch (error) {
    handleApiError(error);
  } finally {
    saving.value = false;
  }
};

// ===== Eliminar individual =====
const confirmDelete = (item) => {
  itemToDelete.value = item;
  deleteDialogOpen.value = true;
};

const deleteItem = async () => {
  deleting.value = true;
  try {
    await api.delete(`${API_URL}${itemToDelete.value.id}/`);
    showSnackbar("Movimiento eliminado (stock no restaurado)");
    deleteDialogOpen.value = false;

    if (items.value.length === 1 && page.value > 1) {
      page.value--;
    } else {
      await loadData();
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    deleting.value = false;
  }
};

// ===== Vaciar todo con temporizador =====
const confirmPurge = () => {
  purgeCountdown.value = 10;
  purgeDialogOpen.value = true;

  purgeTimer = setInterval(() => {
    purgeCountdown.value--;
    if (purgeCountdown.value <= 0) {
      clearInterval(purgeTimer);
      purgeTimer = null;
    }
  }, 1000);
};

const cancelPurge = () => {
  if (purgeTimer) {
    clearInterval(purgeTimer);
    purgeTimer = null;
  }
  purgeCountdown.value = 0;
  purgeDialogOpen.value = false;
};

const executePurge = async () => {
  purging.value = true;
  try {
    const response = await api.delete(`${API_URL}purge/`);
    showSnackbar(response.data.message || "Historial vaciado correctamente");
    purgeDialogOpen.value = false;
    page.value = 1;
    await loadData();
  } catch (error) {
    handleApiError(error);
  } finally {
    purging.value = false;
  }
};

// ===== Errores =====
const handleApiError = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    const fieldErrors = {};

    [
      "product_id",
      "presentation_id",
      "warehouse_id",
      "destination_warehouse_id",
      "quantity",
      "unit_cost",
    ].forEach((field) => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field])
          ? data[field]
          : [data[field]];
      }
    });

    formErrors.value = fieldErrors;

    if (Object.keys(fieldErrors).length === 0) {
      showSnackbar(
        data.detail || data.error || "Error al registrar movimiento",
        "error",
      );
    }
  } else {
    showSnackbar("Error de conexión", "error");
  }
};

const clearFieldError = (field) => {
  if (formErrors.value[field]) formErrors.value[field] = [];
};

const resetAll = () => {
  search.value = "";
  clearFilters();
};

const showSnackbar = (message, color = "success") => {
  snackbar.value = { show: true, message, color };
};

// ===== Cleanup =====
onMounted(() => {
  loadProducts();
  loadWarehouses();
  loadData();

  // ← NUEVO: Si viene desde una alerta, abrir dialog con entrada pre-llenada
  if (route.query.new_entry === "true" && route.query.product_id) {
    openDialogWithProduct(
      parseInt(route.query.product_id),
      parseFloat(route.query.suggested_quantity) || 0,
    );
  }
});

// ← NUEVO: Función para abrir dialog con producto pre-llenado
const openDialogWithProduct = async (productId, suggestedQuantity) => {
  formErrors.value = {};
  form.value = emptyForm();
  form.value.movement_type = "ENTRY";
  form.value.product_id = productId;
  form.value.quantity = suggestedQuantity || "";
  presentationOptions.value = [];

  // Cargar presentaciones del producto
  await loadPresentations(productId);

  // Seleccionar la primera presentación automáticamente si solo hay una
  if (presentationOptions.value.length === 1) {
    form.value.presentation_id = presentationOptions.value[0].value;
  }

  dialogOpen.value = true;
};

onUnmounted(() => {
  if (purgeTimer) clearInterval(purgeTimer);
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

/* Variante con scroll para dialogs largos */
.dialog-card-scrollable {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.dialog-card-scrollable .dialog-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
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
  flex-shrink: 0;
}

/* Selector de tipo de movimiento */
.movement-type-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.movement-type-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.movement-type-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.movement-type-btn.active {
  background: rgba(99, 102, 241, 0.12);
  border-color: var(--accent-start);
  color: var(--accent-light);
}

.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}

.field-error {
  color: var(--error);
  font-size: 12px;
  margin-top: 6px;
}
</style>
