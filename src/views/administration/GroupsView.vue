<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Grupos</h1>
          <p class="page-subtitle">Gestiona los grupos y roles del sistema</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nuevo grupo
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar: Búsqueda -->
    <div class="content-card !p-4 mb-5">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <!-- Búsqueda -->
        <div class="search-box flex-1 md:max-w-sm">
          <v-icon size="16" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por nombre..."
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
          <v-icon size="32" color="zinc-600">mdi-account-multiple-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin grupos registrados' }}
        </div>
        <div class="empty-state-text">
          {{ hasActiveFilters
            ? 'No se encontraron grupos con la búsqueda aplicada.'
            : 'Aún no hay grupos registrados. Crea el primero para comenzar a asignar roles.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear grupo
        </button>
        <button v-else class="btn-secondary mt-6" @click="resetAll">
          <v-icon size="18" class="mr-2">mdi-filter-remove-outline</v-icon>
          Limpiar búsqueda
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
                <th @click="toggleOrdering('user_count')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Usuarios
                    <v-icon size="14" class="ml-1">{{ getOrderingIcon('user_count') }}</v-icon>
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
                      <v-icon size="18" color="white">mdi-account-group-outline</v-icon>
                    </div>
                    <span class="text-sm font-medium text-zinc-200">{{ item.name }}</span>
                  </div>
                </td>
                <td>
                  <span v-if="item.user_count > 0" class="badge badge-info">
                    <v-icon size="12" class="mr-1">mdi-account-multiple</v-icon>
                    {{ item.user_count }}
                  </span>
                  <span v-else class="badge badge-neutral">
                    Sin usuarios
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
    <v-dialog v-model="dialogOpen" max-width="450" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? 'Editar grupo' : 'Nuevo grupo' }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-2">
            <label class="input-label">Nombre del grupo</label>
            <v-text-field
              v-model="form.name"
              placeholder="Ej: Administrador, Vendedor, Contador"
              variant="outlined"
              density="comfortable"
              hide-details
              :error-messages="formErrors.name"
              class="dark-input"
              prepend-inner-icon="mdi-account-group-outline"
              @update:model-value="clearFieldError('name')"
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
            ¿Estás seguro de eliminar el grupo
            <strong class="text-zinc-200">{{ itemToDelete?.name }}</strong>?
            Esta acción no se puede deshacer.
          </p>

          <!-- Advertencia si el grupo tiene usuarios -->
          <div v-if="itemToDelete?.user_count > 0" class="alert-warning mt-4">
            <v-icon size="16" class="mr-2">mdi-account-off-outline</v-icon>
            Este grupo tiene {{ itemToDelete.user_count }} usuario{{ itemToDelete.user_count !== 1 ? 's' : '' }} asociado{{ itemToDelete.user_count !== 1 ? 's' : '' }}. Serán desasociados, pero no se eliminarán.
          </div>
          <div v-else class="alert-warning mt-4">
            <v-icon size="16" class="mr-2">mdi-information-outline</v-icon>
            Este grupo no tiene usuarios asociados.
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
import { ref, computed, onMounted } from 'vue';
import api from '@/utils/axios';
import { useTable } from '@/composables/useTable';
import TablePagination from '@/components/TablePagination.vue';

const API_URL = 'administration/groups/';

// ===== Tabla (paginación + búsqueda + ordenamiento) =====
const {
  items, loading, total, page, pageSize,
  search, ordering, filters,
  loadData, toggleOrdering, getOrderingIcon,
  onSearch, clearSearch, clearFilters,
  changePageSize, changePage
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: 'name',
});

// ===== Estado de dialogs =====
const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const itemToDelete = ref(null);

const form = ref({ name: '' });
const formErrors = ref({ name: [] });
const snackbar = ref({ show: false, message: '', color: 'success' });

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '';
});

// ===== Métodos =====
const resetAll = () => {
  search.value = '';
  clearFilters();
};

const openDialog = (item = null) => {
  if (item) {
    isEditing.value = true;
    form.value = { id: item.id, name: item.name };
  } else {
    isEditing.value = false;
    form.value = { name: '' };
  }
  formErrors.value = { name: [] };
  dialogOpen.value = true;
};

const saveItem = async () => {
  let hasErrors = false;
  formErrors.value = { name: [] };

  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido'];
    hasErrors = true;
  } else if (form.value.name.trim().length < 3) {
    formErrors.value.name = ['Mínimo 3 caracteres'];
    hasErrors = true;
  }

  if (hasErrors) return;

  saving.value = true;
  try {
    const payload = { name: form.value.name.trim() };

    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, payload);
      showSnackbar('Grupo actualizado correctamente');
    } else {
      await api.post(API_URL, payload);
      showSnackbar('Grupo creado correctamente');
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
    showSnackbar('Grupo eliminado correctamente');
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

const handleApiError = (error) => {
  if (error.response?.data) {
    const data = error.response.data;

    if (data.name) {
      formErrors.value.name = Array.isArray(data.name) ? data.name : [data.name];
    }

    const detail = data.detail || data.non_field_errors?.[0];
    if (!data.name) {
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
</style>