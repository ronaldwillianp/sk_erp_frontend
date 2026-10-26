<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Proveedores</h1>
          <p class="page-subtitle">Gestiona los proveedores de tu negocio</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo proveedor
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
            placeholder="Buscar por nombre, contacto, email..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
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
          <v-icon size="32" color="zinc-600">mdi-truck-delivery-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin proveedores registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron proveedores con los filtros aplicados.'
              : 'Aún no hay proveedores. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear proveedor
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
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Provincia</th>
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
                      <v-icon size="18" color="white">mdi-truck-delivery-outline</v-icon>
                    </div>
                    <span class="text-sm font-medium text-zinc-200">{{ item.name }}</span>
                  </div>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.contact_person || '—' }}
                </td>
                <td class="text-sm text-zinc-400">
                  <div v-if="item.phone" class="flex items-center gap-2">
                    <v-icon size="14" class="text-zinc-600">mdi-phone-outline</v-icon>
                    {{ item.phone }}
                  </div>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.province?.name || '—' }}
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
    <v-dialog v-model="dialogOpen" max-width="650" class="dark-dialog supplier-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar proveedor' : 'Nuevo proveedor' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body" style="max-height: 500px; overflow-y: auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Nombre del proveedor</label>
              <v-text-field
                v-model="form.name"
                placeholder="Ej: Distribuidora El Sol"
                variant="outlined"
                :error-messages="formErrors.name"
                class="dark-input"
                prepend-inner-icon="mdi-truck-delivery-outline"
                @update:model-value="clearFieldError('name')"
              />
            </div>
            <div>
              <label class="input-label">Persona de contacto</label>
              <v-text-field
                v-model="form.contact_person"
                placeholder="Ej: Juan Pérez"
                variant="outlined"
                class="dark-input"
                prepend-inner-icon="mdi-account-outline"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label class="input-label">Email</label>
              <v-text-field
                v-model="form.email"
                placeholder="contacto@proveedor.com"
                variant="outlined"
                :error-messages="formErrors.email"
                class="dark-input"
                prepend-inner-icon="mdi-email-outline"
                @update:model-value="clearFieldError('email')"
              />
            </div>
            <div>
              <label class="input-label">Teléfono</label>
              <v-text-field
                v-model="form.phone"
                placeholder="Ej: +53 55551234"
                variant="outlined"
                class="dark-input"
                prepend-inner-icon="mdi-phone-outline"
              />
            </div>
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

          <div class="mb-5">
            <label class="input-label">Provincia</label>
            <DarkSelect
              v-model="form.province_id"
              :options="provinceOptions"
              :searchable="true"
              search-placeholder="Buscar provincia..."
              placeholder="Seleccionar provincia"
              class="full-width-select"
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
            ¿Estás seguro de eliminar el proveedor
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

const API_URL = 'inventory/suppliers/'
const PROVINCES_URL = 'configuration/provinces/enabled/'

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
  defaultFilters: { enabled: '' }
})

// ===== Estado =====
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const itemToDelete = ref(null)

const provinceOptions = ref([])

const form = ref({
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  province_id: '',
  notes: '',
  enabled: true
})
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '' || filters.value.enabled !== ''
})

// ===== Cargar provincias =====
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

// ===== Dialog =====
const openDialog = (item = null) => {
  formErrors.value = {}

  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      name: item.name,
      contact_person: item.contact_person || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      province_id: item.province?.id || '',
      notes: item.notes || '',
      enabled: item.enabled
    }
  } else {
    isEditing.value = false
    form.value = {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      province_id: '',
      notes: '',
      enabled: true
    }
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
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    formErrors.value.email = ['Email inválido']
    hasErrors = true
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      contact_person: form.value.contact_person,
      email: form.value.email,
      phone: form.value.phone,
      address: form.value.address,
      province_id: form.value.province_id || null,
      notes: form.value.notes,
      enabled: form.value.enabled
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Proveedor actualizado correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Proveedor creado correctamente')
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
    showSnackbar('Proveedor eliminado correctamente')
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

    ;['name', 'email'].forEach(field => {
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

<!-- Fix para dropdowns dentro del modal -->
<style>
.supplier-dialog .dialog-card {
  overflow: visible;
}
.supplier-dialog .dialog-body {
  overflow: visible;
  max-height: none;
}
.supplier-dialog .dark-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  z-index: 9999;
}
.supplier-dialog .dark-select-options {
  max-height: 200px;
}
</style>
