<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Municipios</h1>
          <p class="page-subtitle">Gestiona los municipios y su asignación a provincias</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo municipio
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar: Búsqueda + Filtros -->
    <div class="content-card !p-4 mb-5">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <!-- Búsqueda -->
        <div class="search-box flex-1 md:max-w-sm">
          <v-icon size="16" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por municipio o provincia..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <!-- Filtro: Provincia (con búsqueda) -->
          <DarkSelect
            v-model="filters.province"
            :options="provinceFilterOptions"
            :searchable="true"
            search-placeholder="Buscar provincia..."
            @change="onSearch"
          />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="content-card-flush">
      <!-- Loading -->
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando datos...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-map-marker-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin municipios registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron municipios con los filtros aplicados.'
              : 'Aún no hay municipios registrados. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear municipio
        </button>
        <button v-else class="btn-secondary mt-6" @click="resetAll">
          <v-icon size="18" class="mr-2">mdi-filter-remove-outline</v-icon>
          Limpiar filtros
        </button>
      </div>

      <!-- Table + Pagination -->
      <template v-else>
        <div class="overflow-x-auto">
          <table class="custom-table">
            <thead>
              <tr>
                <th @click="toggleOrdering('short_name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Código
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('short_name') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('name') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('province__name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Provincia
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('province__name') }}</v-icon>
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
                      <span class="text-[11px] font-bold">{{ item.short_name }}</span>
                    </div>
                    <span class="text-sm font-mono font-semibold text-zinc-200">{{
                      item.short_name
                    }}</span>
                  </div>
                </td>
                <td class="text-sm text-zinc-300">{{ item.name }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-zinc-300">{{ item.province_name }}</span>
                    <span class="province-chip">{{ item.province_short_name }}</span>
                  </div>
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

        <!-- Paginación -->
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
    <v-dialog v-model="dialogOpen" max-width="500" class="dark-dialog municipality-form-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar municipio' : 'Nuevo municipio' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-5">
            <label class="input-label">Código</label>
            <v-text-field
              v-model="form.short_name"
              placeholder="Ej: CAV"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.short_name"
              class="dark-input uppercase-input"
              maxlength="5"
              @update:model-value="onShortNameInput"
            />
          </div>

          <div class="mb-5">
            <label class="input-label">Nombre completo</label>
            <v-text-field
              v-model="form.name"
              placeholder="Ej: Ciego de Ávila"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.name"
              class="dark-input"
              @update:model-value="clearFieldError('name')"
            />
          </div>

          <div class="mb-2">
            <label class="input-label">Provincia</label>
            <DarkSelect
              v-model="form.province"
              :options="provinceOptions"
              :searchable="true"
              search-placeholder="Buscar provincia..."
              placeholder="Seleccionar provincia"
              class="full-width-select"
            />
            <p v-if="formErrors.province.length" class="field-error">
              {{ formErrors.province[0] }}
            </p>
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
    <v-dialog v-model="deleteDialogOpen" max-width="400" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Confirmar eliminación</h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <p class="text-sm text-zinc-400">
            ¿Estás seguro de eliminar el municipio
            <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong>
            de la provincia <strong class="text-zinc-200">{{ itemToDelete?.province_name }}</strong
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

const API_URL = 'configuration/municipalities/'
const PROVINCES_URL = 'configuration/provinces/enabled/'

// ===== Opciones de provincias (para filtro y formulario) =====
const provinceOptions = ref([])

const provinceFilterOptions = computed(() => [
  { value: '', label: 'Todas las provincias' },
  ...provinceOptions.value
])

// ===== Tabla (paginación + búsqueda + ordenamiento + filtros) =====
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
  changePageSize,
  changePage
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'name',
  defaultFilters: { province: '' }
})

// ===== Estado de dialogs =====
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)

const form = ref({ name: '', short_name: '', province: '' })
const formErrors = ref({ name: [], short_name: [], province: [] })
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '' || filters.value.province !== ''
})

// ===== Cargar provincias para los selects =====
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

// ===== Métodos =====
const onShortNameInput = value => {
  form.value.short_name = value.toUpperCase()
  clearFieldError('short_name')
}

const resetAll = () => {
  search.value = ''
  clearFilters()
}

const openDialog = (item = null) => {
  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      name: item.name,
      short_name: item.short_name,
      province: item.province
    }
  } else {
    isEditing.value = false
    form.value = { name: '', short_name: '', province: '' }
  }
  formErrors.value = { name: [], short_name: [], province: [] }
  dialogOpen.value = true
}

const saveItem = async () => {
  let hasErrors = false
  formErrors.value = { name: [], short_name: [], province: [] }

  if (!form.value.short_name.trim()) {
    formErrors.value.short_name = ['El código es requerido']
    hasErrors = true
  }

  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido']
    hasErrors = true
  }

  if (!form.value.province) {
    formErrors.value.province = ['Debes seleccionar una provincia']
    hasErrors = true
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      short_name: form.value.short_name,
      province: form.value.province
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Municipio actualizado correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Municipio creado correctamente')
    }
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    handleApiError(error)
  } finally {
    saving.value = false
  }
}

const confirmDelete = item => {
  itemToDelete.value = item
  deleteDialogOpen.value = true
}

const deleteItem = async () => {
  deleting.value = true
  try {
    await api.delete(`${API_URL}${itemToDelete.value.id}/`)
    showSnackbar('Municipio eliminado correctamente')
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

const handleApiError = error => {
  if (error.response?.data) {
    const data = error.response.data

    if (data.name) formErrors.value.name = Array.isArray(data.name) ? data.name : [data.name]
    if (data.short_name)
      formErrors.value.short_name = Array.isArray(data.short_name)
        ? data.short_name
        : [data.short_name]
    if (data.province)
      formErrors.value.province = Array.isArray(data.province) ? data.province : [data.province]

    // Errores de validación únicos (ej: unique_together name + province)
    const detail = data.detail || data.non_field_errors?.[0]
    if (!data.name && !data.short_name && !data.province) {
      showSnackbar(detail || 'Error al guardar', 'error')
    }
  } else {
    showSnackbar('Error de conexión', 'error')
  }
}

const clearFieldError = field => {
  if (form.value[field]?.toString().trim()) formErrors.value[field] = []
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

.uppercase-input :deep(input) {
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.1em;
}

/* Chip con el código de la provincia */
.province-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.05em;
}

/* Select a ancho completo dentro del dialog */
.full-width-select {
  width: 100%;
}

.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}

.full-width-select :deep(.dark-select-dropdown) {
  width: 100%;
}

/* Error de campo para el select de provincia */
.field-error {
  color: var(--error);
  font-size: 12px;
  margin-top: 6px;
}
</style>

<style>
/* Fix: permitir que el dropdown del DarkSelect escape del modal de Municipios */
.municipality-form-dialog .dialog-card {
  overflow: visible;
}

.municipality-form-dialog .dark-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  z-index: 9999;
}

.municipality-form-dialog .dark-select-options {
  max-height: 200px;
}
</style>
