<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Categorías</h1>
          <p class="page-subtitle">Organiza tus ingresos, gastos y productos</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nueva categoría
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
            placeholder="Buscar por nombre o descripción..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect v-model="filters.category_type" :options="typeOptions" @change="onSearch" />
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
          <v-icon size="32" color="zinc-600">mdi-shape-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin categorías registradas' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron categorías con los filtros aplicados.'
              : 'Aún no hay categorías. Crea la primera para organizar tus movimientos.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear categoría
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
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('name') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('category_type')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Tipo
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('category_type') }}</v-icon>
                  </span>
                </th>
                <th>Categoría padre</th>
                <th>Subcategorías</th>
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
                      <v-icon size="18" color="white">{{ getTypeIcon(item.category_type) }}</v-icon>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-zinc-200">{{ item.name }}</div>
                      <div v-if="item.description" class="text-xs text-zinc-500">
                        {{ item.description }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['badge', getTypeBadge(item.category_type)]">
                    {{ getTypeLabel(item.category_type) }}
                  </span>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.parent?.name || '—' }}
                </td>
                <td>
                  <span v-if="item.children_count > 0" class="badge badge-neutral">
                    <v-icon size="12" class="mr-1">mdi-file-tree-outline</v-icon>
                    {{ item.children_count }}
                  </span>
                  <span v-else class="text-zinc-600 text-xs">—</span>
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
    <v-dialog v-model="dialogOpen" max-width="550" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar categoría' : 'Nueva categoría' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-5">
            <label class="input-label">Tipo de categoría</label>
            <DarkSelect
              v-model="form.category_type"
              :options="typeOptions.filter(o => o.value !== '')"
              placeholder="Seleccionar tipo"
              class="full-width-select"
              @change="onTypeChange"
            />
            <p v-if="formErrors.category_type?.length" class="field-error">
              {{ formErrors.category_type[0] }}
            </p>
          </div>

          <div class="mb-5">
            <label class="input-label">Nombre</label>
            <v-text-field
              v-model="form.name"
              placeholder="Ej: Alquiler del local"
              variant="outlined"
              :error-messages="formErrors.name"
              class="dark-input"
              @update:model-value="clearFieldError('name')"
            />
          </div>

          <div class="mb-5">
            <label class="input-label">Categoría padre (opcional)</label>
            <DarkSelect
              v-model="form.parent_id"
              :options="parentOptions"
              :searchable="true"
              search-placeholder="Buscar categoría..."
              :placeholder="
                form.category_type ? 'Sin categoría padre' : 'Selecciona un tipo primero'
              "
              class="full-width-select"
            />
            <p v-if="formErrors.parent_id?.length" class="field-error">
              {{ formErrors.parent_id[0] }}
            </p>
            <p
              v-if="form.category_type && !parentOptions.length"
              class="text-xs text-zinc-500 mt-2"
            >
              No hay categorías de este tipo para usar como padre.
            </p>
          </div>

          <div class="mb-5">
            <label class="input-label">Descripción</label>
            <v-text-field
              v-model="form.description"
              placeholder="Ej: Gastos de alquiler del local comercial"
              variant="outlined"
              class="dark-input"
            />
          </div>

          <div class="mb-2">
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
            ¿Estás seguro de eliminar la categoría
            <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong
            >? Esta acción no se puede deshacer.
          </p>
          <div v-if="itemToDelete?.children_count > 0" class="alert-warning mt-4">
            <v-icon size="16" class="mr-2">mdi-alert</v-icon>
            Esta categoría tiene {{ itemToDelete.children_count }} subcategoría(s) que también se
            eliminarán.
          </div>
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

const API_URL = 'configuration/categories/'

// ===== Opciones de filtros =====
const typeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'PRODUCT', label: 'Productos' }
]

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activas' },
  { value: 'false', label: 'Inactivas' }
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
  changePageSize,
  changePage
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'name',
  defaultFilters: { category_type: '', enabled: '' }
})

// ===== Estado =====
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)
const parentOptions = ref([])

const form = ref({ name: '', category_type: '', parent_id: '', description: '', enabled: true })
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== '' || filters.value.category_type !== '' || filters.value.enabled !== ''
  )
})

// ===== Helpers de tipo =====
const getTypeLabel = type => {
  const map = { INCOME: 'Ingreso', EXPENSE: 'Gasto', PRODUCT: 'Producto' }
  return map[type] || type
}

const getTypeBadge = type => {
  const map = { INCOME: 'badge-success', EXPENSE: 'badge-warning', PRODUCT: 'badge-info' }
  return map[type] || 'badge-neutral'
}

const getTypeIcon = type => {
  const map = {
    INCOME: 'mdi-cash-plus',
    EXPENSE: 'mdi-cash-minus',
    PRODUCT: 'mdi-package-variant'
  }
  return map[type] || 'mdi-shape-outline'
}

// ===== Cargar categorías padre (filtradas por tipo) =====
const loadParentOptions = async (categoryType, excludeId = null) => {
  if (!categoryType) {
    parentOptions.value = []
    return
  }
  try {
    let allCategories = []
    let url = `${API_URL}?category_type=${categoryType}&enabled=true`

    while (url) {
      const response = await api.get(url)
      allCategories = [...allCategories, ...response.data.results]
      url = response.data.next
    }

    // Excluir la categoría actual (al editar) para evitar que sea su propio padre
    if (excludeId) {
      allCategories = allCategories.filter(c => c.id !== excludeId)
    }

    parentOptions.value = allCategories.map(c => ({ value: c.id, label: c.name }))
  } catch (error) {
    console.error('Error cargando categorías padre:', error)
    parentOptions.value = []
  }
}

const onTypeChange = type => {
  form.value.parent_id = ''
  loadParentOptions(type, isEditing.value ? form.value.id : null)
}

// ===== Dialog =====
const openDialog = async (item = null) => {
  formErrors.value = {}

  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      name: item.name,
      category_type: item.category_type,
      parent_id: item.parent?.id || '',
      description: item.description || '',
      enabled: item.enabled
    }
    // Cargar opciones de padre del mismo tipo
    await loadParentOptions(item.category_type, item.id)
  } else {
    isEditing.value = false
    form.value = { name: '', category_type: '', parent_id: '', description: '', enabled: true }
    parentOptions.value = []
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
  if (!form.value.category_type) {
    formErrors.value.category_type = ['Debes seleccionar un tipo']
    hasErrors = true
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      category_type: form.value.category_type,
      parent_id: form.value.parent_id || null,
      description: form.value.description,
      enabled: form.value.enabled
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Categoría actualizada correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Categoría creada correctamente')
    }
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    handleApiError(error)
  } finally {
    saving.value = false
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
    showSnackbar('Categoría eliminada correctamente')
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

    ;['name', 'category_type', 'parent_id', 'description'].forEach(field => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field]) ? data[field] : [data[field]]
      }
    })

    formErrors.value = fieldErrors

    if (Object.keys(fieldErrors).length === 0) {
      showSnackbar(data.detail || data.non_field_errors?.[0] || 'Error al guardar', 'error')
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

onMounted(loadData)
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

.dark-switch :deep(.v-label) {
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
