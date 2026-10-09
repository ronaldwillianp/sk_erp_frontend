<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Monedas</h1>
          <p class="page-subtitle">Gestiona las monedas disponibles en el sistema</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nueva moneda
          </button>
        </div>
      </div>
    </div>

    <!-- Banner: Moneda por defecto -->
    <div v-if="defaultCurrency" class="default-currency-banner mb-5">
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <p class="text-sm font-medium text-white">
            Moneda por defecto del sistema
          </p>
          <p class="text-xs text-zinc-300">
            <strong>{{ defaultCurrency.short_name }}</strong> - {{ defaultCurrency.name }}
          </p>
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
            placeholder="Buscar por nombre o código..."
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

          <!-- Filtro: Por defecto -->
          <DarkSelect
            v-model="filters.default"
            :options="defaultOptions"
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
          <v-icon size="32" color="zinc-600">mdi-currency-usd</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? "Sin resultados" : "Sin monedas registradas" }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? "No se encontraron monedas con los filtros aplicados."
              : "Aún no hay monedas en el sistema. Crea la primera para comenzar."
          }}
        </div>
        <button
          v-if="!hasActiveFilters"
          class="btn-primary mt-6"
          @click="openDialog()"
        >
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear moneda
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
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("short_name")
                    }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('name')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Nombre
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("name")
                    }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('default')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Por defecto
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("default")
                    }}</v-icon>
                  </span>
                </th>
                <th @click="toggleOrdering('enabled')" class="sortable-th">
                  <span class="inline-flex items-center">
                    Estado
                    <v-icon size="14" class="ml-1">{{
                      getOrderingIcon("enabled")
                    }}</v-icon>
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
                      <span class="text-[11px] font-bold">{{
                        item.short_name
                      }}</span>
                    </div>
                    <span class="text-sm font-mono font-semibold text-zinc-200">{{
                      item.short_name
                    }}</span>
                  </div>
                </td>
                <td class="text-sm text-zinc-300">{{ item.name }}</td>
                <td>
                  <span v-if="item.default" class="badge badge-info">
                    <v-icon size="12" class="mr-1">mdi-star</v-icon>
                    Por defecto
                  </span>
                  <span v-else class="text-zinc-600 text-xs">—</span>
                </td>
                <td>
                  <span
                    :class="[
                      'badge',
                      item.enabled ? 'badge-success' : 'badge-neutral',
                    ]"
                  >
                    {{ item.enabled ? "Activo" : "Inactivo" }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <!-- Botón de estrella: siempre visible, con estilo diferente si es default -->
                    <button
                      class="icon-btn"
                      :class="{ 'star-active': item.default }"
                      :title="item.default ? 'Moneda por defecto (activa)' : 'Establecer por defecto'"
                      @click="!item.default && setDefault(item)"
                      :disabled="item.default"
                    >
                      <v-icon size="16">{{ item.default ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
                    </button>
                    <button
                      class="icon-btn"
                      title="Editar"
                      @click="openDialog(item)"
                    >
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
        />
      </template>
    </div>

    <!-- Dialog: Crear / Editar -->
    <v-dialog v-model="dialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            {{ isEditing ? "Editar moneda" : "Nueva moneda" }}
          </h3>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <div class="mb-5">
            <label class="input-label">Código (ISO)</label>
            <v-text-field
              v-model="form.short_name"
              placeholder="Ej: USD"
              variant="outlined"
              density="comfortable"
              hide-details
              :error-messages="formErrors.short_name"
              class="dark-input uppercase-input"
              maxlength="4"
              @update:model-value="onShortNameInput"
            />
          </div>

          <div class="mb-5">
            <label class="input-label">Nombre completo</label>
            <v-text-field
              v-model="form.name"
              placeholder="Ej: Dólar estadounidense"
              variant="outlined"
              density="comfortable"
              hide-details
              :error-messages="formErrors.name"
              class="dark-input"
              @update:model-value="clearFieldError('name')"
            />
          </div>

          <div class="flex flex-col gap-2">
            <v-switch
              v-model="form.default"
              label="Moneda por defecto del sistema"
              color="indigo"
              hide-details
              density="compact"
              class="dark-switch"
            />
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
          <button class="btn-secondary" @click="dialogOpen = false">
            Cancelar
          </button>
          <button class="btn-primary" @click="saveItem" :disabled="saving">
            <v-progress-circular
              v-if="saving"
              indeterminate
              size="16"
              color="white"
              class="mr-2"
            />
            {{ isEditing ? "Guardar cambios" : "Crear" }}
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Confirmar eliminación -->
    <v-dialog v-model="deleteDialogOpen" max-width="400" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">
            Confirmar eliminación
          </h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <p class="text-sm text-zinc-400 mb-4">
            ¿Estás seguro de eliminar la moneda
            <strong class="text-zinc-200"
              >{{ itemToDelete?.name }} ({{ itemToDelete?.short_name }})</strong
            >? Esta acción no se puede deshacer.
          </p>

          <!-- Advertencia si es la moneda por defecto -->
          <div v-if="itemToDelete?.default" class="delete-warning">
            <div class="flex items-start gap-3">
              <v-icon size="20" color="error" class="mt-0.5">mdi-alert-circle</v-icon>
              <div>
                <p class="text-sm font-semibold text-error mb-1">
                  No se puede eliminar
                </p>
                <p class="text-xs text-zinc-400">
                  Esta es la moneda por defecto del sistema. Debes seleccionar otra moneda como predeterminada antes de eliminar esta.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteDialogOpen = false">
            Cancelar
          </button>
          <button
            class="btn-danger"
            @click="deleteItem"
            :disabled="deleting || itemToDelete?.default"
          >
            <v-progress-circular
              v-if="deleting"
              indeterminate
              size="16"
              class="mr-2"
            />
            Eliminar
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
import { ref, computed, onMounted } from "vue";
import api from "@/utils/axios";
import { useTable } from "@/composables/useTable";
import TablePagination from "@/components/TablePagination.vue";
import DarkSelect from "@/components/DarkSelect.vue";

const API_URL = "configuration/currencies/";

// Opciones para los filtros (con "Todos" como primer valor)
const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

const defaultOptions = [
  { value: "", label: "Todas" },
  { value: "true", label: "Por defecto" },
  { value: "false", label: "No por defecto" },
];

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
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: "name",
  defaultFilters: { enabled: "", default: "" },
});

// ===== Estado de dialogs =====
const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleting = ref(false);
const itemToDelete = ref(null);

const form = ref({ name: "", short_name: "", default: false, enabled: true });
const formErrors = ref({ name: [], short_name: [] });
const snackbar = ref({ show: false, message: "", color: "success" });

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return (
    search.value.trim() !== "" ||
    filters.value.enabled !== "" ||
    filters.value.default !== ""
  );
});

const defaultCurrency = computed(() => {
  return items.value.find((item) => item.default) || null;
});

// ===== Métodos =====
const onShortNameInput = (value) => {
  form.value.short_name = value.toUpperCase();
  clearFieldError("short_name");
};

const resetAll = () => {
  search.value = "";
  clearFilters();
};

const openDialog = (item = null) => {
  if (item) {
    isEditing.value = true;
    form.value = { ...item };
  } else {
    isEditing.value = false;
    form.value = { name: "", short_name: "", default: false, enabled: true };
  }
  formErrors.value = { name: [], short_name: [] };
  dialogOpen.value = true;
};

const saveItem = async () => {
  let hasErrors = false;
  formErrors.value = { name: [], short_name: [] };

  if (!form.value.short_name.trim()) {
    formErrors.value.short_name = ["El código es requerido"];
    hasErrors = true;
  } else if (form.value.short_name.length < 2) {
    formErrors.value.short_name = ["Mínimo 2 caracteres"];
    hasErrors = true;
  }

  if (!form.value.name.trim()) {
    formErrors.value.name = ["El nombre es requerido"];
    hasErrors = true;
  }

  if (hasErrors) return;

  saving.value = true;
  try {
    if (isEditing.value) {
      await api.put(`${API_URL}${form.value.id}/`, form.value);
      showSnackbar("Moneda actualizada correctamente");
    } else {
      await api.post(API_URL, form.value);
      showSnackbar("Moneda creada correctamente");
    }
    dialogOpen.value = false;
    await loadData();
  } catch (error) {
    handleApiError(error);
  } finally {
    saving.value = false;
  }
};

const setDefault = async (item) => {
  try {
    await api.patch(`${API_URL}${item.id}/`, { default: true });
    showSnackbar(`${item.short_name} ahora es la moneda por defecto`);
    await loadData();
  } catch (error) {
    handleApiError(error);
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
    showSnackbar("Moneda eliminada correctamente");
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
    if (data.name)
      formErrors.value.name = Array.isArray(data.name)
        ? data.name
        : [data.name];
    if (data.short_name)
      formErrors.value.short_name = Array.isArray(data.short_name)
        ? data.short_name
        : [data.short_name];

    const detail = data.detail || data.non_field_errors?.[0];
    if (!data.name && !data.short_name) {
      showSnackbar(detail || "Error al guardar", "error");
    }
  } else {
    showSnackbar("Error de conexión", "error");
  }
};

const clearFieldError = (field) => {
  if (form.value[field]?.trim()) formErrors.value[field] = [];
};

const showSnackbar = (message, color = "success") => {
  snackbar.value = { show: true, message, color };
};

onMounted(loadData);
</script>

<style scoped>
/* Banner de moneda por defecto */
.default-currency-banner {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.default-currency-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Estrella activa */
.star-active {
  color: #fbbf24 !important;
  background: rgba(251, 191, 36, 0.1) !important;
}

.star-active:hover {
  background: rgba(251, 191, 36, 0.15) !important;
  cursor: default !important;
}

/* Advertencia de eliminación */
.delete-warning {
  background: var(--error-bg);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
}

/* Dialog styles */
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

.uppercase-input :deep(input) {
  text-transform: uppercase;
  font-family: "Courier New", monospace;
  font-weight: 600;
  letter-spacing: 0.1em;
}

/* Banner de moneda por defecto (compacto) */
.default-currency-banner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 13px;
}

.banner-label {
  color: var(--text-muted);
}

.banner-value {
  color: var(--accent-light);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}
</style>