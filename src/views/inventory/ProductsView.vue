<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Productos</h1>
          <p class="page-subtitle">Gestiona tu catálogo de productos y servicios</p>
        </div>
        <div class="flex gap-3 flex-wrap">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>

          <!-- Botones de selección / etiquetas (solo visibles si hay selección) -->
          <template v-if="selectedProductIds.length > 0">
            <button class="btn-secondary" @click="clearSelection">
              <v-icon size="18" class="mr-2">mdi-close-circle-outline</v-icon>
              Limpiar selección ({{ selectedProductIds.length }})
            </button>

            <button class="btn-primary" @click="generateLabels" :disabled="generatingLabels">
              <v-progress-circular v-if="generatingLabels" indeterminate size="16" class="mr-2" />
              <v-icon v-else size="18" class="mr-2">mdi-barcode-scan</v-icon>
              Generar etiquetas ({{ selectedProductIds.length }})
            </button>
          </template>

          <button class="btn-danger" @click="confirmPurge" :disabled="!items.length || purging">
            <v-progress-circular v-if="purging" indeterminate size="16" class="mr-2" />
            <v-icon v-else size="18" class="mr-2">mdi-delete-sweep</v-icon>
            {{ purgeButtonText }}
          </button>

          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo producto
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
            placeholder="Buscar por nombre, SKU o código de barras..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect
            v-model="filters.category"
            :options="categoryFilterOptions"
            :searchable="true"
            search-placeholder="Buscar categoría..."
            @change="onSearch"
          />
          <DarkSelect v-model="filters.enabled" :options="statusOptions" @change="onSearch" />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="content-card-flush">
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando datos...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-package-variant</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin productos registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron productos con los filtros aplicados.'
              : 'Aún no hay productos. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear producto
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
                <!-- Checkbox para seleccionar todos los de la página actual -->
                <th class="w-12">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate.prop="someSelected && !allSelected"
                    @change="toggleSelectAll"
                    class="cursor-pointer"
                  />
                </th>
                <th @click="toggleOrdering('sku')" class="sortable-th">
                  <span class="inline-flex items-center">
                    SKU
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('sku') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('name') }}</v-icon>
                  </span>
                </th>
                <th>Categoría</th>
                <th>Presentaciones</th>
                <th @click="toggleOrdering('sale_price')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Precio base
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('sale_price') }}</v-icon>
                  </span>
                </th>
                <th>Tipo</th>
                <th @click="toggleOrdering('enabled')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Estado
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('enabled') }}</v-icon>
                  </span>
                </th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <!-- Checkbox individual -->
                <td>
                  <input
                    type="checkbox"
                    :checked="isProductSelected(item.id)"
                    @change="toggleProductSelection(item.id)"
                    class="cursor-pointer"
                  />
                </td>
                <td>
                  <div class="flex items-center gap-3">
                    <div class="table-avatar avatar-gradient">
                      <v-icon size="18" color="white">
                        {{ item.is_service ? 'mdi-briefcase-outline' : 'mdi-package-variant' }}
                      </v-icon>
                    </div>
                    <span class="text-sm font-mono font-semibold text-zinc-200">{{
                      item.sku
                    }}</span>
                  </div>
                </td>
                <td>
                  <div class="text-sm font-medium text-zinc-200">
                    {{ item.name }}
                  </div>
                  <div v-if="item.barcode" class="text-xs text-zinc-500">
                    {{ item.barcode }}
                  </div>
                </td>
                <td class="text-sm text-zinc-400">
                  <span v-if="item.category" class="badge badge-info">{{
                    item.category.name
                  }}</span>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="pres in item.presentations.slice(0, 3)"
                      :key="pres.id"
                      class="badge badge-neutral"
                    >
                      {{ pres.measure_unit.short_name }}
                    </span>
                    <span v-if="item.presentations.length > 3" class="badge badge-neutral">
                      +{{ item.presentations.length - 3 }}
                    </span>
                    <span v-if="item.presentations.length === 0" class="text-zinc-600 text-xs">
                      Sin presentaciones
                    </span>
                  </div>
                </td>
                <td class="text-sm font-mono text-zinc-300">
                  {{ formatPrice(item.sale_price) }}
                </td>
                <td>
                  <span :class="['badge', item.is_service ? 'badge-warning' : 'badge-neutral']">
                    {{ item.is_service ? 'Servicio' : 'Producto' }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', item.enabled ? 'badge-success' : 'badge-neutral']">
                    {{ item.enabled ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="icon-btn" title="Editar" @click="openDialog(item)">
                      <v-icon size="16">mdi-pencil-outline</v-icon>
                    </button>
                    <button
                      class="icon-btn !text-red-400 hover:!bg-red-500/10"
                      title="Eliminar"
                      @click="confirmDelete(item)"
                    >
                      <v-icon size="16">mdi-delete-outline</v-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación actualizada con eventos -->
        <TablePagination
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />
      </template>
    </div>

    <!-- ============================================ -->
    <!-- Dialog: Crear / Editar (con TABS)            -->
    <!-- ============================================ -->
    <v-dialog
      v-model="dialogOpen"
      max-width="800"
      class="dark-dialog product-form-dialog"
      persistent
    >
      <div class="dialog-card">
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">
              {{ isEditing ? 'Editar producto' : 'Nuevo producto' }}
            </h3>
            <p class="text-xs text-zinc-500 mt-1">
              {{ isEditing ? `SKU: ${form.sku}` : 'Completa los datos para crear el producto' }}
            </p>
          </div>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="form-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['form-tab', { 'form-tab-active': activeTab === tab.id }]"
            @click="activeTab = tab.id"
            type="button"
          >
            <v-icon size="16" class="mr-2">{{ tab.icon }}</v-icon>
            {{ tab.label }}
            <span v-if="tabHasError(tab.id)" class="tab-error-dot"></span>
          </button>
        </div>

        <div class="dialog-body">
          <!-- TAB: General -->
          <div v-show="activeTab === 'general'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Nombre</label>
                <v-text-field
                  v-model="form.name"
                  placeholder="Ej: Cerveza Bucanero"
                  variant="outlined"
                  :error-messages="formErrors.name"
                  class="dark-input"
                  prepend-inner-icon="mdi-package-variant-outline"
                  @update:model-value="clearFieldError('name')"
                />
              </div>
              <div>
                <label class="input-label">SKU</label>
                <v-text-field
                  v-model="form.sku"
                  placeholder="Ej: BEB-001"
                  variant="outlined"
                  :error-messages="formErrors.sku"
                  class="dark-input uppercase-input"
                  prepend-inner-icon="mdi-barcode-scan"
                  @update:model-value="onSkuInput"
                />
              </div>
            </div>

            <div class="mb-4">
              <label class="input-label">Código de barras</label>
              <v-text-field
                v-model="form.barcode"
                placeholder="Opcional"
                variant="outlined"
                class="dark-input"
                prepend-inner-icon="mdi-barcode"
              />
            </div>

            <div>
              <label class="input-label">Categoría</label>
              <DarkSelect
                v-model="form.category_id"
                :options="categoryOptions"
                :searchable="true"
                search-placeholder="Buscar categoría..."
                placeholder="Seleccionar"
                class="full-width-select"
              />
              <p v-if="formErrors.category_id?.length" class="field-error">
                {{ formErrors.category_id[0] }}
              </p>
            </div>
          </div>

          <!-- TAB: Precios y opciones -->
          <div v-show="activeTab === 'pricing'">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label class="input-label">Precio de costo</label>
                <v-text-field
                  v-model="form.cost_price"
                  placeholder="0.00"
                  type="number"
                  variant="outlined"
                  :error-messages="formErrors.cost_price"
                  class="dark-input"
                  prepend-inner-icon="mdi-cash-minus"
                  @update:model-value="clearFieldError('cost_price')"
                />
              </div>
              <div>
                <label class="input-label">Precio de venta (referencia)</label>
                <v-text-field
                  v-model="form.sale_price"
                  placeholder="0.00"
                  type="number"
                  variant="outlined"
                  :error-messages="formErrors.sale_price"
                  class="dark-input"
                  prepend-inner-icon="mdi-cash-plus"
                  @update:model-value="clearFieldError('sale_price')"
                />
              </div>
              <div>
                <label class="input-label">Stock mínimo</label>
                <v-text-field
                  v-model="form.min_stock"
                  placeholder="0"
                  type="number"
                  variant="outlined"
                  class="dark-input"
                  prepend-inner-icon="mdi-alert-circle-outline"
                />
              </div>
            </div>

            <div class="form-section-title">Opciones</div>
            <div class="flex flex-col gap-2">
              <v-switch
                v-model="form.is_service"
                label="Es un servicio (sin control de stock)"
                color="indigo"
                density="compact"
                class="dark-switch"
              />
              <v-switch
                v-model="form.enabled"
                label="Activo"
                color="indigo"
                density="compact"
                class="dark-switch"
              />
            </div>

            <p v-if="form.is_service" class="form-hint mt-4">
              <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
              Los servicios no manejan presentaciones ni control de stock.
            </p>
          </div>

          <!-- TAB: Presentaciones -->
          <div v-show="activeTab === 'presentations'">
            <template v-if="!form.is_service">
              <p class="text-xs text-zinc-500 mb-4">
                Define las unidades de medida en las que se maneja este producto. El precio se
                calcula como
                <strong>factor × precio base</strong>, pero puedes ajustarlo manualmente.
              </p>

              <div v-if="form.presentations.length === 0" class="empty-presentations">
                <v-icon size="32" class="text-zinc-600 mb-2">mdi-format-list-bulleted-type</v-icon>
                <p class="text-sm text-zinc-500">
                  No hay presentaciones. Agrega al menos una unidad de medida para este producto.
                </p>
              </div>

              <div
                v-for="(pres, index) in form.presentations"
                :key="index"
                class="presentation-row"
              >
                <div class="grid grid-cols-12 gap-3 items-start">
                  <div class="col-span-3">
                    <label class="input-label">Unidad de medida</label>
                    <DarkSelect
                      v-model="pres.measure_unit_id"
                      :options="availableUnitsFor(index)"
                      placeholder="Seleccionar"
                      class="full-width-select"
                    />
                  </div>
                  <div class="col-span-2">
                    <label class="input-label">Factor</label>
                    <v-text-field
                      v-model="pres.conversion_factor"
                      placeholder="20"
                      type="number"
                      variant="outlined"
                      class="dark-input"
                      @update:model-value="onPresentationFactorChange(index)"
                    />
                  </div>
                  <div class="col-span-3">
                    <label class="input-label">Precio venta</label>
                    <v-text-field
                      v-model="pres.sale_price"
                      placeholder="0.00"
                      type="number"
                      variant="outlined"
                      class="dark-input"
                    />
                  </div>
                  <div class="col-span-2 flex items-center justify-center pt-6">
                    <button
                      class="icon-btn"
                      :class="{ 'star-active': pres.is_default }"
                      :title="pres.is_default ? 'Presentación principal' : 'Marcar como principal'"
                      @click="setPresentationDefault(index)"
                    >
                      <v-icon size="16">{{
                        pres.is_default ? 'mdi-star' : 'mdi-star-outline'
                      }}</v-icon>
                    </button>
                  </div>
                  <div class="col-span-2 flex items-center justify-center pt-6">
                    <button
                      class="icon-btn !text-red-400 hover:!bg-red-500/10"
                      title="Eliminar presentación"
                      @click="removePresentation(index)"
                    >
                      <v-icon size="16">mdi-delete-outline</v-icon>
                    </button>
                  </div>
                </div>
              </div>

              <button class="btn-secondary mt-3" @click="addPresentation">
                <v-icon size="16" class="mr-2">mdi-plus</v-icon>
                Agregar presentación
              </button>
            </template>

            <div v-else class="empty-presentations">
              <v-icon size="40" class="text-zinc-600 mb-3">mdi-briefcase-outline</v-icon>
              <p class="text-sm text-zinc-500">Los servicios no manejan presentaciones de venta.</p>
              <p class="text-xs text-zinc-600 mt-1">
                Desmarca la opción "Es un servicio" en la pestaña anterior para habilitar este
                apartado.
              </p>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="dialogOpen = false">Cancelar</button>
          <button class="btn-primary" @click="saveItem" :disabled="saving">
            <v-progress-circular v-if="saving" indeterminate size="16" color="white" class="mr-2" />
            {{ isEditing ? 'Guardar cambios' : 'Crear' }}
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Confirmar eliminación individual -->
    <v-dialog v-model="deleteDialogOpen" max-width="400" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Confirmar eliminación</h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-warning mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert</v-icon>
            <span
              ><strong>Advertencia:</strong> Se eliminarán también las presentaciones y el stock
              asociado a este producto.</span
            >
          </div>
          <p class="text-sm text-zinc-400">
            ¿Estás seguro de eliminar el producto
            <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteDialogOpen = false">Cancelar</button>
          <button class="btn-danger" @click="deleteItem" :disabled="deleting">
            <v-progress-circular v-if="deleting" indeterminate size="16" class="mr-2" />
            Eliminar
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Eliminar todos los productos         -->
    <!-- ============================================ -->
    <v-dialog v-model="purgeDialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400">mdi-package-remove</v-icon>
            Eliminar todos los productos
          </h3>
          <button class="icon-btn" @click="cancelPurge">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert-octagon</v-icon>
            <span
              ><strong>Peligro extremo:</strong> Se eliminarán <strong>TODOS</strong> los productos,
              sus presentaciones, el stock asociado y los movimientos de inventario. Todo se perderá
              permanentemente.</span
            >
          </div>
          <p class="text-sm text-zinc-400 mb-2">
            Los IDs de productos y presentaciones se reiniciarán desde 1.
          </p>
          <p class="text-xs text-zinc-500">
            Esta acción es irreversible. Asegúrate de haber exportado los datos si los necesitas.
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="cancelPurge">Cancelar</button>
          <button
            class="btn-danger"
            @click="executePurge"
            :disabled="purgeCountdown > 0 || purging"
          >
            <v-progress-circular v-if="purging" indeterminate size="16" class="mr-2" />
            {{ purgeCountdown > 0 ? `Espera ${purgeCountdown}s...` : 'Eliminar todo' }}
          </button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '@/utils/axios'
import { useTable } from '@/composables/useTable'
import TablePagination from '@/components/TablePagination.vue'
import DarkSelect from '@/components/DarkSelect.vue'

const API_URL = 'inventory/products/'
const CATEGORIES_URL = 'configuration/categories/enabled/?category_type=PRODUCT'
const UNITS_URL = 'configuration/measure-units/enabled/'

// ===== Opciones de filtros =====
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' }
]

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
  changePageSize
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'name',
  defaultFilters: { category: '', enabled: '' }
})

// ===== Tabs del formulario =====
const tabs = [
  { id: 'general', label: 'General', icon: 'mdi-package-variant' },
  { id: 'pricing', label: 'Precios y opciones', icon: 'mdi-cash-multiple' },
  { id: 'presentations', label: 'Presentaciones', icon: 'mdi-format-list-bulleted-type' }
]
const activeTab = ref('general')

// ===== Estado: Crear/Editar =====
const dialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

// ===== Estado: Eliminar individual =====
const deleteDialogOpen = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)

// ===== Estado: Eliminar todos (Purge) =====
const purgeDialogOpen = ref(false)
const purging = ref(false)
const purgeCountdown = ref(0)
let purgeTimer = null

const categoryOptions = ref([])
const unitOptions = ref([])

const emptyForm = () => ({
  name: '',
  sku: '',
  barcode: '',
  category_id: '',
  cost_price: '',
  sale_price: '',
  min_stock: 0,
  is_service: false,
  enabled: true,
  presentations: []
})

const form = ref(emptyForm())
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Selección múltiple para etiquetas (solo página actual) =====
const selectedProductIds = ref([])
const generatingLabels = ref(false)

const allSelected = computed(() => {
  return (
    items.value.length > 0 && items.value.every(item => selectedProductIds.value.includes(item.id))
  )
})

const someSelected = computed(() => {
  return items.value.some(item => selectedProductIds.value.includes(item.id))
})

// Limpiar selección cuando cambia la paginación, búsqueda, orden o filtros
watch(
  [page, pageSize, search, ordering, () => filters.value.category, () => filters.value.enabled],
  () => {
    selectedProductIds.value = []
  }
)

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedProductIds.value = []
  } else {
    selectedProductIds.value = items.value.map(item => item.id)
  }
}

const toggleProductSelection = productId => {
  const index = selectedProductIds.value.indexOf(productId)
  if (index === -1) {
    selectedProductIds.value.push(productId)
  } else {
    selectedProductIds.value.splice(index, 1)
  }
}

const isProductSelected = productId => {
  return selectedProductIds.value.includes(productId)
}

const clearSelection = () => {
  selectedProductIds.value = []
}

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '' || filters.value.category !== '' || filters.value.enabled !== ''
})

const categoryFilterOptions = computed(() => [
  { value: '', label: 'Todas las categorías' },
  ...categoryOptions.value
])

const purgeButtonText = computed(() => {
  if (purging.value) return 'Eliminando...'
  return 'Eliminar productos'
})

const generalHasErrors = computed(() =>
  ['name', 'sku', 'category_id'].some(f => formErrors.value[f]?.length)
)
const pricingHasErrors = computed(() =>
  ['cost_price', 'sale_price'].some(f => formErrors.value[f]?.length)
)

const tabHasError = tabId => {
  if (tabId === 'general') return generalHasErrors.value
  if (tabId === 'pricing') return pricingHasErrors.value
  return false
}

const goToFirstErrorTab = () => {
  if (generalHasErrors.value) {
    activeTab.value = 'general'
    return
  }
  if (pricingHasErrors.value) {
    activeTab.value = 'pricing'
    return
  }
}

// ===== Helpers =====
const formatPrice = price => {
  const num = parseFloat(price)
  return isNaN(num) ? '—' : num.toLocaleString('es-CU', { minimumFractionDigits: 2 })
}

// ===== Cargar opciones =====
const loadCategories = async () => {
  try {
    const response = await api.get(CATEGORIES_URL)
    const data = response.data.results || response.data
    categoryOptions.value = (Array.isArray(data) ? data : []).map(c => ({
      value: c.id,
      label: c.name
    }))
  } catch (error) {
    console.error('Error cargando categorías:', error)
  }
}

const loadUnits = async () => {
  try {
    const response = await api.get(UNITS_URL)
    const data = response.data.results || response.data
    unitOptions.value = (Array.isArray(data) ? data : []).map(u => ({
      value: u.id,
      label: `${u.name} (${u.short_name})`
    }))
  } catch (error) {
    console.error('Error cargando unidades:', error)
  }
}

const availableUnitsFor = index => {
  const usedUnitIds = form.value.presentations
    .filter((_, i) => i !== index)
    .map(p => p.measure_unit_id)
    .filter(Boolean)
  return unitOptions.value.filter(u => !usedUnitIds.includes(u.value))
}

// ===== Presentaciones =====
const addPresentation = () => {
  const factor = 1
  const baseSalePrice = parseFloat(form.value.sale_price) || 0
  form.value.presentations.push({
    measure_unit_id: '',
    conversion_factor: factor,
    sale_price: factor * baseSalePrice,
    is_default: form.value.presentations.length === 0
  })
}

const removePresentation = index => {
  form.value.presentations.splice(index, 1)
}

const setPresentationDefault = index => {
  form.value.presentations.forEach((p, i) => {
    p.is_default = i === index
  })
}

const onPresentationFactorChange = index => {
  const pres = form.value.presentations[index]
  const factor = parseFloat(pres.conversion_factor) || 0
  const baseSalePrice = parseFloat(form.value.sale_price) || 0
  pres.sale_price = factor * baseSalePrice
}

const onSkuInput = value => {
  form.value.sku = value.toUpperCase()
  clearFieldError('sku')
}

// ===== Dialog: Crear/Editar =====
const openDialog = (item = null) => {
  formErrors.value = {}
  activeTab.value = 'general'

  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || '',
      category_id: item.category?.id || '',
      cost_price: item.cost_price,
      sale_price: item.sale_price,
      min_stock: item.min_stock,
      is_service: item.is_service,
      enabled: item.enabled,
      presentations: item.presentations.map(p => ({
        id: p.id,
        measure_unit_id: p.measure_unit.id,
        conversion_factor: p.conversion_factor,
        sale_price: p.sale_price,
        is_default: p.is_default
      }))
    }
  } else {
    isEditing.value = false
    form.value = emptyForm()
  }

  dialogOpen.value = true
}

// ===== Guardar =====
const saveItem = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido']
    hasErrors = true
  }
  if (!form.value.sku.trim()) {
    formErrors.value.sku = ['El SKU es requerido']
    hasErrors = true
  }
  if (!form.value.category_id) {
    formErrors.value.category_id = ['La categoría es requerida']
    hasErrors = true
  }
  if (form.value.cost_price === '' || parseFloat(form.value.cost_price) < 0) {
    formErrors.value.cost_price = ['Precio de costo inválido']
    hasErrors = true
  }
  if (form.value.sale_price === '' || parseFloat(form.value.sale_price) < 0) {
    formErrors.value.sale_price = ['Precio de venta inválido']
    hasErrors = true
  }

  if (!form.value.is_service) {
    if (form.value.presentations.length === 0) {
      showSnackbar('Agrega al menos una presentación para el producto', 'error')
      hasErrors = true
      activeTab.value = 'presentations'
    } else {
      for (const pres of form.value.presentations) {
        if (!pres.measure_unit_id) {
          showSnackbar('Todas las presentaciones deben tener una unidad de medida', 'error')
          hasErrors = true
          activeTab.value = 'presentations'
          break
        }
        if (!pres.conversion_factor || parseFloat(pres.conversion_factor) <= 0) {
          showSnackbar('El factor de conversión debe ser mayor a 0', 'error')
          hasErrors = true
          activeTab.value = 'presentations'
          break
        }
      }
    }
  }

  if (hasErrors) {
    goToFirstErrorTab()
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      sku: form.value.sku,
      barcode: form.value.barcode,
      category_id: form.value.category_id,
      cost_price: parseFloat(form.value.cost_price),
      sale_price: parseFloat(form.value.sale_price),
      min_stock: parseFloat(form.value.min_stock) || 0,
      is_service: form.value.is_service,
      enabled: form.value.enabled,
      presentations: form.value.is_service ? [] : form.value.presentations
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Producto actualizado correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Producto creado correctamente')
    }
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    handleApiError(error)
  } finally {
    saving.value = false
  }
}

// ===== Eliminar individual =====
const confirmDelete = item => {
  itemToDelete.value = item
  deleteDialogOpen.value = true
}

const deleteItem = async () => {
  deleting.value = true
  const deletedId = itemToDelete.value?.id

  try {
    await api.delete(`${API_URL}${deletedId}/`)
    showSnackbar('Producto eliminado correctamente')
    deleteDialogOpen.value = false

    // Quitar de la selección si estaba seleccionado
    selectedProductIds.value = selectedProductIds.value.filter(id => id !== deletedId)
    itemToDelete.value = null

    if (items.value.length === 1 && page.value > 1) {
      page.value--
    } else {
      await loadData()
    }
  } catch (error) {
    handleApiError(error)
  } finally {
    deleting.value = false
  }
}

// ===== Purge: Eliminar todos los productos =====
const confirmPurge = () => {
  purgeCountdown.value = 10
  purgeDialogOpen.value = true

  purgeTimer = setInterval(() => {
    purgeCountdown.value--
    if (purgeCountdown.value <= 0) {
      clearInterval(purgeTimer)
      purgeTimer = null
    }
  }, 1000)
}

const cancelPurge = () => {
  if (purgeTimer) {
    clearInterval(purgeTimer)
    purgeTimer = null
  }
  purgeCountdown.value = 0
  purgeDialogOpen.value = false
}

const executePurge = async () => {
  purging.value = true
  try {
    const response = await api.delete(`${API_URL}purge/`)
    showSnackbar(response.data.message || 'Todos los productos eliminados correctamente')
    purgeDialogOpen.value = false

    // Limpiar selección porque ya no existen productos
    selectedProductIds.value = []

    page.value = 1
    await loadData()
  } catch (error) {
    const msg =
      error.response?.data?.error || error.response?.data?.detail || 'Error al eliminar productos'
    showSnackbar(msg, 'error')
  } finally {
    purging.value = false
  }
}

// ===== Errores =====
const handleApiError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['name', 'sku', 'category_id', 'cost_price', 'sale_price'].forEach(field => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field]) ? data[field] : [data[field]]
      }
    })

    formErrors.value = fieldErrors

    if (Object.keys(fieldErrors).length > 0) {
      goToFirstErrorTab()
    } else {
      showSnackbar(data.detail || 'Error al guardar', 'error')
    }
  } else {
    showSnackbar('Error de conexión', 'error')
  }
}

const clearFieldError = field => {
  if (formErrors.value[field]) formErrors.value[field] = []
}

const resetAll = () => {
  search.value = ''
  clearFilters()
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// ===== Generar etiquetas =====
const generateLabels = async () => {
  if (selectedProductIds.value.length === 0) {
    showSnackbar('Selecciona al menos un producto', 'warning')
    return
  }

  generatingLabels.value = true
  try {
    const response = await api.post(
      `${API_URL}generate-labels/`,
      { product_ids: selectedProductIds.value },
      { responseType: 'blob' }
    )

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const date = new Date().toISOString().slice(0, 10)
    link.setAttribute(
      'download',
      `etiquetas_productos_${selectedProductIds.value.length}_${date}.pdf`
    )

    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    showSnackbar(`${selectedProductIds.value.length} etiquetas generadas correctamente`)
  } catch (error) {
    let msg = 'Error al generar etiquetas'
    const data = error.response?.data

    // Cuando responseType es blob, los errores JSON vienen como Blob
    if (data instanceof Blob) {
      try {
        const text = await data.text()
        const json = JSON.parse(text)
        msg = json.error || json.detail || msg
      } catch (e) {
        // Si no se puede parsear, mantenemos mensaje por defecto
      }
    } else if (data?.error) {
      msg = data.error
    } else if (data?.detail) {
      msg = data.detail
    }

    showSnackbar(msg, 'error')
  } finally {
    generatingLabels.value = false
  }
}

// ===== Lifecycle =====
onMounted(() => {
  loadCategories()
  loadUnits()
  // No llamamos loadData aquí porque useTable ya hace carga inicial con watch immediate
})

onUnmounted(() => {
  if (purgeTimer) clearInterval(purgeTimer)
})
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
  max-height: 60vh;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
}

.dark-switch :deep(.v-label) {
  color: var(--text-secondary);
}

.form-tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
}

.form-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-dim);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.form-tab:hover {
  color: var(--text-secondary);
}

.form-tab-active {
  color: var(--accent-light);
  border-bottom-color: var(--accent-start);
}

.tab-error-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--error);
  margin-left: 6px;
  flex-shrink: 0;
}

.form-hint {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-faint);
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

.form-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-light);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.uppercase-input :deep(input) {
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.empty-presentations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
}

.presentation-row {
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}

.star-active {
  color: var(--warning) !important;
}
</style>

<!-- Fix para dropdowns dentro del modal -->
<style>
.product-form-dialog .dialog-card {
  overflow: visible;
}

.product-form-dialog .dialog-body {
  overflow: visible;
  max-height: 60vh;
}

.product-form-dialog .dark-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  z-index: 9999;
}

.product-form-dialog .dark-select-options {
  max-height: 200px;
}
</style>
