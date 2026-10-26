<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Facturas</h1>
          <p class="page-subtitle">Gestiona las facturas de venta y su cobro</p>
        </div>
        <div class="flex gap-3">
          <button class="btn-secondary" @click="loadData">
            <v-icon size="18" class="mr-2">mdi-refresh</v-icon>
            Actualizar
          </button>
          <button class="btn-primary" @click="openDialog()">
            <v-icon size="18" class="mr-2">mdi-plus</v-icon>
            Nueva factura
          </button>
        </div>
      </div>
    </div>

    <!-- Resumen de ventas -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Ventas totales</div>
            <div class="stat-value">{{ formatPrice(summary.total_sales) }}</div>
          </div>
          <div class="stat-icon avatar-gradient">
            <v-icon size="22" color="white">mdi-cash-multiple</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Cobrado</div>
            <div class="stat-value" style="color: var(--success)">
              {{ formatPrice(summary.total_paid) }}
            </div>
          </div>
          <div class="stat-icon" style="background: var(--success-bg)">
            <v-icon size="22" class="text-green-400">mdi-cash-check</v-icon>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="stat-label">Pendiente por cobrar</div>
            <div class="stat-value" style="color: var(--warning)">
              {{ formatPrice(summary.pending) }}
            </div>
          </div>
          <div class="stat-icon" style="background: var(--warning-bg)">
            <v-icon size="22" class="text-yellow-400">mdi-cash-clock</v-icon>
          </div>
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
            placeholder="Buscar por número o cliente..."
            @keyup.enter="onSearch"
          />
          <button v-if="search" class="icon-btn !w-6 !h-6" @click="clearSearch" title="Limpiar">
            <v-icon size="14">mdi-close</v-icon>
          </button>
        </div>
        <div class="flex gap-3">
          <DarkSelect v-model="filters.status" :options="statusFilterOptions" @change="onSearch" />
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="content-card-flush">
      <div v-if="loading" class="p-12 text-center">
        <v-progress-circular indeterminate color="indigo" />
        <p class="text-sm text-zinc-500 mt-4">Cargando facturas...</p>
      </div>
      <div v-else-if="!items.length" class="empty-state">
        <div class="empty-state-icon">
          <v-icon size="32" color="zinc-600">mdi-file-document-outline</v-icon>
        </div>
        <div class="empty-state-title">
          {{ hasActiveFilters ? 'Sin resultados' : 'Sin facturas registradas' }}
        </div>
        <div class="empty-state-text">
          {{
            hasActiveFilters
              ? 'No se encontraron facturas con los filtros aplicados.'
              : 'Aún no hay facturas. Crea la primera para comenzar a vender.'
          }}
        </div>
        <button v-if="!hasActiveFilters" class="btn-primary mt-6" @click="openDialog()">
          <v-icon size="18" class="mr-2">mdi-plus</v-icon>
          Crear factura
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
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vence</th>
                <th>Estado</th>
                <th class="text-right">Total</th>
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
                  <div class="text-sm font-medium text-zinc-200">
                    {{ item.customer_detail.name }}
                  </div>
                  <div class="text-xs text-zinc-500">
                    {{ item.customer_detail.email || '—' }}
                  </div>
                </td>
                <td class="text-sm text-zinc-400 whitespace-nowrap">
                  {{ formatDate(item.issue_date) }}
                </td>
                <td
                  class="text-sm whitespace-nowrap"
                  :class="isOverdue(item) ? 'text-red-400' : 'text-zinc-400'"
                >
                  {{ item.due_date ? formatDate(item.due_date) : '—' }}
                </td>
                <td>
                  <span :class="['badge', getStatusBadge(item.status)]">
                    <v-icon size="12" class="mr-1">{{ getStatusIcon(item.status) }}</v-icon>
                    {{ getStatusLabel(item.status) }}
                  </span>
                </td>
                <td class="text-right">
                  <span class="text-sm font-mono font-semibold text-zinc-200">
                    {{ formatPrice(item.total) }}
                  </span>
                </td>
                <td class="text-sm text-zinc-500">
                  {{ item.created_by_name }}
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="icon-btn" title="Ver detalle" @click="viewInvoice(item)">
                      <v-icon size="16">mdi-eye-outline</v-icon>
                    </button>

                    <!-- BORRADOR: Enviar + Cancelar + Eliminar -->
                    <template v-if="item.status === 'DRAFT'">
                      <button
                        class="icon-btn !text-blue-400 hover:!bg-blue-500/10"
                        title="Enviar"
                        @click="changeStatus(item, 'SENT')"
                      >
                        <v-icon size="16">mdi-send-outline</v-icon>
                      </button>
                      <button
                        class="icon-btn !text-orange-400 hover:!bg-orange-500/10"
                        title="Cancelar factura"
                        @click="confirmCancel(item)"
                      >
                        <v-icon size="16">mdi-cancel</v-icon>
                      </button>
                      <button
                        class="icon-btn !text-red-400 hover:!bg-red-500/10"
                        title="Eliminar factura (Admin)"
                        @click="confirmDelete(item)"
                      >
                        <v-icon size="16">mdi-delete-outline</v-icon>
                      </button>
                    </template>

                    <!-- ENVIADA / VENCIDA: Marcar pagada + Cancelar -->
                    <template v-if="item.status === 'SENT' || item.status === 'OVERDUE'">
                      <button
                        class="icon-btn !text-green-400 hover:!bg-green-500/10"
                        title="Marcar pagada"
                        @click="changeStatus(item, 'PAID')"
                      >
                        <v-icon size="16">mdi-cash-check</v-icon>
                      </button>
                      <button
                        class="icon-btn !text-orange-400 hover:!bg-orange-500/10"
                        title="Cancelar factura"
                        @click="confirmCancel(item)"
                      >
                        <v-icon size="16">mdi-cancel</v-icon>
                      </button>
                    </template>

                    <!-- PARCIAL: Marcar pagada + Cancelar -->
                    <template v-if="item.status === 'PARTIAL'">
                      <button
                        class="icon-btn !text-green-400 hover:!bg-green-500/10"
                        title="Marcar pagada"
                        @click="changeStatus(item, 'PAID')"
                      >
                        <v-icon size="16">mdi-cash-check</v-icon>
                      </button>
                      <button
                        class="icon-btn !text-orange-400 hover:!bg-orange-500/10"
                        title="Cancelar factura"
                        @click="confirmCancel(item)"
                      >
                        <v-icon size="16">mdi-cancel</v-icon>
                      </button>
                    </template>

                    <!-- PAGADA / CANCELADA: Sin acciones -->
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePagination
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changePageSize"
        />
      </template>
    </div>

    <!-- ============================================ -->
    <!-- Dialog: Nueva factura                        -->
    <!-- ============================================ -->
    <v-dialog v-model="dialogOpen" max-width="1100" class="dark-dialog" persistent>
      <div class="dialog-card dialog-card-scrollable">
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">Nueva factura</h3>
            <p class="text-xs text-zinc-500 mt-1">
              El stock se descontará automáticamente al crear la factura
            </p>
          </div>
          <button class="icon-btn" @click="dialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <!-- Grid: Cliente + Fecha emisión + Fecha vencimiento -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label class="input-label">Cliente</label>
              <DarkSelect
                v-model="form.customer_id"
                :options="customerOptions"
                :searchable="true"
                search-placeholder="Buscar cliente..."
                placeholder="Seleccionar cliente"
                class="full-width-select"
              />
              <p v-if="formErrors.customer_id" class="field-error">
                {{ formErrors.customer_id }}
              </p>
            </div>
            <div>
              <label class="input-label">Fecha de emisión</label>
              <v-text-field
                v-model="form.issue_date"
                type="date"
                variant="outlined"
                density="comfortable"
                hide-details
                class="dark-input"
              />
            </div>
            <div>
              <label class="input-label">Fecha de vencimiento</label>
              <v-text-field
                v-model="form.due_date"
                type="date"
                variant="outlined"
                density="comfortable"
                hide-details
                class="dark-input"
              />
            </div>
          </div>

          <!-- Estado inicial de la factura -->
          <div class="mb-5">
            <label class="input-label">Estado inicial</label>
            <div class="flex gap-2">
              <button
                v-for="opt in initialStatusOptions"
                :key="opt.value"
                :class="[
                  'px-3 py-1.5 rounded-md text-sm border transition-colors flex items-center gap-1.5',
                  form.initial_status === opt.value
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                ]"
                @click="form.initial_status = opt.value"
                type="button"
              >
                <v-icon size="14">{{ opt.icon }}</v-icon>
                {{ opt.label }}
              </button>
            </div>
            <p class="text-xs text-zinc-500 mt-2">
              <v-icon size="12" class="mr-1">mdi-information-outline</v-icon>
              El stock se descontará inmediatamente al crear la factura, sin importar el estado
              inicial.
            </p>
          </div>

          <!-- Selección de Almacén / PV (principal) -->
          <div class="mb-5">
            <label class="input-label">Almacén / Punto de Venta</label>
            <DarkSelect
              v-model="form.warehouse_id"
              :options="warehouseOptions"
              placeholder="Seleccionar almacén para filtrar productos..."
              class="full-width-select"
            />
            <p v-if="!form.warehouse_id" class="text-xs text-yellow-400 mt-1 flex items-center">
              <v-icon size="12" class="mr-1">mdi-alert</v-icon>
              Selecciona un almacén para ver solo los productos con existencias.
            </p>
          </div>

          <!-- Líneas de factura -->
          <div class="mb-5">
            <div class="flex items-center justify-between mb-3">
              <label class="input-label !mb-0">Líneas de la factura</label>
              <button
                class="btn-secondary !px-3 !py-1.5 !text-xs"
                @click="addLine"
                :disabled="!form.warehouse_id || productOptions.length === 0"
              >
                <v-icon size="14" class="mr-1">mdi-plus</v-icon>
                Agregar línea
              </button>
            </div>

            <!-- Mensajes de estado -->
            <div v-if="!form.warehouse_id" class="empty-lines">
              <v-icon size="32" class="text-zinc-600 mb-2">mdi-warehouse</v-icon>
              <p class="text-sm text-zinc-500">
                Selecciona un almacén arriba para ver los productos disponibles.
              </p>
            </div>
            <div v-else-if="productOptions.length === 0 && !loadingProducts" class="empty-lines">
              <v-icon size="32" class="text-zinc-600 mb-2">mdi-package-variant</v-icon>
              <p class="text-sm text-zinc-500">
                No hay productos con stock disponible en este almacén.
              </p>
            </div>
            <div v-else-if="loadingProducts" class="empty-lines">
              <v-progress-circular indeterminate color="indigo" size="24" />
              <p class="text-sm text-zinc-500 mt-2">Cargando productos del almacén...</p>
            </div>
            <div v-else-if="form.items.length === 0" class="empty-lines">
              <v-icon size="32" class="text-zinc-600 mb-2">mdi-format-list-bulleted-type</v-icon>
              <p class="text-sm text-zinc-500">
                No hay líneas. Agrega al menos un producto a la factura.
              </p>
            </div>

            <!-- Lista de líneas -->
            <div v-for="(line, index) in form.items" :key="index" class="invoice-line">
              <div class="grid grid-cols-12 gap-3 items-start">
                <!-- Producto -->
                <div class="col-span-4">
                  <label class="input-label">Producto</label>
                  <DarkSelect
                    v-model="line.product_id"
                    :options="productOptions"
                    :searchable="true"
                    search-placeholder="Buscar en este almacén..."
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
                    @change="onLinePresentationChange(index)"
                  />
                </div>
                <!-- Cantidad + Badge de stock -->
                <div class="col-span-2">
                  <label class="input-label">Cantidad</label>
                  <div class="relative">
                    <v-text-field
                      v-model="line.quantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      class="dark-input"
                      @update:model-value="calculateLineTotal(index)"
                    />
                    <div v-if="line.available_stock !== null" class="absolute -top-2 -right-2">
                      <span
                        class="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400 border border-green-500/30"
                      >
                        Stock: {{ line.available_stock }}
                      </span>
                    </div>
                  </div>
                </div>
                <!-- Precio -->
                <div class="col-span-3">
                  <label class="input-label">Precio unit.</label>
                  <v-text-field
                    v-model="line.unit_price"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    class="dark-input"
                    @update:model-value="calculateLineTotal(index)"
                  />
                </div>
                <!-- Eliminar línea -->
                <div class="col-span-1 flex items-center justify-center pt-6">
                  <button
                    class="icon-btn !text-red-400 hover:!bg-red-500/10"
                    @click="removeLine(index)"
                  >
                    <v-icon size="16">mdi-delete-outline</v-icon>
                  </button>
                </div>
              </div>
              <!-- Total de línea -->
              <div class="flex justify-end mt-2">
                <span class="text-xs text-zinc-500">
                  Total línea:
                  <strong class="text-zinc-300 font-mono">{{
                    formatPrice(line.line_total)
                  }}</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div class="mb-5">
            <label class="input-label">Notas</label>
            <v-textarea
              v-model="form.notes"
              placeholder="Términos de pago, observaciones..."
              variant="outlined"
              density="comfortable"
              hide-details
              rows="2"
              class="dark-input"
            />
          </div>

          <!-- Resumen -->
          <div class="invoice-summary">
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">Subtotal</span>
              <span class="font-mono text-zinc-200">{{ formatPrice(invoiceSubtotal) }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">Impuestos</span>
              <span class="font-mono text-zinc-200">{{ formatPrice(invoiceTax) }}</span>
            </div>
            <div class="flex justify-between pt-2 mt-2 border-t border-zinc-800">
              <span class="font-semibold text-zinc-100">TOTAL</span>
              <span class="font-mono font-bold text-lg text-indigo-400">{{
                formatPrice(invoiceTotal)
              }}</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="dialogOpen = false">Cancelar</button>
          <button class="btn-primary" @click="saveInvoice" :disabled="saving">
            <v-progress-circular v-if="saving" indeterminate size="16" color="white" class="mr-2" />
            Crear factura
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- ============================================ -->
    <!-- Dialog: Ver detalle de factura               -->
    <!-- ============================================ -->
    <v-dialog v-model="detailDialogOpen" max-width="800" class="dark-dialog">
      <div class="dialog-card dialog-card-scrollable" v-if="selectedInvoice">
        <div class="dialog-header">
          <div>
            <h3 class="text-lg font-semibold text-zinc-100">
              Factura {{ selectedInvoice.number }}
            </h3>
            <p class="text-xs text-zinc-500 mt-1">
              Emitida el {{ formatDate(selectedInvoice.issue_date) }}
            </p>
          </div>
          <button class="icon-btn" @click="detailDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="grid grid-cols-2 gap-4 mb-5">
            <div>
              <div class="text-xs text-zinc-500 mb-1">Cliente</div>
              <div class="text-sm font-medium text-zinc-200">
                {{ selectedInvoice.customer_detail.name }}
              </div>
              <div class="text-xs text-zinc-500">
                {{ selectedInvoice.customer_detail.email }}
              </div>
              <div class="text-xs text-zinc-500">
                {{ selectedInvoice.customer_detail.phone }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-zinc-500 mb-1">Estado</div>
              <span :class="['badge', getStatusBadge(selectedInvoice.status)]">
                {{ getStatusLabel(selectedInvoice.status) }}
              </span>
            </div>
          </div>
          <!-- Tabla de líneas -->
          <table class="custom-table mb-5">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Presentación</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Precio</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in selectedInvoice.items" :key="line.id">
                <!-- CAMBIAR ESTA LÍNEA: -->
                <td class="text-sm text-zinc-200">
                  {{ line.product_name_snapshot || line.product.name }}
                </td>

                <!-- Y ESTA TAMBIÉN: -->
                <td class="text-sm text-zinc-400">
                  {{ line.presentation_name_snapshot || line.presentation.measure_unit.short_name }}
                </td>

                <td class="text-right text-sm font-mono">{{ line.quantity }}</td>
                <td class="text-right text-sm font-mono">{{ formatPrice(line.unit_price) }}</td>
                <td class="text-right text-sm font-mono font-semibold">
                  {{ formatPrice(line.line_total) }}
                </td>
              </tr>
            </tbody>
          </table>  
          <div class="invoice-summary">
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">Subtotal</span>
              <span class="font-mono text-zinc-200">{{
                formatPrice(selectedInvoice.subtotal)
              }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-zinc-400">Impuestos</span>
              <span class="font-mono text-zinc-200">{{
                formatPrice(selectedInvoice.tax_total)
              }}</span>
            </div>
            <div class="flex justify-between pt-2 mt-2 border-t border-zinc-800">
              <span class="font-semibold text-zinc-100">TOTAL</span>
              <span class="font-mono font-bold text-lg text-indigo-400">{{
                formatPrice(selectedInvoice.total)
              }}</span>
            </div>
          </div>
          <div v-if="selectedInvoice.notes" class="mt-4 p-3 bg-zinc-900/50 rounded-lg">
            <div class="text-xs text-zinc-500 mb-1">Notas</div>
            <div class="text-sm text-zinc-300">{{ selectedInvoice.notes }}</div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="detailDialogOpen = false">Cerrar</button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Confirmar cancelación -->
    <v-dialog v-model="cancelDialogOpen" max-width="450" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Cancelar factura</h3>
          <button class="icon-btn" @click="cancelDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-warning mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert</v-icon>
            <span
              ><strong>Advertencia:</strong> Al cancelar la factura, el stock será
              <strong>restaurado automáticamente</strong> al inventario. La factura quedará
              registrada como <strong>Cancelada</strong>.</span
            >
          </div>
          <p class="text-sm text-zinc-400">
            ¿Cancelar la factura
            <strong class="text-zinc-200">{{ invoiceToCancel?.number }}</strong>
            de
            <strong class="text-zinc-200">{{ invoiceToCancel?.customer_detail?.name }}</strong
            >?
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="cancelDialogOpen = false">Volver</button>
          <button class="btn-danger" @click="executeCancel" :disabled="cancelling">
            <v-progress-circular v-if="cancelling" indeterminate size="16" class="mr-2" />
            Cancelar factura
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Dialog: Confirmar eliminación (Admin) -->
    <v-dialog v-model="deleteDialogOpen" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-red-400 flex items-center">
            <v-icon size="20" class="mr-2 text-red-400">mdi-alert-octagon</v-icon>
            Eliminar factura (Admin)
          </h3>
          <button class="icon-btn" @click="deleteDialogOpen = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="alert-error mb-4">
            <v-icon size="18" class="mr-2 flex-shrink-0">mdi-alert-octagon</v-icon>
            <span
              ><strong>Peligro extremo:</strong> Esta acción eliminará
              <strong>permanentemente</strong> la factura, sus líneas, los movimientos de stock
              asociados y el vale de inventario. El stock será restaurado. Esta acción
              <strong>no se puede deshacer</strong> y no dejará rastro histórico.</span
            >
          </div>
          <p class="text-sm text-zinc-400">
            ¿Eliminar definitivamente la factura
            <strong class="text-zinc-200">{{ invoiceToDelete?.number }}</strong>
            de
            <strong class="text-zinc-200">{{ invoiceToDelete?.customer_detail?.name }}</strong
            >?
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="deleteDialogOpen = false">Volver</button>
          <button class="btn-danger" @click="executeDelete" :disabled="deleting">
            <v-progress-circular v-if="deleting" indeterminate size="16" class="mr-2" />
            Eliminar definitivamente
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
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/utils/axios'
import { useTable } from '@/composables/useTable'
import TablePagination from '@/components/TablePagination.vue'
import DarkSelect from '@/components/DarkSelect.vue'

const API_URL = 'sales/invoices/'
const CUSTOMERS_URL = 'sales/customers/'
const PRODUCTS_WITH_STOCK_URL = 'inventory/products/with-stock/'
const WAREHOUSES_URL = 'inventory/warehouses/enabled/'

// ===== Opciones de estado =====
const statusOptions = {
  DRAFT: {
    label: 'Borrador',
    icon: 'mdi-file-document-edit-outline',
    badge: 'badge-neutral'
  },
  SENT: { label: 'Enviada', icon: 'mdi-send-outline', badge: 'badge-info' },
  PAID: { label: 'Pagada', icon: 'mdi-cash-check', badge: 'badge-success' },
  PARTIAL: { label: 'Parcial', icon: 'mdi-cash-half', badge: 'badge-warning' },
  OVERDUE: {
    label: 'Vencida',
    icon: 'mdi-clock-alert-outline',
    badge: 'badge-error'
  },
  CANCELLED: { label: 'Cancelada', icon: 'mdi-cancel', badge: 'badge-neutral' }
}

const statusFilterOptions = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(statusOptions).map(([value, { label }]) => ({
    value,
    label
  }))
]

const initialStatusOptions = [
  { value: 'DRAFT', label: 'Borrador', icon: 'mdi-file-document-edit-outline' },
  { value: 'SENT', label: 'Enviada', icon: 'mdi-send-outline' },
  { value: 'PAID', label: 'Pagada', icon: 'mdi-cash-check' }
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
  clearFilters,
  changePage,
  changePageSize
} = useTable({
  apiUrl: API_URL,
  defaultOrdering: '-created_at',
  defaultFilters: { status: '' }
})

// ===== Estado =====
const summary = ref(null)
const dialogOpen = ref(false)
const saving = ref(false)
const loadingProducts = ref(false)
const customerOptions = ref([])
const productOptions = ref([])
const warehouseOptions = ref([])

const detailDialogOpen = ref(false)
const selectedInvoice = ref(null)

const cancelDialogOpen = ref(false)
const cancelling = ref(false)
const invoiceToCancel = ref(null)

const deleteDialogOpen = ref(false)
const deleting = ref(false)
const invoiceToDelete = ref(null)

// Helper para formatear fecha a YYYY-MM-DD
const toISODate = date => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const emptyForm = () => {
  const today = new Date()
  const dueDate = addDays(today, 30)

  return {
    customer_id: '',
    issue_date: toISODate(today),
    due_date: toISODate(dueDate),
    warehouse_id: '',
    initial_status: 'DRAFT',
    notes: '',
    items: []
  }
}

const form = ref(emptyForm())
const formErrors = ref({})
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const hasActiveFilters = computed(() => {
  return search.value.trim() !== '' || filters.value.status !== ''
})

const invoiceSubtotal = computed(() => {
  return form.value.items.reduce((sum, line) => sum + (parseFloat(line.line_total) || 0), 0)
})

const invoiceTax = computed(() => 0)
const invoiceTotal = computed(() => invoiceSubtotal.value + invoiceTax.value)

// ===== Helpers =====
const formatPrice = price => {
  const num = parseFloat(price)
  return isNaN(num) ? '—' : num.toLocaleString('es-CU', { minimumFractionDigits: 2 })
}

const formatDate = dateStr => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getStatusLabel = status => statusOptions[status]?.label || status
const getStatusBadge = status => statusOptions[status]?.badge || 'badge-neutral'
const getStatusIcon = status => statusOptions[status]?.icon || 'mdi-help-circle-outline'

const isOverdue = item => {
  if (!item.due_date) return false
  if (['PAID', 'CANCELLED'].includes(item.status)) return false
  return new Date(item.due_date) < new Date()
}

// ===== Cargar opciones =====
const loadCustomers = async () => {
  try {
    const response = await api.get(CUSTOMERS_URL, {
      params: { page_size: 1000 }
    })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    customerOptions.value = data.map(c => ({ value: c.id, label: c.name }))
  } catch (error) {
    console.error('Error cargando clientes:', error)
  }
}

const loadProducts = async warehouseId => {
  if (!warehouseId) {
    productOptions.value = []
    return
  }

  loadingProducts.value = true
  try {
    const response = await api.get(PRODUCTS_WITH_STOCK_URL, {
      params: { warehouse: warehouseId, is_service: 'false', page_size: 1000 }
    })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []

    productOptions.value = data.map(p => ({
      value: p.id,
      label: `${p.sku} - ${p.name}`,
      presentations: p.presentations,
      warehouse_stock: p.warehouse_stock || 0
    }))
  } catch (error) {
    console.error('Error cargando productos:', error)
    productOptions.value = []
  } finally {
    loadingProducts.value = false
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

const loadSummary = async () => {
  try {
    const response = await api.get(`${API_URL}summary/`)
    summary.value = response.data
  } catch (error) {
    console.error('Error cargando resumen:', error)
  }
}

// Watcher: recargar productos cuando cambia el almacén
watch(
  () => form.value.warehouse_id,
  newWarehouseId => {
    form.value.items = []
    if (newWarehouseId) {
      loadProducts(newWarehouseId)
    } else {
      productOptions.value = []
    }
  }
)

// ===== Dialog: Crear =====
const openDialog = () => {
  formErrors.value = {}
  form.value = emptyForm()
  productOptions.value = []
  dialogOpen.value = true
}

const addLine = () => {
  form.value.items.push({
    product_id: '',
    presentation_id: '',
    quantity: '',
    unit_price: '',
    line_total: 0,
    presentationOptions: [],
    available_stock: null
  })
}

const removeLine = index => {
  form.value.items.splice(index, 1)
}

const onLineProductChange = index => {
  const line = form.value.items[index]
  line.presentation_id = ''
  line.unit_price = ''
  line.presentationOptions = []
  line.available_stock = null

  if (!line.product_id) return

  const selectedProduct = productOptions.value.find(p => p.value == line.product_id)

  if (selectedProduct && selectedProduct.presentations) {
    line.presentationOptions = selectedProduct.presentations.map(p => ({
      value: p.id,
      label: `${p.measure_unit.name} (x${p.conversion_factor})`,
      sale_price: p.sale_price
    }))

    const defaultPres =
      selectedProduct.presentations.find(p => p.is_default) || selectedProduct.presentations[0]

    if (defaultPres) {
      line.presentation_id = defaultPres.id
      line.unit_price = defaultPres.sale_price
      line.available_stock =
        selectedProduct.warehouse_stock !== undefined ? selectedProduct.warehouse_stock : 0
      calculateLineTotal(index)
    }
  }
}

const onLinePresentationChange = index => {
  const line = form.value.items[index]
  const pres = line.presentationOptions.find(p => p.value === line.presentation_id)
  if (pres) {
    line.unit_price = pres.sale_price
    calculateLineTotal(index)
  }
}

const calculateLineTotal = index => {
  const line = form.value.items[index]
  const qty = parseFloat(line.quantity) || 0
  const price = parseFloat(line.unit_price) || 0
  line.line_total = qty * price
}

// ===== Guardar factura =====
const saveInvoice = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.customer_id) {
    formErrors.value.customer_id = 'Selecciona un cliente'
    hasErrors = true
  }

  if (!form.value.warehouse_id) {
    showSnackbar('Debes seleccionar un almacén', 'error')
    hasErrors = true
  }

  if (form.value.items.length === 0) {
    showSnackbar('Agrega al menos una línea a la factura', 'error')
    hasErrors = true
  }

  for (let i = 0; i < form.value.items.length; i++) {
    const line = form.value.items[i]
    if (!line.product_id || !line.presentation_id) {
      showSnackbar(`Línea ${i + 1}: completa producto y presentación`, 'error')
      hasErrors = true
      break
    }
    if (!line.quantity || parseFloat(line.quantity) <= 0) {
      showSnackbar(`Línea ${i + 1}: la cantidad debe ser mayor a 0`, 'error')
      hasErrors = true
      break
    }
  }

  if (hasErrors) return

  saving.value = true
  try {
    const payload = {
      customer_id: parseInt(form.value.customer_id),
      issue_date: form.value.issue_date,
      due_date: form.value.due_date || null,
      status: form.value.initial_status,
      notes: form.value.notes,
      items: form.value.items.map(line => ({
        product_id: parseInt(line.product_id),
        presentation_id: parseInt(line.presentation_id),
        warehouse_id: parseInt(form.value.warehouse_id),
        quantity: parseFloat(line.quantity),
        unit_price: parseFloat(line.unit_price) || 0
      }))
    }

    await api.post(`${API_URL}create-with-items/`, payload)
    showSnackbar('Factura creada correctamente. Stock descontado.')
    dialogOpen.value = false
    await loadData()
    await loadSummary()
  } catch (error) {
    const msg =
      error.response?.data?.error || error.response?.data?.detail || 'Error al crear factura'
    showSnackbar(msg, 'error')
  } finally {
    saving.value = false
  }
}

// ===== Ver detalle =====
const viewInvoice = invoice => {
  selectedInvoice.value = invoice
  detailDialogOpen.value = true
}

// ===== Cambiar estado =====
const changeStatus = async (invoice, newStatus) => {
  try {
    await api.post(`${API_URL}${invoice.id}/change-status/`, {
      status: newStatus
    })
    showSnackbar(`Factura ${getStatusLabel(newStatus).toLowerCase()} correctamente`)
    await loadData()
    await loadSummary()
  } catch (error) {
    const msg = error.response?.data?.error || 'Error al cambiar estado'
    showSnackbar(msg, 'error')
  }
}

// ===== Cancelar factura (usuarios) =====
const confirmCancel = invoice => {
  invoiceToCancel.value = invoice
  cancelDialogOpen.value = true
}

const executeCancel = async () => {
  cancelling.value = true
  try {
    await api.post(`${API_URL}${invoiceToCancel.value.id}/change-status/`, {
      status: 'CANCELLED'
    })
    showSnackbar('Factura cancelada. Stock restaurado.')
    cancelDialogOpen.value = false
    invoiceToCancel.value = null
    await loadData()
    await loadSummary()
  } catch (error) {
    const msg = error.response?.data?.error || 'Error al cancelar factura'
    showSnackbar(msg, 'error')
  } finally {
    cancelling.value = false
  }
}

// ===== Eliminar factura (Admin) =====
const confirmDelete = invoice => {
  invoiceToDelete.value = invoice
  deleteDialogOpen.value = true
}

const executeDelete = async () => {
  deleting.value = true
  try {
    const response = await api.delete(`${API_URL}${invoiceToDelete.value.id}/`)
    const msg = response.data?.message || 'Factura eliminada correctamente. Stock restaurado.'
    showSnackbar(msg)
    deleteDialogOpen.value = false
    invoiceToDelete.value = null
    await loadData()
    await loadSummary()
  } catch (error) {
    const msg =
      error.response?.data?.error || error.response?.data?.detail || 'Error al eliminar factura'
    showSnackbar(msg, 'error')
  } finally {
    deleting.value = false
  }
}

// ===== Utilidades =====
const resetAll = () => {
  search.value = ''
  clearFilters()
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

onMounted(() => {
  loadData()
  loadSummary()
  loadCustomers()
  loadWarehouses()
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
.empty-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
}
.invoice-line {
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  margin-bottom: 12px;
}
.invoice-summary {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  max-width: 300px;
  margin-left: auto;
}
</style>
