<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Inventario</h1>
          <p class="page-subtitle">
            Stock actual por producto, almacén y presentación
          </p>
        </div>
        <div class="flex gap-3 flex-wrap">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button
            class="btn-danger"
            @click="confirmPurgeStock"
            :disabled="!items.length || purgingStock"
          >
            <v-progress-circular
              v-if="purgingStock"
              indeterminate
              size="16"
              class="mr-2"
            />
            <v-icon v-else size="18" class="mr-2">mdi-delete-sweep</v-icon>
            {{ purgeStockButtonText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Panel de resumen del inventario -->
    <div
      v-if="summaryData"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    >
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Valor total del inventario</div>
            <div class="stat-value">
              {{ formatPrice(summaryData.totals.total_value) }}
            </div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-cash-multiple</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Unidades en stock</div>
            <div class="stat-value">
              {{ formatQuantity(summaryData.totals.total_quantity) }}
            </div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-package-variant</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Productos con stock</div>
            <div class="stat-value">
              {{ summaryData.totals.unique_products }}
            </div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-tag-multiple</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Almacenes activos</div>
            <div class="stat-value">
              {{ summaryData.totals.unique_warehouses }}
            </div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-warehouse</v-icon>
          </div>
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
            placeholder="Buscar por producto, SKU o almacén..."
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
            v-model="filters.product"
            :options="productFilterOptions"
            :searchable="true"
            search-placeholder="Buscar producto..."
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
        <p class="text-sm text-zinc-500 mt-4">Cargando inventario...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-warehouse</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? "Sin resultados" : "Sin stock registrado" }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? "No se encontró stock con los filtros aplicados."
              : "Aún no hay movimientos de inventario. El stock aparecerá aquí cuando registres entradas."
          }}
        </div>
        <button
          v-if="hasActiveFilters"
          class="btn-secondary mt-6"
          @click="resetAll"
        >
          <v-icon size="18" class="mr-2">mdi-filter-remove-outline</v-icon>
          Limpiar filtros
        </button>
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th
                  @click="toggleOrdering('warehouse__name')"
                  class="sortable-th"
                >
                  <span class="inline-flex items-center">
                    Almacén
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("warehouse__name")
                    }}</v-icon>
                  </span>
                </th>
                <th
                  @click="toggleOrdering('product__name')"
                  class="sortable-th"
                >
                  <span class="inline-flex items-center">
                    Producto
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("product__name")
                    }}</v-icon>
                  </span>
                </th>
                <th>Presentación</th>
                <th
                  class="text-right"
                  @click="toggleOrdering('quantity')"
                  style="cursor: pointer"
                >
                  <span class="inline-flex items-center">
                    Cantidad
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("quantity")
                    }}</v-icon>
                  </span>
                </th>
                <th class="text-right">Costo prom. unit.</th>
                <th
                  class="text-right"
                  @click="toggleOrdering('total_value')"
                  style="cursor: pointer"
                >
                  <span class="inline-flex items-center">
                    Valor total
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("total_value")
                    }}</v-icon>
                  </span>
                </th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td class="text-sm text-zinc-400">
                  <div class="flex items-center gap-2">
                    <v-icon size="14" class="text-zinc-600">
                      {{
                        item.warehouse.warehouse_type === "POINT_OF_SALE"
                          ? "mdi-store-outline"
                          : "mdi-warehouse"
                      }}
                    </v-icon>
                    <div>
                      <div class="text-zinc-300">{{ item.warehouse.name }}</div>
                      <div class="text-xs text-zinc-600 font-mono">
                        {{ item.warehouse.code }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="table-avatar avatar-gradient">
                      <v-icon size="18" color="white"
                        >mdi-package-variant</v-icon
                      >
                    </div>
                    <div>
                      <div class="text-sm font-medium text-zinc-200">
                        {{ item.product.name }}
                      </div>
                      <div class="text-xs text-zinc-500 font-mono">
                        {{ item.product.sku }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge badge-neutral">
                    {{ item.presentation.measure_unit.name }}
                  </span>
                </td>
                <td class="text-right">
                  <span class="text-sm font-mono font-semibold text-zinc-200">
                    {{ formatQuantity(item.quantity) }}
                  </span>
                </td>
                <td class="text-right text-sm font-mono text-zinc-400">
                  {{ formatPrice(item.average_cost) }}
                </td>
                <td class="text-right text-sm font-mono text-zinc-300">
                  {{ formatPrice(item.total_value) }}
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <!-- Solo mostrar si hay más de 1 presentación -->
                    <button
                      v-if="item.presentations_count > 1"
                      class="btn-secondary !px-3 !py-1.5 !text-xs"
                      @click="openConversion(item)"
                    >
                      <v-icon size="14" class="mr-1"
                        >mdi-swap-horizontal</v-icon
                      >
                      Convertir
                    </button>
                    <button
                      class="icon-btn !text-red-400 hover:!bg-red-500/10"
                      title="Eliminar este stock"
                      @click="confirmDeleteStock(item)"
                    >
                      <v-icon size="16">mdi-delete-outline</v-icon>
                    </button>
                  </div>
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

    <!-- Dialog: Conversión manual (sin cambios) -->
    <v-dialog
      v-model="conversionDialogOpen"
      max-width="550"
      class="dark-dialog"
    >
      <div class="dialog-card">
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">
              Convertir presentación
            </h3>
            <p class="text-xs text-zinc-500 mt-1">
              {{ conversionForm.productName }} ·
              {{ conversionForm.warehouseName }}
            </p>
          </div>
          <button class="icon-btn" @click="conversionDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-5">
            <label class="input-label">De (presentación origen)</label>
            <div class="conversion-source">
              <span class="badge badge-info">{{
                conversionForm.fromPresentationLabel
              }}</span>
              <span class="text-xs text-zinc-500 ml-2">
                Disponible:
                {{ formatQuantity(conversionForm.availableQuantity) }}
              </span>
            </div>
          </div>

          <div class="mb-5">
            <label class="input-label">Cantidad a convertir</label>
            <v-text-field
              v-model="conversionForm.quantity"
              placeholder="0"
              type="number"
              variant="outlined"
              density="comfortable"
              hide-details
              class="dark-input"
              @update:model-value="calculateConversion"
            />
          </div>

          <div class="mb-5">
            <label class="input-label">A (presentación destino)</label>
            <DarkSelect
              v-model="conversionForm.toPresentationId"
              :options="destinationOptions"
              placeholder="Seleccionar presentación destino"
              class="full-width-select"
              @change="calculateConversion"
            />
          </div>

          <div v-if="conversionPreview" class="conversion-preview">
            <v-icon size="18" class="mr-2 text-indigo-400"
              >mdi-swap-horizontal</v-icon
            >
            <span class="text-sm text-zinc-300">{{ conversionPreview }}</span>
          </div>

          <div v-if="conversionError" class="alert-warning mt-4">
            <v-icon size="16" class="mr-2 flex-shrink-0">mdi-alert</v-icon>
            <span>{{ conversionError }}</span>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="conversionDialogOpen = false">
            Cancelar
          </button>
          <button
            class="btn-primary"
            @click="executeConversion"
            :disabled="converting || !canConvert"
          >
            <v-progress-circular
              v-if="converting"
              indeterminate
              size="16"
              color="white"
              class="mr-2"
            />
            Convertir
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Eliminar stock individual (sin cambios) -->
    <v-dialog
      v-model="deleteStockDialogOpen"
      max-width="450"
      class="dark-dialog"
    >
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            Eliminar registro de stock
          </h3>
          <button class="icon-btn" @click="deleteStockDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-warning mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert</v-icon>
            <span
              ><strong>Advertencia:</strong> Esta acción elimina el registro de
              stock. <strong>No crea movimiento inverso</strong> ni restaura
              nada.</span
            >
          </div>
          <p class="text-sm text-zinc-400">
            ¿Eliminar
            <strong class="text-zinc-200"
              >{{ formatQuantity(stockToDelete?.quantity) }}
              {{
                stockToDelete?.presentation?.measure_unit?.short_name
              }}</strong
            >
            de
            <strong class="text-zinc-200">{{
              stockToDelete?.product?.name
            }}</strong>
            en
            <strong class="text-zinc-200">{{
              stockToDelete?.warehouse?.name
            }}</strong
            >?
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteStockDialogOpen = false">
            Cancelar
          </button>
          <button
            class="btn-danger"
            @click="deleteStock"
            :disabled="deletingStock"
          >
            <v-progress-circular
              v-if="deletingStock"
              indeterminate
              size="16"
              class="mr-2"
            />
            Eliminar stock
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Vaciar inventario (sin cambios) -->
    <v-dialog
      v-model="purgeStockDialogOpen"
      max-width="500"
      class="dark-dialog"
    >
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400"
              >mdi-alert-octagon</v-icon
            >
            Vaciar inventario completo
          </h3>
          <button class="icon-btn" @click="cancelPurgeStock">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0"
              >mdi-alert-octagon</v-icon
            >
            <span
              ><strong>Peligro:</strong> Se eliminarán
              <strong>TODOS</strong> los registros de stock. Los productos y
              movimientos <strong>NO se eliminan</strong>.</span
            >
          </div>
          <p class="text-sm text-zinc-400 mb-2">
            Se eliminarán
            <strong class="text-zinc-200">{{ total }}</strong> registros de
            stock de forma permanente.
          </p>
          <p class="text-xs text-zinc-500">Esta acción no se puede deshacer.</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="cancelPurgeStock">
            Cancelar
          </button>
          <button
            class="btn-danger"
            @click="executePurgeStock"
            :disabled="purgeStockCountdown > 0 || purgingStock"
          >
            <v-progress-circular
              v-if="purgingStock"
              indeterminate
              size="16"
              class="mr-2"
            />
            {{
              purgeStockCountdown > 0
                ? `Espera ${purgeStockCountdown}s...`
                : "Vaciar inventario"
            }}
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Eliminar todos los productos (sin cambios) -->
    <v-dialog
      v-model="purgeProductsDialogOpen"
      max-width="500"
      class="dark-dialog"
    >
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400"
              >mdi-package-remove</v-icon
            >
            Eliminar todos los productos
          </h3>
          <button class="icon-btn" @click="cancelPurgeProducts">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0"
              >mdi-alert-octagon</v-icon
            >
            <span
              ><strong>Peligro extremo:</strong> Se eliminarán
              <strong>TODOS</strong> los productos, sus presentaciones, el stock
              asociado y los movimientos. Todo se perderá permanentemente.</span
            >
          </div>
          <p class="text-sm text-zinc-400 mb-2">
            Los IDs de productos y presentaciones se reiniciarán desde 1.
          </p>
          <p class="text-xs text-zinc-500">Esta acción es irreversible.</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="cancelPurgeProducts">
            Cancelar
          </button>
          <button
            class="btn-danger"
            @click="executePurgeProducts"
            :disabled="purgeProductsCountdown > 0 || purgingProducts"
          >
            <v-progress-circular
              v-if="purgingProducts"
              indeterminate
              size="16"
              class="mr-2"
            />
            {{
              purgeProductsCountdown > 0
                ? `Espera ${purgeProductsCountdown}s...`
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
import api from "@/utils/axios";
import { useTable } from "@/composables/useTable";
import TablePagination from "@/components/TablePagination.vue";
import DarkSelect from "@/components/DarkSelect.vue";

const API_URL = "inventory/stock/";
const PRODUCTS_URL = "inventory/products/enabled/?is_service=false";
const WAREHOUSES_URL = "inventory/warehouses/enabled/";

// ===== Tabla =====
const {
  items,
  loading,
  total,
  page,
  pageSize,
  search,
  ordering,
  filters,
  loadData,
  toggleOrdering,
  getOrderingIcon,
  onSearch,
  clearSearch,
  clearFilters,
  changePage,
  changePageSize,
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: "warehouse__name", // ← Cambiado: ordenar por almacén
  defaultFilters: { product: "", warehouse: "" },
});

// ===== Estado general =====
const productOptions = ref([]);
const warehouseOptions = ref([]);
const summaryData = ref(null); // ← Nuevo: datos del resumen
const snackbar = ref({ show: false, message: "", color: "success" });

// ===== Conversión =====
const conversionDialogOpen = ref(false);
const converting = ref(false);
const conversionForm = ref({
  productId: null,
  warehouseId: null,
  fromPresentationId: null,
  fromPresentationLabel: "",
  toPresentationId: "",
  quantity: "",
  availableQuantity: 0,
  productName: "",
  warehouseName: "",
  productPresentations: [],
});
const conversionError = ref("");

// ===== Eliminar stock individual =====
const deleteStockDialogOpen = ref(false);
const deletingStock = ref(false);
const stockToDelete = ref(null);

// ===== Vaciar inventario =====
const purgeStockDialogOpen = ref(false);
const purgingStock = ref(false);
const purgeStockCountdown = ref(0);
let purgeStockTimer = null;

// ===== Eliminar todos los productos =====
const purgeProductsDialogOpen = ref(false);
const purgingProducts = ref(false);
const purgeProductsCountdown = ref(0);
let purgeProductsTimer = null;

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== "" ||
    filters.value.product !== "" ||
    filters.value.warehouse !== ""
  );
});

const productFilterOptions = computed(() => [
  { value: "", label: "Todos los productos" },
  ...productOptions.value,
]);

const warehouseFilterOptions = computed(() => [
  { value: "", label: "Todos los almacenes" },
  ...warehouseOptions.value,
]);

const destinationOptions = computed(() => {
  return conversionForm.value.productPresentations
    .filter((p) => p.id !== conversionForm.value.fromPresentationId)
    .map((p) => ({ value: p.id, label: p.measure_unit.name }));
});

const canConvert = computed(() => {
  const qty = parseFloat(conversionForm.value.quantity);
  return (
    conversionForm.value.toPresentationId &&
    qty > 0 &&
    qty <= conversionForm.value.availableQuantity
  );
});

const conversionPreview = computed(() => {
  const qty = parseFloat(conversionForm.value.quantity);
  if (!qty || qty <= 0 || !conversionForm.value.toPresentationId) return null;
  const from = conversionForm.value.productPresentations.find(
    (p) => p.id === conversionForm.value.fromPresentationId,
  );
  const to = conversionForm.value.productPresentations.find(
    (p) => p.id === conversionForm.value.toPresentationId,
  );
  if (!from || !to) return null;
  const result = (qty * from.conversion_factor) / to.conversion_factor;
  return `${qty} ${from.measure_unit.short_name} → ${formatQuantity(result)} ${to.measure_unit.short_name}`;
});

const purgeStockButtonText = computed(() => {
  if (purgingStock.value) return "Vaciando...";
  return "Vaciar inventario";
});

// ===== Helpers =====
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

// ===== Cargar datos =====
const loadProducts = async () => {
  try {
    const response = await api.get(PRODUCTS_URL);
    productOptions.value = response.data.map((p) => ({
      value: p.id,
      label: p.name,
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

// ← NUEVO: Cargar resumen del inventario
const loadSummary = async () => {
  try {
    const response = await api.get(`${API_URL}summary/`);
    summaryData.value = response.data;
  } catch (error) {
    console.error("Error cargando resumen:", error);
  }
};

// ← MODIFICADO: loadData ahora también actualiza el resumen
const refreshAll = async () => {
  await Promise.all([loadData(), loadSummary()]);
};

// ===== Conversión =====
const openConversion = async (stockItem) => {
  conversionError.value = "";
  try {
    const response = await api.get(
      `inventory/products/${stockItem.product.id}/`,
    );
    const product = response.data;
    conversionForm.value = {
      productId: product.id,
      warehouseId: stockItem.warehouse.id,
      fromPresentationId: stockItem.presentation.id,
      fromPresentationLabel: stockItem.presentation.measure_unit.name,
      toPresentationId: "",
      quantity: "",
      availableQuantity: stockItem.quantity,
      productName: product.name,
      warehouseName: stockItem.warehouse.name,
      productPresentations: product.presentations,
    };
    conversionDialogOpen.value = true;
  } catch (error) {
    showSnackbar("Error al cargar las presentaciones del producto", "error");
  }
};

const calculateConversion = () => {
  conversionError.value = "";
  const qty = parseFloat(conversionForm.value.quantity);
  if (qty > conversionForm.value.availableQuantity) {
    conversionError.value = `Stock insuficiente. Disponible: ${formatQuantity(conversionForm.value.availableQuantity)}`;
  }
};

const executeConversion = async () => {
  if (!canConvert.value) return;
  converting.value = true;
  conversionError.value = "";
  try {
    await api.post("inventory/conversions/", {
      product_id: conversionForm.value.productId,
      warehouse_id: conversionForm.value.warehouseId,
      from_presentation_id: conversionForm.value.fromPresentationId,
      to_presentation_id: conversionForm.value.toPresentationId,
      quantity: parseFloat(conversionForm.value.quantity),
    });
    showSnackbar("Conversión realizada correctamente");
    conversionDialogOpen.value = false;
    await refreshAll();
  } catch (error) {
    const msg =
      error.response?.data?.error || "Error al realizar la conversión";
    conversionError.value = msg;
  } finally {
    converting.value = false;
  }
};

// ===== Eliminar stock individual =====
const confirmDeleteStock = (item) => {
  stockToDelete.value = item;
  deleteStockDialogOpen.value = true;
};

const deleteStock = async () => {
  deletingStock.value = true;
  try {
    const response = await api.delete(
      `${API_URL}${stockToDelete.value.id}/delete/`,
    );
    showSnackbar(response.data.message || "Stock eliminado correctamente");
    deleteStockDialogOpen.value = false;
    if (items.value.length === 1 && page.value > 1) {
      page.value--;
    }
    await refreshAll();
  } catch (error) {
    showSnackbar(
      error.response?.data?.error || "Error al eliminar stock",
      "error",
    );
  } finally {
    deletingStock.value = false;
  }
};

// ===== Vaciar inventario =====
const confirmPurgeStock = () => {
  purgeStockCountdown.value = 10;
  purgeStockDialogOpen.value = true;
  purgeStockTimer = setInterval(() => {
    purgeStockCountdown.value--;
    if (purgeStockCountdown.value <= 0) {
      clearInterval(purgeStockTimer);
      purgeStockTimer = null;
    }
  }, 1000);
};

const cancelPurgeStock = () => {
  if (purgeStockTimer) {
    clearInterval(purgeStockTimer);
    purgeStockTimer = null;
  }
  purgeStockCountdown.value = 0;
  purgeStockDialogOpen.value = false;
};

const executePurgeStock = async () => {
  purgingStock.value = true;
  try {
    const response = await api.delete(`${API_URL}purge/`);
    showSnackbar(response.data.message || "Inventario vaciado correctamente");
    purgeStockDialogOpen.value = false;
    page.value = 1;
    await refreshAll();
  } catch (error) {
    showSnackbar("Error al vaciar inventario", "error");
  } finally {
    purgingStock.value = false;
  }
};

// ===== Eliminar todos los productos =====
const confirmPurgeProducts = () => {
  purgeProductsCountdown.value = 10;
  purgeProductsDialogOpen.value = true;
  purgeProductsTimer = setInterval(() => {
    purgeProductsCountdown.value--;
    if (purgeProductsCountdown.value <= 0) {
      clearInterval(purgeProductsTimer);
      purgeProductsTimer = null;
    }
  }, 1000);
};

const cancelPurgeProducts = () => {
  if (purgeProductsTimer) {
    clearInterval(purgeProductsTimer);
    purgeProductsTimer = null;
  }
  purgeProductsCountdown.value = 0;
  purgeProductsDialogOpen.value = false;
};

const executePurgeProducts = async () => {
  purgingProducts.value = true;
  try {
    const response = await api.delete("inventory/products/purge/");
    showSnackbar(response.data.message || "Productos eliminados correctamente");
    purgeProductsDialogOpen.value = false;
    page.value = 1;
    await refreshAll();
  } catch (error) {
    showSnackbar("Error al eliminar productos", "error");
  } finally {
    purgingProducts.value = false;
  }
};

// ===== Utilidades =====
const resetAll = () => {
  search.value = "";
  clearFilters();
};

const showSnackbar = (message, color = "success") => {
  snackbar.value = { show: true, message, color };
};

// ===== Lifecycle =====
onMounted(() => {
  loadProducts();
  loadWarehouses();
  loadSummary(); // ← Nuevo
  loadData();
});

onUnmounted(() => {
  if (purgeStockTimer) clearInterval(purgeStockTimer);
  if (purgeProductsTimer) clearInterval(purgeProductsTimer);
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

.conversion-source {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.conversion-preview {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
}

.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}
</style>
