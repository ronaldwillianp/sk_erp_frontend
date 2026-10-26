<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Almacenes y puntos de venta</h1>
          <p class="page-subtitle">Gestiona las ubicaciones de stock de tu negocio</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo almacén
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
            placeholder="Buscar por nombre, código o dirección..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect v-model="filters.warehouse_type" :options="typeOptions" @change="onSearch" />
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
          <v-icon size="32" color="zinc-600">mdi-warehouse</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin almacenes registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron almacenes con los filtros aplicados.'
              : 'Aún no hay almacenes. Crea el primero para comenzar a gestionar tu stock.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear almacén
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
                <th @click="toggleOrdering('code')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Código
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('code') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('name') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('warehouse_type')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Tipo
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('warehouse_type') }}</v-icon>
                  </span>
                </th>
                <th>Ubicación</th>
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
                <td>
                  <div class="flex items-center gap-3">
                    <div class="table-avatar avatar-gradient">
                      <v-icon size="18" color="white">{{
                        getTypeIcon(item.warehouse_type)
                      }}</v-icon>
                    </div>
                    <span class="text-sm font-mono font-semibold text-zinc-200">{{
                      item.code
                    }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-zinc-200">{{ item.name }}</span>
                    <span v-if="item.is_default" class="badge badge-warning !py-0.5">
                      <v-icon size="10" class="mr-1">mdi-star</v-icon>
                      Principal
                    </span>
                  </div>
                </td>
                <td>
                  <span :class="['badge', getTypeBadge(item.warehouse_type)]">
                    {{ getTypeLabel(item.warehouse_type) }}
                  </span>
                </td>
                <td class="text-sm text-zinc-400">
                  <div v-if="item.province || item.municipality">
                    <span v-if="item.municipality">{{ item.municipality.name }}</span>
                    <span v-if="item.province" class="text-zinc-600"
                      >, {{ item.province.name }}</span
                    >
                  </div>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td>
                  <span :class="['badge', item.enabled ? 'badge-success' : 'badge-neutral']">
                    {{ item.enabled ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      class="icon-btn"
                      :class="{ 'star-active': item.is_default }"
                      :title="item.is_default ? 'Almacén principal' : 'Marcar como principal'"
                      :disabled="item.is_default"
                      @click="!item.is_default && setDefault(item)"
                    >
                      <v-icon size="16">{{
                        item.is_default ? 'mdi-star' : 'mdi-star-outline'
                      }}</v-icon>
                    </button>
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

        <TablePagination
          v-model:page="page"
          :total="total"
          :page-size="pageSize"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />
      </template>
    </div>

    <!-- Dialog: Crear / Editar -->
    <v-dialog v-model="dialogOpen" width="auto" class="dark-dialog warehouse-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar almacén' : 'Nuevo almacén' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body" style="max-height: 500px; overflow-y: auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Código</label>
              <v-text-field
                v-model="form.code"
                placeholder="Ej: ALM01"
                variant="outlined"
                :error-messages="formErrors.code"
                class="dark-input uppercase-input"
                maxlength="10"
                @update:model-value="onCodeInput"
              />
            </div>
            <div>
              <label class="input-label">Nombre</label>
              <v-text-field
                v-model="form.name"
                placeholder="Ej: Almacén Central"
                variant="outlined"
                :error-messages="formErrors.name"
                class="dark-input"
                @update:model-value="clearFieldError('name')"
              />
            </div>
          </div>

          <div class="mb-5">
            <label class="input-label">Tipo</label>
            <DarkSelect
              v-model="form.warehouse_type"
              :options="typeOptions.filter(o => o.value !== '')"
              placeholder="Seleccionar tipo"
              class="full-width-select"
            />
            <p v-if="formErrors.warehouse_type?.length" class="field-error">
              {{ formErrors.warehouse_type[0] }}
            </p>
          </div>

          <div class="mb-5">
            <label class="input-label">Dirección</label>
            <v-text-field
              v-model="form.address"
              placeholder="Ej: Calle 1 #101, Reparto Centro"
              variant="outlined"
              class="dark-input"
              prepend-inner-icon="mdi-map-marker-outline"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Provincia</label>
              <DarkSelect
                v-model="form.province_id"
                :options="provinceOptions"
                :searchable="true"
                search-placeholder="Buscar provincia..."
                placeholder="Seleccionar provincia"
                class="full-width-select"
                @change="onProvinceChange"
              />
            </div>
            <div>
              <label class="input-label">Municipio</label>
              <DarkSelect
                v-model="form.municipality_id"
                :options="municipalityOptions"
                :searchable="true"
                search-placeholder="Buscar municipio..."
                :placeholder="
                  form.province_id ? 'Seleccionar municipio' : 'Selecciona una provincia primero'
                "
                class="full-width-select"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <v-switch
              v-model="form.is_default"
              label="Almacén principal (por defecto)"
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

    <!-- Dialog: Confirmar eliminación -->
    <v-dialog v-model="deleteDialogOpen" max-width="420" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Confirmar eliminación</h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <p class="text-sm text-zinc-400">
            ¿Estás seguro de eliminar el almacén
            <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>
          <div v-if="itemToDelete?.is_default" class="alert-warning mt-4">
            <v-icon size="16" class="mr-2">mdi-alert</v-icon>
            Este es el almacén principal. Debes marcar otro como principal antes de eliminarlo.
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteDialogOpen = false">Cancelar</button>
          <button
            class="btn-danger"
            @click="deleteItem"
            :disabled="deleting || itemToDelete?.is_default"
          >
            <v-progress-circular v-if="deleting" indeterminate size="16" class="mr-2" />
            Eliminar
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
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios'
import { useTable } from '@/composables/useTable'
import TablePagination from '@/components/TablePagination.vue'
import DarkSelect from '@/components/DarkSelect.vue'

const API_URL = 'inventory/warehouses/'
const PROVINCES_URL = 'configuration/provinces/enabled/'

// ===== Opciones de filtros =====
const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'WAREHOUSE', label: 'Almacén' },
  { value: 'POINT_OF_SALE', label: 'Punto de venta' }
]

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
  defaultFilters: { warehouse_type: '', enabled: '' }
})

// ===== Estado =====
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)

const provinceOptions = ref([])
const municipalityOptions = ref([])

const form = ref({
  name: '',
  code: '',
  warehouse_type: '',
  address: '',
  province_id: '',
  municipality_id: '',
  is_default: false,
  enabled: true
})
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== '' ||
    filters.value.warehouse_type !== '' ||
    filters.value.enabled !== ''
  )
})

// ===== Helpers de tipo =====
const getTypeLabel = type => {
  const map = { WAREHOUSE: 'Almacén', POINT_OF_SALE: 'Punto de venta' }
  return map[type] || type
}

const getTypeBadge = type => {
  const map = { WAREHOUSE: 'badge-info', POINT_OF_SALE: 'badge-success' }
  return map[type] || 'badge-neutral'
}

const getTypeIcon = type => {
  const map = {
    WAREHOUSE: 'mdi-warehouse',
    POINT_OF_SALE: 'mdi-store-outline'
  }
  return map[type] || 'mdi-warehouse'
}

// ===== Cargar provincias y municipios =====
const loadProvinces = async () => {
  try {
    const response = await api.get(PROVINCES_URL)
    provinceOptions.value = response.data.map(p => ({
      value: p.id,
      label: p.name
    }))
  } catch (error) {
    console.error('Error cargando provincias:', error)
  }
}

const loadMunicipalities = async provinceId => {
  if (!provinceId) {
    municipalityOptions.value = []
    return
  }
  try {
    const response = await api.get(`configuration/provinces/${provinceId}/municipalities/`)
    municipalityOptions.value = response.data.map(m => ({
      value: m.id,
      label: m.name
    }))
  } catch (error) {
    console.error('Error cargando municipios:', error)
    municipalityOptions.value = []
  }
}

const onProvinceChange = provinceId => {
  form.value.municipality_id = ''
  loadMunicipalities(provinceId)
}

const onCodeInput = value => {
  form.value.code = value.toUpperCase()
  clearFieldError('code')
}

// ===== Dialog =====
const openDialog = async (item = null) => {
  formErrors.value = {}

  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      name: item.name,
      code: item.code,
      warehouse_type: item.warehouse_type,
      address: item.address || '',
      province_id: item.province?.id || '',
      municipality_id: item.municipality?.id || '',
      is_default: item.is_default,
      enabled: item.enabled
    }
    if (item.province?.id) {
      await loadMunicipalities(item.province.id)
    } else {
      municipalityOptions.value = []
    }
  } else {
    isEditing.value = false
    form.value = {
      name: '',
      code: '',
      warehouse_type: '',
      address: '',
      province_id: '',
      municipality_id: '',
      is_default: false,
      enabled: true
    }
    municipalityOptions.value = []
  }

  dialogOpen.value = true
}

// ===== Guardar =====
const saveItem = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.code.trim()) {
    formErrors.value.code = ['El código es requerido']
    hasErrors = true
  }
  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido']
    hasErrors = true
  }
  if (!form.value.warehouse_type) {
    formErrors.value.warehouse_type = ['Debes seleccionar un tipo']
    hasErrors = true
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      code: form.value.code,
      warehouse_type: form.value.warehouse_type,
      address: form.value.address,
      province_id: form.value.province_id || null,
      municipality_id: form.value.municipality_id || null,
      is_default: form.value.is_default,
      enabled: form.value.enabled
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Almacén actualizado correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Almacén creado correctamente')
    }
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    handleApiError(error)
  } finally {
    saving.value = false
  }
}

// ===== Marcar como default =====
const setDefault = async item => {
  try {
    await api.put(`${API_URL}${item.id}/set-default/`)
    showSnackbar(`${item.name} ahora es el almacén principal`)
    await loadData()
  } catch (error) {
    showSnackbar('Error al marcar como principal', 'error')
  }
}

// ===== Eliminar =====
const confirmDelete = item => {
  itemToDelete.value = item
  deleteDialogOpen.value = true
}

const deleteItem = async () => {
  deleting.value = true
  try {
    await api.delete(`${API_URL}${itemToDelete.value.id}/`)
    showSnackbar('Almacén eliminado correctamente')
    deleteDialogOpen.value = false

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

// ===== Errores =====
const handleApiError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['name', 'code', 'warehouse_type'].forEach(field => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field]) ? data[field] : [data[field]]
      }
    })

    formErrors.value = fieldErrors

    if (Object.keys(fieldErrors).length === 0) {
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

onMounted(() => {
  loadProvinces()
  loadData()
})
</script>

<style scoped>
.dialog-card {
  background: rgba(24, 24, 27, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  /* overflow: hidden; */
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
  height: 100%;
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

.uppercase-input :deep(input) {
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.1em;
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

/* Estrella activa (default) */
.star-active {
  color: #fbbf24 !important;
  background: rgba(251, 191, 36, 0.1) !important;
}
.star-active:hover {
  background: rgba(251, 191, 36, 0.15) !important;
  cursor: default !important;
}
</style>

<!-- Fix para dropdowns dentro del modal -->
<style>
.warehouse-dialog .dialog-card {
  overflow: visible;
}
.warehouse-dialog .dialog-body {
  overflow: visible;
  max-height: none;
}
.warehouse-dialog .dark-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  z-index: 9999;
}
.warehouse-dialog .dark-select-options {
  max-height: 200px;
}
</style>
