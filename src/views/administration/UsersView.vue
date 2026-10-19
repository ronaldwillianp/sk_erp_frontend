<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Usuarios</h1>
          <p class="page-subtitle">Gestiona los usuarios del sistema y sus permisos</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo usuario
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar: Búsqueda + Filtros -->
    <div class="content-card p-4! mb-5">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <div class="search-box flex-1 md:max-w-sm">
          <v-icon size="16" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por usuario, nombre, email o CI..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>

        <div class="flex gap-3">
          <DarkSelect v-model="filters.is_active" :options="statusOptions" @change="onSearch" />
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
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando datos...</p>
      </div>

      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-account-group-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin usuarios registrados' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron usuarios con los filtros aplicados.'
              : 'Aún no hay usuarios registrados. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear usuario
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
                <th @click="toggleOrdering('username')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Usuario
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('username') }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('email')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Email
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('email') }}</v-icon>
                  </span>
                </th>
                <th>Provincia</th>
                <th>Grupos</th>
                <th @click="toggleOrdering('is_active')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Estado
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('is_active') }}</v-icon>
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
                      <span class="text-xs font-semibold">{{ getInitials(item) }}</span>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-zinc-200">
                        {{ item.first_name }} {{ item.last_name }}
                      </div>
                      <div class="text-xs text-zinc-500">@{{ item.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-sm text-zinc-400">{{ item.email || '—' }}</td>
                <td class="text-sm text-zinc-400">
                  {{ item.province?.name || '—' }}
                </td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="group in item.groups.slice(0, 2)"
                      :key="group.id"
                      class="badge badge-info"
                    >
                      {{ group.name }}
                    </span>
                    <span v-if="item.groups.length > 2" class="badge badge-neutral">
                      +{{ item.groups.length - 2 }}
                    </span>
                    <span v-if="item.groups.length === 0" class="text-zinc-600 text-xs"
                      >Sin grupos</span
                    >
                  </div>
                </td>
                <td>
                  <span :class="['badge', item.is_active ? 'badge-success' : 'badge-neutral']">
                    {{ item.is_active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      class="icon-btn"
                      title="Reiniciar contraseña"
                      @click="openResetPassword(item)"
                    >
                      <v-icon size="16">mdi-key-outline</v-icon>
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

    <!-- ============================================ -->
    <!-- Dialog: Crear / Editar (con TABS)            -->
    <!-- ============================================ -->
    <v-dialog v-model="dialogOpen" max-width="800" class="dark-dialog user-form-dialog">
      <div class="dialog-card">
        <!-- Header del dialog -->
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">
              {{ isEditing ? 'Editar usuario' : 'Nuevo usuario' }}
            </h3>
            <p class="text-xs text-zinc-500 mt-1">
              {{ isEditing ? `@${form.username}` : 'Completa los datos para crear la cuenta' }}
            </p>
          </div>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <!-- Navegación de tabs -->
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

        <!-- Contenido de tabs -->
        <div class="dialog-body">
          <!-- TAB: Cuenta -->
          <div v-show="activeTab === 'account'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Nombre de usuario</label>
                <v-text-field
                  v-model="form.username"
                  placeholder="Ej: jperez"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.username"
                  class="dark-input"
                  prepend-inner-icon="mdi-account-outline"
                  @update:model-value="clearFieldError('username')"
                />
              </div>
              <div>
                <label class="input-label">Email</label>
                <v-text-field
                  v-model="form.email"
                  placeholder="usuario@ejemplo.com"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.email"
                  class="dark-input"
                  prepend-inner-icon="mdi-email-outline"
                  @update:model-value="clearFieldError('email')"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="input-label">{{
                  isEditing ? 'Nueva contraseña' : 'Contraseña'
                }}</label>
                <v-text-field
                  v-model="form.password"
                  placeholder="••••••••"
                  variant="outlined"
                  density="comfortable"
                  :type="showPassword ? 'text' : 'password'"
                  :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  @click:append-inner="showPassword = !showPassword"
                  :error-messages="formErrors.password"
                  class="dark-input"
                  prepend-inner-icon="mdi-lock-outline"
                  @update:model-value="clearFieldError('password')"
                />
              </div>
              <div>
                <label class="input-label">Confirmar contraseña</label>
                <v-text-field
                  v-model="form.confirm_password"
                  placeholder="••••••••"
                  variant="outlined"
                  density="comfortable"
                  :type="showPassword ? 'text' : 'password'"
                  :error-messages="formErrors.confirm_password"
                  class="dark-input"
                  prepend-inner-icon="mdi-lock-check-outline"
                  @update:model-value="clearFieldError('confirm_password')"
                />
              </div>
            </div>

            <p v-if="isEditing" class="form-hint mt-4">
              <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
              Deja la contraseña vacía para mantener la actual.
            </p>
          </div>

          <!-- TAB: Personal -->
          <div v-show="activeTab === 'personal'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Nombre</label>
                <v-text-field
                  v-model="form.first_name"
                  placeholder="Ej: Juan"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.first_name"
                  class="dark-input"
                  @update:model-value="clearFieldError('first_name')"
                />
              </div>
              <div>
                <label class="input-label">Apellidos</label>
                <v-text-field
                  v-model="form.last_name"
                  placeholder="Ej: Pérez Rodríguez"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.last_name"
                  class="dark-input"
                  @update:model-value="clearFieldError('last_name')"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Carné de identidad</label>
                <v-text-field
                  v-model="form.ci"
                  placeholder="Ej: 90010112345"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.ci"
                  class="dark-input"
                  maxlength="11"
                  @update:model-value="clearFieldError('ci')"
                />
              </div>
              <div>
                <label class="input-label">Contacto</label>
                <v-text-field
                  v-model="form.contact"
                  placeholder="Ej: 55551234"
                  variant="outlined"
                  density="comfortable"
                  class="dark-input"
                />
              </div>
            </div>

            <div>
              <label class="input-label">Dirección</label>
              <v-text-field
                v-model="form.address"
                placeholder="Ej: Calle 1 #101, Reparto Centro"
                variant="outlined"
                density="comfortable"
                class="dark-input"
              />
            </div>
          </div>

          <!-- TAB: Ubicación -->
          <div v-show="activeTab === 'location'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <p class="form-hint mt-4">
              <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
              La ubicación geográfica es opcional pero recomendada.
            </p>
          </div>

          <!-- TAB: Roles -->
          <div v-show="activeTab === 'roles'">
            <label class="input-label">Grupos asignados</label>
            <div v-if="groupOptions.length === 0" class="text-sm text-zinc-500 py-3">
              No hay grupos disponibles. Crea grupos en la sección de Grupos.
            </div>
            <div v-else class="groups-checkboxes">
              <label v-for="group in groupOptions" :key="group.id" class="group-checkbox">
                <input type="checkbox" :value="group.id" v-model="form.group_ids" />
                <span class="group-checkbox-label">{{ group.name }}</span>
              </label>
            </div>

            <!-- Separación con más espacio -->
            <div class="roles-divider"></div>

            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-zinc-200">Usuario activo</div>
                <div class="text-xs text-zinc-500 mt-0.5">
                  Los usuarios inactivos no pueden iniciar sesión
                </div>
              </div>
              <v-switch
                v-model="form.is_active"
                color="indigo"
                density="compact"
                class="dark-switch"
              />
            </div>
          </div>
        </div>

        <!-- Footer del dialog -->
        <div class="dialog-footer">
          <button class="btn-secondary" @click="dialogOpen = false">Cancelar</button>
          <button class="btn-primary" @click="saveItem" :disabled="saving">
            <v-progress-circular v-if="saving" indeterminate size="16" color="white" class="mr-2" />
            {{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Reiniciar contraseña -->
    <v-dialog v-model="resetPasswordDialogOpen" max-width="450" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Reiniciar contraseña</h3>
          <button class="icon-btn" @click="resetPasswordDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <p class="text-sm text-zinc-400 mb-5">
            Establecer una nueva contraseña para
            <strong class="text-zinc-200"
              >{{ userToReset?.first_name }} {{ userToReset?.last_name }}</strong
            >
            (@{{ userToReset?.username }}).
          </p>

          <div class="mb-5">
            <label class="input-label">Nueva contraseña</label>
            <v-text-field
              v-model="resetForm.new_password"
              placeholder="••••••••"
              variant="outlined"
              density="comfortable"
              :type="showResetPassword ? 'text' : 'password'"
              :append-inner-icon="showResetPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showResetPassword = !showResetPassword"
              :error-messages="resetErrors.new_password"
              class="dark-input"
              prepend-inner-icon="mdi-lock-outline"
              @update:model-value="clearResetError('new_password')"
            />
          </div>

          <div class="mb-2">
            <label class="input-label">Confirmar contraseña</label>
            <v-text-field
              v-model="resetForm.confirm_password"
              placeholder="••••••••"
              variant="outlined"
              density="comfortable"
              :type="showResetPassword ? 'text' : 'password'"
              :error-messages="resetErrors.confirm_password"
              class="dark-input"
              prepend-inner-icon="mdi-lock-check-outline"
              @update:model-value="clearResetError('confirm_password')"
            />
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="resetPasswordDialogOpen = false">Cancelar</button>
          <button class="btn-primary" @click="resetPassword" :disabled="resettingPassword">
            <v-progress-circular
              v-if="resettingPassword"
              indeterminate
              size="16"
              color="white"
              class="mr-2"
            />
            Reiniciar contraseña
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
            ¿Estás seguro de eliminar al usuario
            <strong class="text-zinc-200"
              >{{ itemToDelete?.first_name }} {{ itemToDelete?.last_name }}</strong
            >
            (@{{ itemToDelete?.username }})? Esta acción no se puede deshacer.
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

const API_URL = 'administration/users/'
const PROVINCES_URL = 'configuration/provinces/enabled/'
const GROUPS_URL = 'administration/groups/'

// ===== Opciones para selects =====
const provinceOptions = ref([])
const groupOptions = ref([])
const municipalityOptions = ref([])

const provinceFilterOptions = computed(() => [
  { value: '', label: 'Todas las provincias' },
  ...provinceOptions.value
])

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
  changePageSize,
  changePage
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'username',
  defaultFilters: { is_active: '', province: '' }
})

// ===== Tabs del formulario =====
const tabs = [
  { id: 'account', label: 'Cuenta', icon: 'mdi-account-key-outline' },
  {
    id: 'personal',
    label: 'Personal',
    icon: 'mdi-card-account-details-outline'
  },
  { id: 'location', label: 'Ubicación', icon: 'mdi-map-marker-outline' },
  { id: 'roles', label: 'Roles', icon: 'mdi-shield-account-outline' }
]
const activeTab = ref('account')

// ===== Estado de dialogs =====
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const resetPasswordDialogOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const resettingPassword = ref(false)
const showPassword = ref(false)
const showResetPassword = ref(false)
const itemToDelete = ref(null)
const userToReset = ref(null)

const emptyForm = () => ({
  username: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  email: '',
  ci: '',
  contact: '',
  address: '',
  province_id: '',
  municipality_id: '',
  group_ids: [],
  is_active: true
})

const itemss = ['foo', 'bar', 'fizz', 'buzz']

const values = ref('foo')

const form = ref(emptyForm())
const formErrors = ref({})
const resetForm = ref({ new_password: '', confirm_password: '' })
const resetErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== '' || filters.value.is_active !== '' || filters.value.province !== ''
  )
})

// Detectar errores por tab para mostrar indicadores
const accountHasErrors = computed(() =>
  ['username', 'email', 'password', 'confirm_password'].some(f => formErrors.value[f]?.length)
)
const personalHasErrors = computed(() =>
  ['first_name', 'last_name', 'ci'].some(f => formErrors.value[f]?.length)
)

const tabHasError = tabId => {
  if (tabId === 'account') return accountHasErrors.value
  if (tabId === 'personal') return personalHasErrors.value
  return false
}

// Navegar al primer tab con errores
const goToFirstErrorTab = () => {
  if (accountHasErrors.value) {
    activeTab.value = 'account'
    return
  }
  if (personalHasErrors.value) {
    activeTab.value = 'personal'
    return
  }
}

// ===== Helpers =====
const getInitials = user => {
  const first = user.first_name?.[0] || user.username?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

// ===== Cargar datos para selects =====
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

const loadAllGroups = async () => {
  try {
    let allGroups = []
    let url = GROUPS_URL
    while (url) {
      const response = await api.get(url)
      allGroups = [...allGroups, ...response.data.results]
      url = response.data.next
    }
    groupOptions.value = allGroups
  } catch (error) {
    console.error('Error cargando grupos:', error)
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

// ===== Dialog: Crear / Editar =====
const openDialog = async (item = null) => {
  formErrors.value = {}
  showPassword.value = false
  activeTab.value = 'account'

  if (item) {
    isEditing.value = true
    form.value = {
      id: item.id,
      username: item.username,
      password: '',
      confirm_password: '',
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      email: item.email || '',
      ci: item.ci || '',
      contact: item.contact || '',
      address: item.address || '',
      province_id: item.province?.id || '',
      municipality_id: item.municipality?.id || '',
      group_ids: item.groups.map(g => g.id),
      is_active: item.is_active
    }
    if (item.province?.id) {
      await loadMunicipalities(item.province.id)
    }
  } else {
    isEditing.value = false
    form.value = emptyForm()
    municipalityOptions.value = []
  }

  dialogOpen.value = true
}

const saveItem = async () => {
  formErrors.value = {}
  let hasErrors = false

  // Validaciones de Cuenta
  if (!form.value.username.trim()) {
    formErrors.value.username = ['El usuario es requerido']
    hasErrors = true
  }
  if (!form.value.email.trim()) {
    formErrors.value.email = ['El email es requerido']
    hasErrors = true
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    formErrors.value.email = ['Email inválido']
    hasErrors = true
  }

  // Validaciones de contraseña
  if (!isEditing.value) {
    if (!form.value.password) {
      formErrors.value.password = ['La contraseña es requerida']
      hasErrors = true
    } else if (form.value.password.length < 8) {
      formErrors.value.password = ['Mínimo 8 caracteres']
      hasErrors = true
    }
  } else if (form.value.password && form.value.password.length < 8) {
    formErrors.value.password = ['Mínimo 8 caracteres']
    hasErrors = true
  }

  if (form.value.password && form.value.password !== form.value.confirm_password) {
    formErrors.value.confirm_password = ['Las contraseñas no coinciden']
    hasErrors = true
  }

  // Validaciones de Personal
  if (!form.value.first_name.trim()) {
    formErrors.value.first_name = ['El nombre es requerido']
    hasErrors = true
  }
  if (!form.value.last_name.trim()) {
    formErrors.value.last_name = ['Los apellidos son requeridos']
    hasErrors = true
  }
  if (!form.value.ci.trim()) {
    formErrors.value.ci = ['El CI es requerido']
    hasErrors = true
  }

  if (hasErrors) {
    goToFirstErrorTab()
    return
  }

  saving.value = true
  try {
    const payload = {
      username: form.value.username,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      email: form.value.email,
      ci: form.value.ci,
      contact: form.value.contact,
      address: form.value.address,
      province_id: form.value.province_id || null,
      municipality_id: form.value.municipality_id || null,
      group_ids: form.value.group_ids,
      is_active: form.value.is_active
    }

    if (form.value.password) {
      payload.password = form.value.password
    }

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload)
      showSnackbar('Usuario actualizado correctamente')
    } else {
      await api.post(API_URL, payload)
      showSnackbar('Usuario creado correctamente')
    }
    dialogOpen.value = false
    await loadData()
  } catch (error) {
    handleApiError(error)
  } finally {
    saving.value = false
  }
}

// ===== Reiniciar contraseña =====
const openResetPassword = user => {
  userToReset.value = user
  resetForm.value = { new_password: '', confirm_password: '' }
  resetErrors.value = {}
  showResetPassword.value = false
  resetPasswordDialogOpen.value = true
}

const resetPassword = async () => {
  resetErrors.value = {}
  let hasErrors = false

  if (!resetForm.value.new_password) {
    resetErrors.value.new_password = ['La contraseña es requerida']
    hasErrors = true
  } else if (resetForm.value.new_password.length < 8) {
    resetErrors.value.new_password = ['Mínimo 8 caracteres']
    hasErrors = true
  }

  if (resetForm.value.new_password !== resetForm.value.confirm_password) {
    resetErrors.value.confirm_password = ['Las contraseñas no coinciden']
    hasErrors = true
  }

  if (hasErrors) return

  resettingPassword.value = true
  try {
    await api.post(`administration/initialize-password/${userToReset.value.id}/`, {
      new_password: resetForm.value.new_password,
      confirm_password: resetForm.value.confirm_password
    })
    showSnackbar(`Contraseña de ${userToReset.value.username} reiniciada`)
    resetPasswordDialogOpen.value = false
  } catch (error) {
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.non_field_errors?.[0] ||
      'Error al reiniciar contraseña'
    showSnackbar(detail, 'error')
  } finally {
    resettingPassword.value = false
  }
}

const clearResetError = field => {
  if (resetForm.value[field]) resetErrors.value[field] = []
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
    showSnackbar('Usuario eliminado correctamente')
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

// ===== Manejo de errores =====
const handleApiError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['username', 'email', 'ci', 'password', 'first_name', 'last_name'].forEach(field => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field]) ? data[field] : [data[field]]
      }
    })

    formErrors.value = fieldErrors

    // Si hay errores, navegar al tab correspondiente
    if (Object.keys(fieldErrors).length > 0) {
      goToFirstErrorTab()
    } else {
      const detail = data.detail || data.non_field_errors?.[0] || 'Error al guardar'
      showSnackbar(detail, 'error')
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
  loadAllGroups()
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

/* ===== Tabs del formulario ===== */
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

/* Hint informativo dentro del formulario */
.form-hint {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-faint);
}

/* Selects a ancho completo */
.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}

/* Checkboxes de grupos */
.groups-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px;
}

.group-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.15s ease;
}

.group-checkbox:hover {
  background: var(--bg-hover);
  border-color: var(--border-default);
}

.group-checkbox input[type='checkbox'] {
  accent-color: var(--accent-start);
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.group-checkbox-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Separador de la sección Roles con más espacio */
.roles-divider {
  height: 1px;
  background: var(--border-subtle);
  margin-top: 32px;
  margin-bottom: 28px;
}
</style>

<!-- Fix para el dropdown de provincia/municipio dentro del modal -->
<style>
.user-form-dialog .dialog-card {
  overflow: visible;
}

.user-form-dialog .dialog-body {
  overflow: visible;
  max-height: none;
}

.user-form-dialog .dark-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: 100%;
  z-index: 9999;
}

.user-form-dialog .dark-select-options {
  max-height: 200px;
}
</style>
