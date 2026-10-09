<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Métodos de pago</h1>
          <p class="page-subtitle">Gestiona los métodos de pago disponibles en el sistema</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo método
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
            placeholder="Buscar por nombre o descripción..."
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
          <!-- Filtro: Estado -->
          <DarkSelect
            v-model="filters.enabled"
            :options="statusOptions"
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
          <v-icon size="32" color="zinc-600">mdi-credit-card-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin métodos de pago' }}
        </div>
        <div class="empty-state-text">
          {{ hasActiveFilters
            ? 'No se encontraron métodos con los filtros aplicados.'
            : 'Aún no hay métodos de pago registrados. Crea el primero para comenzar.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear método de pago
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
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('name') }}</v-icon>
                  </span>
                </th>
                <th>Descripción</th>
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
                      <v-icon size="18" color="white">mdi-credit-card-outline</v-icon>
                    </div>
                    <span class="text-sm font-medium text-zinc-200">{{ item.name }}</span>
                  </div>
                </td>
                <td class="text-sm text-zinc-400">{{ item.description }}</td>
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
                    <button class="icon-btn !text-red-400 hover:!bg-red-500/10" title="Eliminar" @click="confirmDelete(item)">
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
        />
      </template>
    </div>

    <!-- Dialog: Crear / Editar -->
    <v-dialog v-model="dialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar método de pago' : 'Nuevo método de pago' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-5">
            <label class="input-label">Nombre</label>
            <v-text-field
              v-model="form.name"
              placeholder="Ej: Efectivo"
              variant="outlined"
              density="comfortable"
              hide-details
              :error-messages="formErrors.name"
              class="dark-input"
              @update:model-value="clearFieldError('name')"
            />
          </div>

          <div class="mb-5">
            <label class="input-label">Descripción</label>
            <v-text-field
              v-model="form.description"
              placeholder="Ej: Pago en efectivo al momento de la entrega"
              variant="outlined"
              density="comfortable"
              hide-details
              :error-messages="formErrors.description"
              class="dark-input"
              @update:model-value="clearFieldError('description')"
            />
          </div>

          <div class="mb-2">
            <label class="input-label mb-3">Estado</label>
            <v-switch
              v-model="form.enabled"
              label="Activo"
              color="indigo"
              hide-details
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
            ¿Estás seguro de eliminar <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong>?
            Esta acción no se puede deshacer.
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
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/axios';
import { useTable } from '@/composables/useTable';
import TablePagination from '@/components/TablePagination.vue';
import DarkSelect from '@/components/DarkSelect.vue';

const API_URL = 'configuration/payment-methods/';

// Opciones para el filtro de estado
const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

// ===== Tabla (paginación + búsqueda + ordenamiento + filtros) =====
const {
  items, loading, total, page, pageSize,
  search, ordering, filters,
  loadData, toggleOrdering, getOrderingIcon,
  onSearch, clearSearch, clearFilters,
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'name',
  defaultFilters: { enabled: '' },
});

// ===== Estado de dialogs =====
const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const itemToDelete = ref(null);

const form = ref({ name: '', description: '', enabled: true });
const formErrors = ref({ name: [], description: [] });
const snackbar = ref({ show: false, message: '', color: 'success' });

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '' || filters.value.enabled !== '';
});

// ===== Métodos =====
const resetAll = () => {
  search.value = '';
  clearFilters();
};

const openDialog = (item = null) => {
  if (item) {
    isEditing.value = true;
    form.value = { ...item };
  } else {
    isEditing.value = false;
    form.value = { name: '', description: '', enabled: true };
  }
  formErrors.value = { name: [], description: [] };
  dialogOpen.value = true;
};

const saveItem = async () => {
  let hasErrors = false;
  formErrors.value = { name: [], description: [] };

  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido'];
    hasErrors = true;
  }
  if (!form.value.description.trim()) {
    formErrors.value.description = ['La descripción es requerida'];
    hasErrors = true;
  }
  if (hasErrors) return;

  saving.value = true;
  try {
    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, form.value);
      showSnackbar('Método de pago actualizado correctamente');
    } else {
      await api.post(API_URL, form.value);
      showSnackbar('Método de pago creado correctamente');
    }
    dialogOpen.value = false;
    await loadData();
  } catch (error) {
    handleApiError(error);
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (item) => {
  itemToDelete.value = item;
  deleteDialogOpen.value = true;
};

const deleteItem = async () => {
  deleting.value = true;
  try {
    await api.delete(`${API_URL}${itemToDelete.value.id}/`);
    showSnackbar('Método de pago eliminado correctamente');
    deleteDialogOpen.value = false;

    // Si eliminamos el último item de la página, volver a la anterior
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

const handleApiError = (error) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (data.name) formErrors.value.name = Array.isArray(data.name) ? data.name : [data.name];
    if (data.description) formErrors.value.description = Array.isArray(data.description) ? data.description : [data.description];

    const detail = data.detail || data.non_field_errors?.[0];
    if (!data.name && !data.description) {
      showSnackbar(detail || 'Error al guardar', 'error');
    }
  } else {
    showSnackbar('Error de conexión', 'error');
  }
};

const clearFieldError = (field) => {
  if (form.value[field]?.trim()) formErrors.value[field] = [];
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

onMounted(loadData);
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
</style>