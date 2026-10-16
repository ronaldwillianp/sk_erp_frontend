<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Importación masiva</h1>
          <p class="page-subtitle">
            Carga almacenes, proveedores y productos desde archivos CSV o Excel
          </p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="form-tabs mb-5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['form-tab', { 'form-tab-active': activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <v-icon size="16" class="mr-2">{{ tab.icon }}</v-icon>
        {{ tab.label }}
      </button>
    </div>

    <!-- Contenido del tab activo -->
    <div class="content-card">
      <div class="mb-5">
        <h2 class="text-lg font-semibold text-zinc-200 mb-1">
          {{ activeTabConfig.title }}
        </h2>
        <p class="text-sm text-zinc-500">{{ activeTabConfig.description }}</p>
      </div>

      <!-- Info de columnas -->
      <div class="columns-info mb-5">
        <div class="flex items-center mb-2">
          <v-icon size="16" class="mr-2 text-indigo-400"
            >mdi-format-columns</v-icon
          >
          <span class="text-sm font-semibold text-zinc-300"
            >Columnas requeridas:</span
          >
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="col in activeTabConfig.requiredColumns"
            :key="col"
            class="badge badge-info"
          >
            {{ col }}
          </span>
        </div>
        <p class="text-xs text-zinc-500 mt-2">
          Columnas opcionales:
          {{ activeTabConfig.optionalColumns.join(", ") || "ninguna" }}
        </p>
      </div>

      <!-- Descargar plantilla -->
      <div
        class="mb-6 p-4 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/30"
      >
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div class="text-sm font-medium text-zinc-200">
              Descargar plantilla
            </div>
            <div class="text-xs text-zinc-500">
              Usa este archivo Excel como base para tu importación
            </div>
          </div>
          <button
            class="btn-secondary"
            @click="downloadTemplate"
            :disabled="downloading"
          >
            <v-progress-circular
              v-if="downloading"
              indeterminate
              size="14"
              class="mr-2"
            />
            <v-icon v-else size="16" class="mr-2">mdi-download</v-icon>
            Descargar Excel
          </button>
        </div>
      </div>

      <!-- Subir archivo -->
      <div
        class="upload-area"
        :class="{
          'upload-area-dragging': isDragging,
          'upload-area-has-file': selectedFile,
        }"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.xlsx,.xls"
          @change="handleFileSelect"
          class="hidden"
        />
        <div
          v-if="!selectedFile"
          class="text-center cursor-pointer"
          @click="$refs.fileInput.click()"
        >
          <v-icon size="40" class="text-zinc-600 mb-2"
            >mdi-cloud-upload-outline</v-icon
          >
          <div class="text-sm text-zinc-300 mb-1">
            Arrastra tu archivo aquí o
            <span class="text-indigo-400 underline">selecciona uno</span>
          </div>
          <div class="text-xs text-zinc-500">Formatos: CSV, XLSX, XLS</div>
        </div>
        <div v-else class="flex items-center justify-between gap-3 w-full">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0"
            >
              <v-icon size="20" class="text-indigo-400">
                {{
                  selectedFile.name.endsWith(".csv")
                    ? "mdi-file-delimiter-outline"
                    : "mdi-file-excel-outline"
                }}
              </v-icon>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-zinc-200 truncate">
                {{ selectedFile.name }}
              </div>
              <div class="text-xs text-zinc-500">
                {{ formatFileSize(selectedFile.size) }}
              </div>
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button
              class="btn-secondary !px-3 !py-1.5"
              @click="$refs.fileInput.click()"
            >
              Cambiar
            </button>
            <button
              class="icon-btn !text-red-400 hover:!bg-red-500/10"
              @click="clearFile"
              title="Quitar archivo"
            >
              <v-icon size="16">mdi-close</v-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Botón importar -->
      <div class="mt-5 flex justify-end gap-3">
        <button
          class="btn-primary"
          @click="importFile"
          :disabled="!selectedFile || importing"
        >
          <v-progress-circular
            v-if="importing"
            indeterminate
            size="16"
            color="white"
            class="mr-2"
          />
          <v-icon v-else size="18" class="mr-2">mdi-upload</v-icon>
          {{ importing ? "Importando..." : "Importar datos" }}
        </button>
      </div>
    </div>

    <!-- Resultados -->
    <div v-if="result" class="content-card mt-6">
      <div class="mb-5">
        <h2 class="text-lg font-semibold text-zinc-200 mb-1">
          Resultado de la importación
        </h2>
        <p class="text-sm text-zinc-500">
          {{ result.total_rows }} filas procesadas
        </p>
      </div>

      <!-- Stats -->
      <div v-if="result.document_number" class="stat-mini stat-mini-info">
        <div class="stat-mini-label">Vale generado</div>
        <div class="stat-mini-value">{{ result.document_number }}</div>
      </div>
      <br>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div class="stat-mini">
          <div class="stat-mini-label">Total filas</div>
          <div class="stat-mini-value">{{ result.total_rows }}</div>
        </div>
        <div class="stat-mini stat-mini-success">
          <div class="stat-mini-label">Productos creados</div>
          <div class="stat-mini-value">
            {{ result.products_created ?? result.created_count ?? 0 }}
          </div>
        </div>
        <div
          v-if="result.presentations_created !== undefined"
          class="stat-mini stat-mini-info"
        >
          <div class="stat-mini-label">Presentaciones</div>
          <div class="stat-mini-value">{{ result.presentations_created }}</div>
        </div>
        <div
          v-if="result.stock_entries_created !== undefined"
          class="stat-mini stat-mini-info"
        >
          <div class="stat-mini-label">Entradas de stock</div>
          <div class="stat-mini-value">{{ result.stock_entries_created }}</div>
        </div>
        <div class="stat-mini stat-mini-error">
          <div class="stat-mini-label">Errores</div>
          <div class="stat-mini-value">{{ result.error_count }}</div>
        </div>
      </div>

      <!-- Sección creada -->
      <div
        v-if="(result.created || result.created_products || []).length"
        class="mb-5"
      >
        <h3 class="text-sm font-semibold text-green-400 mb-2 flex items-center">
          <v-icon size="16" class="mr-1">mdi-check-circle</v-icon>
          Registros creados
        </h3>
        <div class="max-h-64 overflow-y-auto rounded-lg border border-zinc-800">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Fila</th>
                <th v-if="activeTab === 'warehouses'">Código</th>
                <th v-if="activeTab === 'suppliers'">Nombre</th>
                <th v-if="activeTab === 'products'">SKU</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in result.created || result.created_products"
                :key="idx"
              >
                <td class="text-sm text-zinc-400">{{ item.row || "-" }}</td>
                <td v-if="activeTab === 'warehouses'" class="text-sm font-mono">
                  {{ item.code }}
                </td>
                <td v-if="activeTab === 'suppliers'" class="text-sm">
                  {{ item.name }}
                </td>
                <td v-if="activeTab === 'products'" class="text-sm font-mono">
                  {{ item.sku }}
                </td>
                <td class="text-sm text-zinc-400">
                  {{ item.name || item.sku || "-" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sección errores -->
      <div v-if="result.errors && result.errors.length">
        <h3 class="text-sm font-semibold text-red-400 mb-2 flex items-center">
          <v-icon size="16" class="mr-1">mdi-alert-circle</v-icon>
          Filas con errores ({{ result.errors.length }})
        </h3>
        <div class="max-h-80 overflow-y-auto rounded-lg border border-zinc-800">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Fila</th>
                <th>Campo</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(err, idx) in result.errors" :key="idx">
                <td class="text-sm text-zinc-400">{{ err.row }}</td>
                <td class="text-sm font-mono text-zinc-300">{{ err.field }}</td>
                <td class="text-sm text-red-300">{{ err.error }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

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
import { ref, computed } from "vue";
import api from "@/utils/axios";

const tabs = [
  { id: "warehouses", label: "Almacenes", icon: "mdi-warehouse" },
  { id: "suppliers", label: "Proveedores", icon: "mdi-truck-delivery-outline" },
  { id: "products", label: "Productos", icon: "mdi-package-variant" },
];

const tabsConfig = {
  warehouses: {
    title: "Importar almacenes",
    description: "Carga múltiples almacenes desde un archivo CSV o Excel.",
    requiredColumns: ["codigo", "nombre", "tipo"],
    optionalColumns: ["direccion", "provincia"],
  },
  suppliers: {
    title: "Importar proveedores",
    description: "Carga múltiples proveedores desde un archivo CSV o Excel.",
    requiredColumns: ["nombre"],
    optionalColumns: [
      "contacto",
      "email",
      "telefono",
      "direccion",
      "provincia",
      "notas",
    ],
  },
  products: {
    title: "Importar productos con presentaciones y stock inicial",
    description:
      'Carga productos, sus presentaciones y cantidades iniciales. Un producto con varias presentaciones debe aparecer en varias filas con el mismo SKU. Si una fila tiene cantidad mayor a cero, se genera una entrada de stock con referencia "Carga inicial por importación". Si algún producto falla, no se importa nada.',
    requiredColumns: [
      "sku",
      "nombre",
      "categoria",
      "um_presentacion",
      "factor",
      "precio_venta",
    ],
    optionalColumns: [
      "codigo_barras",
      "precio_costo",
      "precio_venta_base",
      "stock_minimo",
      "es_servicio",
      "descripcion",
      "es_principal",
      "cantidad",
      "almacen",
    ],
  },
};

const activeTab = ref("warehouses");
const activeTabConfig = computed(() => tabsConfig[activeTab.value]);

const fileInput = ref(null);
const selectedFile = ref(null);
const isDragging = ref(false);
const downloading = ref(false);
const importing = ref(false);
const result = ref(null);
const snackbar = ref({ show: false, message: "", color: "success" });

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    selectedFile.value = file;
    result.value = null;
  }
};

const handleDrop = (e) => {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file && /\.(csv|xlsx|xls)$/i.test(file.name)) {
    selectedFile.value = file;
    result.value = null;
  } else {
    showSnackbar("Solo se aceptan archivos CSV, XLSX o XLS", "error");
  }
};

const clearFile = () => {
  selectedFile.value = null;
  result.value = null;
  if (fileInput.value) fileInput.value.value = "";
};

const downloadTemplate = async () => {
  downloading.value = true;
  try {
    const response = await api.get(
      `inventory/import/template/${activeTab.value}/`,
      {
        responseType: "blob",
      },
    );
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla_${activeTab.value}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    showSnackbar("Plantilla descargada correctamente");
  } catch (error) {
    showSnackbar("Error al descargar la plantilla", "error");
  } finally {
    downloading.value = false;
  }
};

const importFile = async () => {
  if (!selectedFile.value) return;

  importing.value = true;
  result.value = null;

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    const response = await api.post(
      `inventory/import/${activeTab.value}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    result.value = response.data;

    const count =
      response.data.products_created ?? response.data.created_count ?? 0;
    const stockCount = response.data.stock_entries_created ?? 0;

    if (response.data.error_count > 0) {
      showSnackbar(
        `${count} registros creados, ${response.data.error_count} con errores`,
        "warning",
      );
    } else {
      let msg = `${count} registros importados correctamente`;
      if (stockCount > 0) {
        msg += ` (${stockCount} entradas de stock)`;
      }
      if (response.data.document_number) {
        msg += ` · Vale ${response.data.document_number}`;
      }
      showSnackbar(msg);
    }
  } catch (error) {
    const msg = error.response?.data?.error || "Error al importar el archivo";
    showSnackbar(msg, "error");
    if (error.response?.data?.errors) {
      result.value = error.response.data;
    }
  } finally {
    importing.value = false;
  }
};

const showSnackbar = (message, color = "success") => {
  snackbar.value = { show: true, message, color };
};
</script>

<style scoped>
/* ===== Tabs ===== */
.form-tabs {
  display: flex;
  gap: 4px;
  padding: 0 4px;
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

/* ===== Columnas info ===== */
.columns-info {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

/* ===== Upload area ===== */
.upload-area {
  border: 2px dashed var(--border-default);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.01);
}

.upload-area-dragging {
  border-color: var(--accent-start);
  background: rgba(99, 102, 241, 0.05);
}

.upload-area-has-file {
  padding: 16px;
  text-align: left;
}

.hidden {
  display: none;
}

/* ===== Mini stats ===== */
.stat-mini {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.stat-mini-success {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.05);
}

.stat-mini-error {
  border-color: rgba(244, 63, 94, 0.3);
  background: rgba(244, 63, 94, 0.05);
}

.stat-mini-info {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.05);
}

.stat-mini-label {
  font-size: 11px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-mini-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 2px;
}
</style>
