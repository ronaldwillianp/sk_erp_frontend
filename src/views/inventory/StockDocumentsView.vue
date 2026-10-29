<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Vales de inventario</h1>
          <p class="page-subtitle">Entradas, salidas, traslados y ajustes multi-producto</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-danger" @click="confirmPurge" :disabled="!items.length || purging">
            <v-progress-circular v-if="purging" indeterminate size="16" class="mr-2" />
            <v-icon v-else size="18" class="mr-2">mdi-delete-sweep</v-icon>
            {{ purgeButtonText }}
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo vale
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
            placeholder="Buscar por número, referencia o notas..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect
            v-model="filters.document_type"
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
        <p class="text-sm text-zinc-500 mt-4">Cargando vales...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-file-document-multiple-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin vales registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron vales con los filtros aplicados.'
              : 'Aún no hay vales. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear vale
        </button>
      </div>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Almacén</th>
                <th>Proveedor / Destino</th>
                <th class="text-right">Líneas</th>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>
                  <span class="text-sm font-mono font-semibold text-zinc-200">{{
                    item.number
                  }}</span>
                </td>
                <td>
                  <span :class="['badge', getTypeBadge(item.document_type)]">
                    <v-icon size="12" class="mr-1">{{ getTypeIcon(item.document_type) }}</v-icon>
                    {{ getTypeLabel(item.document_type) }}
                  </span>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.warehouse_detail?.name || '—' }}
                </td>
                <td class="text-sm text-zinc-400">
                  <template v-if="item.document_type === 'TRANSFER'">
                    <v-icon size="12" class="mr-1">mdi-arrow-right</v-icon>
                    {{ item.destination_warehouse_detail?.name || '—' }}
                  </template>
                  <template v-else-if="item.supplier_detail">
                    {{ item.supplier_detail.name }}
                  </template>
                  <template v-else>—</template>
                </td>
                <td class="text-right">
                  <span class="badge badge-neutral">{{ item.lines?.length || 0 }}</span>
                </td>
                <td class="text-sm text-zinc-500">
                  {{ item.reference || '—' }}
                </td>
                <td class="text-sm text-zinc-400 whitespace-nowrap">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="text-sm text-zinc-500">
                  {{ item.created_by_name }}
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="icon-btn" title="Ver detalle" @click="viewDocument(item)">
                      <v-icon size="16">mdi-eye-outline</v-icon>
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

    <!-- ============================================ -->
    <!-- Dialog: Nuevo vale (con tipo dinámico)       -->
    <!-- ============================================ -->
    <v-dialog v-model="dialogOpen" max-width="1100" class="dark-dialog" persistent>
      <div class="dialog-card dialog-card-scrollable">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Nuevo vale de inventario</h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <!-- Selector de tipo -->
          <div class="mb-5">
            <label class="input-label">Tipo de vale</label>
            <div class="movement-type-selector">
              <button
                v-for="opt in documentTypeOptions"
                :key="opt.value"
                :class="['movement-type-btn', { active: form.document_type === opt.value }]"
                @click="changeDocumentType(opt.value)"
                type="button"
              >
                <v-icon size="16" class="mr-1.5">{{ opt.icon }}</v-icon>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Grid: Almacén + Destino/Proveedor -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">
                {{ form.document_type === 'TRANSFER' ? 'Almacén origen' : 'Almacén' }}
              </label>
              <DarkSelect
                v-model="form.warehouse_id"
                :options="warehouseOptions"
                placeholder="Seleccionar"
                class="full-width-select"
                :error-messages="formErrors.warehouse_id"
              />
            </div>
            <div v-if="form.document_type === 'TRANSFER'">
              <label class="input-label">Almacén destino</label>
              <DarkSelect
                v-model="form.destination_warehouse_id"
                :options="destinationWarehouseOptions"
                placeholder="Seleccionar"
                class="full-width-select"
                :error-messages="formErrors.destination_warehouse_id"
              />
            </div>
            <div v-else-if="form.document_type === 'ENTRY'">
              <label class="input-label">Proveedor (opcional)</label>
              <DarkSelect
                v-model="form.supplier_id"
                :options="supplierOptions"
                :searchable="true"
                search-placeholder="Buscar proveedor..."
                placeholder="Sin proveedor"
                class="full-width-select"
                :allow-empty="true"
              />
            </div>
          </div>

          <!-- Grid: Referencia + Notas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Referencia</label>
              <v-text-field
                v-model="form.reference"
                placeholder="Ej: FAC-2026-001, OC-123"
                variant="outlined"
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
                hide-details
                class="dark-input"
              />
            </div>
          </div>

          <!-- Líneas -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <label class="input-label !mb-0">Líneas del vale</label>
              <button class="btn-secondary !px-3 !py-1.5 !text-xs" @click="addLine">
                <v-icon size="14" class="mr-1">mdi-plus</v-icon>
                Agregar línea
              </button>
            </div>

            <div v-if="form.items.length === 0" class="empty-lines">
              <v-icon size="32" class="text-zinc-600 mb-2">mdi-format-list-bulleted-type</v-icon>
              <p class="text-sm text-zinc-500">
                No hay líneas. Agrega al menos un producto al vale.
              </p>
            </div>

            <div v-for="(line, index) in form.items" :key="index" class="document-line">
              <div class="grid grid-cols-12 gap-3 items-start">
                <!-- Producto -->
                <div class="col-span-4">
                  <label class="input-label">Producto</label>
                  <DarkSelect
                    v-model="line.product_id"
                    :options="productOptions"
                    :searchable="true"
                    search-placeholder="Buscar..."
                    placeholder="Seleccionar"
                    class="full-width-select"
                    @change="onLineProductChange(index)"
                  />
                </div>

                <!-- Presentación -->
                <div class="col-span-2">
                  <label class="input-label">Presentación</label>
                  <DarkSelect
                    v-model="line.presentation_id"
                    :options="line.presentationOptions"
                    placeholder="—"
                    class="full-width-select"
                  />
                </div>

                <!-- Cantidad -->
                <div class="col-span-2">
                  <label class="input-label">
                    Cantidad
                    <span
                      v-if="form.document_type === 'ADJUSTMENT'"
                      class="text-xs text-zinc-500 font-normal"
                      >(±)</span
                    >
                  </label>
                  <v-text-field
                    v-model="line.quantity"
                    type="number"
                    placeholder="0"
                    variant="outlined"
                    hide-details
                    class="dark-input"
                  />
                </div>

                <!-- Costo unitario (solo ENTRY y ADJUSTMENT positivo) -->
                <div v-if="showUnitCost" class="col-span-3">
                  <label class="input-label">Costo unit.</label>
                  <v-text-field
                    v-model="line.unit_cost"
                    type="number"
                    placeholder="0.00"
                    variant="outlined"
                    hide-details
                    class="dark-input"
                  />
                </div>

                <!-- Eliminar -->
                <div
                  :class="[
                    'flex items-center justify-center pt-6',
                    showUnitCost ? 'col-span-1' : 'col-span-4'
                  ]"
                >
                  <button
                    class="icon-btn !text-red-400 hover:!bg-red-500/10"
                    @click="removeLine(index)"
                  >
                    <v-icon size="16">mdi-delete-outline</v-icon>
                  </button>
                </div>
              </div>
            </div>

            <p v-if="formErrors.items" class="field-error mt-2">
              {{ formErrors.items }}
            </p>
          </div>

          <!-- Ayuda según tipo -->
          <div class="form-hint-box" :class="`form-hint-${form.document_type.toLowerCase()}`">
            <v-icon size="16" class="mr-2 flex-shrink-0">mdi-information-outline</v-icon>
            <span>{{ getTypeHint(form.document_type) }}</span>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="dialogOpen = false">Cancelar</button>
          <button class="btn-primary" @click="saveDocument" :disabled="saving">
            <v-progress-circular v-if="saving" indeterminate size="16" color="white" class="mr-2" />
            Confirmar vale
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Ver detalle                          -->
    <!-- ============================================ -->
    <v-dialog v-model="detailDialogOpen" max-width="900" class="dark-dialog">
      <div class="dialog-card dialog-card-scrollable" v-if="selectedDocument">
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">Vale {{ selectedDocument.number }}</h3>
            <p class="text-xs text-zinc-500 mt-1">
              {{ getTypeLabel(selectedDocument.document_type) }} ·
              {{ formatDate(selectedDocument.created_at) }}
            </p>
          </div>
          <button class="icon-btn" @click="detailDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <!-- Info general -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div>
              <div class="text-xs text-zinc-500 mb-1">Tipo</div>
              <span :class="['badge', getTypeBadge(selectedDocument.document_type)]">
                {{ getTypeLabel(selectedDocument.document_type) }}
              </span>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Almacén</div>
              <div class="text-sm text-zinc-200">
                {{ selectedDocument.warehouse_detail?.name || '—' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">
                {{ selectedDocument.document_type === 'TRANSFER' ? 'Destino' : 'Proveedor' }}
              </div>
              <div class="text-sm text-zinc-200">
                <template v-if="selectedDocument.document_type === 'TRANSFER'">
                  {{ selectedDocument.destination_warehouse_detail?.name || '—' }}
                </template>
                <template v-else>
                  {{ selectedDocument.supplier_detail?.name || '—' }}
                </template>
              </div>
            </div>
            <div>
              <div class="text-xs text-zinc-500 mb-1">Usuario</div>
              <div class="text-sm text-zinc-200">
                {{ selectedDocument.created_by_name }}
              </div>
            </div>
          </div>

          <div v-if="selectedDocument.reference" class="mb-4">
            <div class="text-xs text-zinc-500 mb-1">Referencia</div>
            <div class="text-sm text-zinc-200">
              {{ selectedDocument.reference }}
            </div>
          </div>

          <div v-if="selectedDocument.notes" class="mb-5 p-3 bg-zinc-900/50 rounded-lg">
            <div class="text-xs text-zinc-500 mb-1">Notas</div>
            <div class="text-sm text-zinc-300">
              {{ selectedDocument.notes }}
            </div>
          </div>

          <!-- Tabla de líneas -->
          <div class="text-sm font-semibold text-zinc-200 mb-2">Líneas del vale</div>
          <table class="custom-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Presentación</th>
                <th class="text-right">Cantidad</th>
                <th
                  v-if="
                    selectedDocument.document_type === 'ENTRY' ||
                    selectedDocument.document_type === 'ADJUSTMENT'
                  "
                  class="text-right"
                >
                  Costo unit.
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in selectedDocument.lines" :key="line.id">
                <td class="text-sm text-zinc-200">
                  <div>{{ line.product_name_snapshot || line.product_detail?.name }}</div>
                  <div class="text-xs text-zinc-500 font-mono">
                    {{ line.product_detail?.sku }}
                  </div>
                </td>
                <td class="text-sm text-zinc-400">
                  {{
                    line.presentation_name_snapshot ||
                    line.presentation_detail?.measure_unit?.short_name
                  }}
                </td>
                <td class="text-right text-sm font-mono">
                  {{ line.quantity }}
                </td>
                <td
                  v-if="
                    selectedDocument.document_type === 'ENTRY' ||
                    selectedDocument.document_type === 'ADJUSTMENT'
                  "
                  class="text-right text-sm font-mono"
                >
                  {{ formatPrice(line.unit_cost) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="detailDialogOpen = false">Cerrar</button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Confirmar vaciado total (Purge)      -->
    <!-- ============================================ -->
    <v-dialog v-model="purgeDialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400">mdi-alert-octagon</v-icon>
            Vaciar historial de vales
          </h3>
          <button class="icon-btn" @click="cancelPurge">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert-octagon</v-icon>
            <span
              ><strong>Peligro:</strong> Esta acción eliminará <strong>TODOS</strong> los vales de
              inventario y reiniciará los IDs desde 1. <br /><br />
              <strong>Nota:</strong> Esto NO restaura el stock ni borra los movimientos asociados,
              solo limpia los documentos padre.</span
            >
          </div>
          <p class="text-sm text-zinc-400 mb-2">
            Se eliminarán
            <strong class="text-zinc-200">{{ total }}</strong> vales de forma permanente.
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/utils/axios'
import { useTable } from '@/composables/useTable'
import TablePagination from '@/components/TablePagination.vue'
import DarkSelect from '@/components/DarkSelect.vue'

const API_URL = 'inventory/stock-documents/'
const PRODUCTS_URL = 'inventory/products/enabled/?is_service=false'
const WAREHOUSES_URL = 'inventory/warehouses/enabled/'
const SUPPLIERS_URL = 'inventory/suppliers/enabled/'

// ===== Opciones de tipo =====
const documentTypeOptions = [
  { value: 'ENTRY', label: 'Entrada', icon: 'mdi-package-down' },
  { value: 'EXIT', label: 'Salida', icon: 'mdi-package-up' },
  { value: 'TRANSFER', label: 'Traslado', icon: 'mdi-swap-horizontal' },
  { value: 'ADJUSTMENT', label: 'Ajuste', icon: 'mdi-tune-vertical' }
]

const typeFilterOptions = [
  { value: '', label: 'Todos los tipos' },
  ...documentTypeOptions.map(o => ({ value: o.value, label: o.label }))
]

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
  changePage,
  changePageSize
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: '-created_at',
  defaultFilters: { document_type: '', warehouse: '' }
})

// ===== Estado =====
const dialogOpen = ref(false)
const saving = ref(false)
const detailDialogOpen = ref(false)
const selectedDocument = ref(null)

const productOptions = ref([])
const warehouseOptions = ref([])
const supplierOptions = ref([])

// Estado para Purga
const purgeDialogOpen = ref(false)
const purging = ref(false)
const purgeCountdown = ref(0)
let purgeTimer = null

const emptyForm = () => ({
  document_type: 'ENTRY',
  warehouse_id: '',
  destination_warehouse_id: '',
  supplier_id: '',
  reference: '',
  notes: '',
  items: []
})

const form = ref(emptyForm())
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== '' ||
    filters.value.document_type !== '' ||
    filters.value.warehouse !== ''
  )
})

const warehouseFilterOptions = computed(() => [
  { value: '', label: 'Todos los almacenes' },
  ...warehouseOptions.value
])

const destinationWarehouseOptions = computed(() => {
  return warehouseOptions.value.filter(w => w.value !== form.value.warehouse_id)
})

const showUnitCost = computed(() => {
  return form.value.document_type === 'ENTRY' || form.value.document_type === 'ADJUSTMENT'
})

const purgeButtonText = computed(() => {
  if (purging.value) return 'Vaciando...'
  return 'Vaciar vales'
})

// ===== Helpers =====
const getTypeLabel = type => {
  const map = {
    ENTRY: 'Entrada',
    EXIT: 'Salida',
    TRANSFER: 'Traslado',
    ADJUSTMENT: 'Ajuste'
  }
  return map[type] || type
}

const getTypeBadge = type => {
  const map = {
    ENTRY: 'badge-success',
    EXIT: 'badge-warning',
    TRANSFER: 'badge-info',
    ADJUSTMENT: 'badge-neutral'
  }
  return map[type] || 'badge-neutral'
}

const getTypeIcon = type => {
  const map = {
    ENTRY: 'mdi-package-down',
    EXIT: 'mdi-package-up',
    TRANSFER: 'mdi-swap-horizontal',
    ADJUSTMENT: 'mdi-tune-vertical'
  }
  return map[type] || 'mdi-help-circle-outline'
}

const getTypeHint = type => {
  const hints = {
    ENTRY: 'Se sumará la cantidad al stock del almacén y se calculará el costo promedio.',
    EXIT: 'Se descontará la cantidad del stock. Verifica disponibilidad antes de confirmar.',
    TRANSFER: 'Se moverá el stock del almacén origen al destino. El costo se mantiene.',
    ADJUSTMENT: 'Usa valores positivos para sumar y negativos para restar stock (ej: 5 o -3).'
  }
  return hints[type] || ''
}

const formatDate = dateStr => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = price => {
  const num = parseFloat(price)
  return isNaN(num) ? '—' : num.toLocaleString('es-CU', { minimumFractionDigits: 2 })
}

// ===== Cargar opciones =====
const loadProducts = async () => {
  try {
    const response = await api.get(PRODUCTS_URL, {
      params: { page_size: 1000 }
    })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    productOptions.value = data.map(p => ({
      value: p.id,
      label: `${p.sku} - ${p.name}`
    }))
  } catch (error) {
    console.error('Error cargando productos:', error)
  }
}

const loadWarehouses = async () => {
  try {
    const response = await api.get(WAREHOUSES_URL)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    warehouseOptions.value = data.map(w => ({ value: w.id, label: w.name }))
  } catch (error) {
    console.error('Error cargando almacenes:', error)
  }
}

const loadSuppliers = async () => {
  try {
    const response = await api.get(SUPPLIERS_URL)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    supplierOptions.value = data.map(s => ({ value: s.id, label: s.name }))
  } catch (error) {
    console.error('Error cargando proveedores:', error)
  }
}

// ===== Líneas =====
const addLine = () => {
  form.value.items.push({
    product_id: '',
    presentation_id: '',
    quantity: '',
    unit_cost: '',
    presentationOptions: []
  })
}

const removeLine = index => {
  form.value.items.splice(index, 1)
}

const onLineProductChange = async index => {
  const line = form.value.items[index]
  line.presentation_id = ''
  line.presentationOptions = []

  if (!line.product_id) return

  try {
    const response = await api.get(`inventory/products/${line.product_id}/`)
    line.presentationOptions = response.data.presentations.map(p => ({
      value: p.id,
      label: `${p.measure_unit.name} (x${p.conversion_factor})`
    }))

    if (line.presentationOptions.length === 1) {
      line.presentation_id = line.presentationOptions[0].value
    }
  } catch (error) {
    console.error('Error cargando presentaciones:', error)
  }
}

const changeDocumentType = newType => {
  form.value.document_type = newType
  formErrors.value = {}
}

// ===== Dialog =====
const openDialog = () => {
  formErrors.value = {}
  form.value = emptyForm()
  addLine()
  dialogOpen.value = true
}

const viewDocument = doc => {
  selectedDocument.value = doc
  detailDialogOpen.value = true
  // DEBUG: Verifica qué hay dentro de la primera línea
  if (doc.lines && doc.lines.length > 0) {
    console.log('Primera línea del vale:', doc.lines[0])
  }
}

// ===== Guardar =====
const saveDocument = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.warehouse_id) {
    formErrors.value.warehouse_id = 'Selecciona un almacén'
    hasErrors = true
  }
  if (form.value.document_type === 'TRANSFER' && !form.value.destination_warehouse_id) {
    formErrors.value.destination_warehouse_id = 'Selecciona un almacén destino'
    hasErrors = true
  }
  if (form.value.items.length === 0) {
    formErrors.value.items = 'Agrega al menos una línea al vale'
    hasErrors = true
  }

  for (let i = 0; i < form.value.items.length; i++) {
    const line = form.value.items[i]
    if (!line.product_id || !line.presentation_id) {
      formErrors.value.items = `Línea ${i + 1}: completa producto y presentación`
      hasErrors = true
      break
    }
    const qty = parseFloat(line.quantity)
    if (!line.quantity || qty === 0) {
      formErrors.value.items = `Línea ${i + 1}: la cantidad no puede ser 0 ni estar vacía`
      hasErrors = true
      break
    }
    if (form.value.document_type !== 'ADJUSTMENT' && qty < 0) {
      formErrors.value.items = `Línea ${i + 1}: la cantidad no puede ser negativa para ${getTypeLabel(form.value.document_type)}`
      hasErrors = true
      break
    }
    if (form.value.document_type === 'ENTRY') {
      const cost = parseFloat(line.unit_cost)
      if (!line.unit_cost || cost < 0) {
        formErrors.value.items = `Línea ${i + 1}: el costo unitario es requerido para entradas`
        hasErrors = true
        break
      }
    }
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      document_type: form.value.document_type,
      warehouse_id: parseInt(form.value.warehouse_id),
      reference: form.value.reference,
      notes: form.value.notes,
      items: form.value.items.map(line => ({
        product_id: parseInt(line.product_id),
        presentation_id: parseInt(line.presentation_id),
        quantity: parseFloat(line.quantity),
        unit_cost: showUnitCost.value ? parseFloat(line.unit_cost) || 0 : 0
      }))
    }

    if (form.value.document_type === 'TRANSFER') {
      payload.destination_warehouse_id = parseInt(form.value.destination_warehouse_id)
    }
    if (form.value.document_type === 'ENTRY' && form.value.supplier_id) {
      payload.supplier_id = parseInt(form.value.supplier_id)
    }

    await api.post(`${API_URL}create-with-lines/`, payload)
    showSnackbar(
      `Vale ${form.value.document_type === 'ENTRY' ? 'de entrada' : form.value.document_type === 'EXIT' ? 'de salida' : form.value.document_type === 'TRANSFER' ? 'de traslado' : 'de ajuste'} creado correctamente`
    )
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.response?.data?.items ||
      'Error al crear el vale'
    showSnackbar(Array.isArray(msg) ? msg[0] : msg, 'error')
  } finally {
    saving.value = false
  }
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// ===== Lógica de Purga =====
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
    showSnackbar(response.data.message || 'Historial de vales vaciado correctamente')
    purgeDialogOpen.value = false
    page.value = 1
    await loadData()
  } catch (error) {
    const msg = error.response?.data?.error || 'Error al vaciar los vales'
    showSnackbar(msg, 'error')
  } finally {
    purging.value = false
  }
}

onMounted(() => {
  loadData()
  loadProducts()
  loadWarehouses()
  loadSuppliers()
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

.dialog-card-scrollable {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
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

.movement-type-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.movement-type-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 12px;
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

.empty-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
}

.document-line {
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  margin-bottom: 10px;
}

.form-hint-box {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--text-secondary);
}

.form-hint-entry {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
  color: #86efac;
}

.form-hint-exit {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.form-hint-transfer {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.form-hint-adjustment {
  background: rgba(156, 163, 175, 0.06);
  border-color: rgba(156, 163, 175, 0.2);
  color: var(--text-secondary);
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
