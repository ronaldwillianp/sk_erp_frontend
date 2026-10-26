<template>
  <div class="pos-container">
    <!-- Header del POS -->
    <div class="pos-header">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-zinc-100">
          <v-icon size="28" class="mr-2">mdi-store</v-icon>
          Punto de Venta
        </h1>

        <!-- Selector de PV (solo si tiene más de 1 asignado) -->
        <div v-if="myWarehouses.length > 1" class="flex items-center gap-2">
          <v-icon size="16" class="text-zinc-400">mdi-store-marker</v-icon>
          <DarkSelect
            v-model="selectedWarehouseId"
            :options="myWarehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))"
            @change="switchWarehouse"
            class="!w-56"
          />
        </div>

        <div v-if="currentRegister" class="flex items-center gap-2">
          <span class="badge badge-success">
            <v-icon size="12" class="mr-1">mdi-circle-medium</v-icon>
            Caja abierta
          </span>
          <span class="text-xs text-zinc-400">
            {{ currentRegister.warehouse_name }} · Apertura:
            {{ formatDateTime(currentRegister.opening_date) }}
          </span>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="badge badge-error">
            <v-icon size="12" class="mr-1">mdi-circle-medium</v-icon>
            Caja cerrada
          </span>
          <button class="btn-primary !px-3 !py-1 !text-xs" @click="openCashDialog = true">
            <v-icon size="14" class="mr-1">mdi-cash-register</v-icon>
            Abrir caja
          </button>
        </div>
      </div>

      <div class="flex gap-3">
        <button class="btn-secondary" @click="clearCart">
          <v-icon size="18" class="mr-2">mdi-delete-sweep</v-icon>
          Limpiar carrito
        </button>
        <button class="btn-secondary" @click="$router.push('/pos/cash-registers')">
          <v-icon size="18" class="mr-2">mdi-cash-register</v-icon>
          Gestionar caja
        </button>
      </div>
    </div>

    <!-- Overlay si no hay caja abierta o no hay PVs asignados -->
    <div v-if="!currentRegister" class="pos-no-register-overlay">
      <v-icon size="64" class="text-zinc-600 mb-4">mdi-lock-outline</v-icon>
      <h2 class="text-xl font-semibold text-zinc-300 mb-2">
        {{ myWarehouses.length === 0 ? 'Sin acceso' : 'Caja cerrada' }}
      </h2>
      <p class="text-zinc-500 mb-6">
        {{
          myWarehouses.length === 0
            ? 'No tienes Puntos de Venta asignados. Contacta al administrador.'
            : `Debes abrir una caja en "${selectedWarehouseName}" antes de poder registrar ventas.`
        }}
      </p>
      <button
        v-if="myWarehouses.length > 0"
        class="btn-primary !px-6 !py-3"
        @click="openCashDialog = true"
      >
        <v-icon size="20" class="mr-2">mdi-cash-register</v-icon>
        Abrir caja ahora
      </button>
    </div>

    <!-- Contenido principal (solo visible si hay caja abierta) -->
    <div v-else class="pos-content">
      <!-- Panel izquierdo: Búsqueda y Catálogo de Productos -->
      <div class="pos-panel-left">
        <!-- Barra de búsqueda -->
        <div class="pos-search-bar">
          <v-icon size="20" class="text-zinc-500">mdi-magnify</v-icon>
          <input
            ref="barcodeInput"
            v-model="barcodeSearch"
            type="text"
            placeholder="Escribe nombre, SKU o escanea código de barras..."
            class="pos-search-input"
            @keyup.enter="handleSearchOrScan"
            @input="debounceSearch"
            autofocus
          />
          <button v-if="barcodeSearch" class="icon-btn !w-8 !h-8" @click="clearSearch">
            <v-icon size="16">mdi-close</v-icon>
          </button>
        </div>

        <!-- Indicador de carga -->
        <div v-if="searching" class="flex items-center justify-center p-8">
          <v-progress-circular indeterminate color="indigo" />
          <span class="ml-3 text-zinc-400">Buscando productos...</span>
        </div>

        <!-- Grid de Productos (Estilo Odoo) -->
        <div v-else class="pos-product-grid">
          <div
            v-for="product in searchResults"
            :key="product.id"
            class="pos-product-card"
            @click="addToCart(product)"
          >
            <!-- Placeholder para futura imagen del producto -->
            <div class="product-image-placeholder">
              <v-icon size="40" color="zinc-600">mdi-image-outline</v-icon>
            </div>

            <div class="product-info">
              <div class="product-name" :title="product.name">{{ product.name }}</div>
              <div class="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <div class="product-sku">{{ product.sku }}</div>
                <div class="product-sku">{{ product.barcode }}</div>
              </div>

              <div class="product-footer">
                <div class="product-price">{{ formatPrice(product.sale_price) }}</div>
                <div
                  class="product-stock"
                  :class="{ 'stock-low': (product.warehouse_stock || 0) < 5 }"
                >
                  Stock: {{ product.warehouse_stock || 0 }}
                </div>
              </div>
            </div>
          </div>

          <!-- Mensaje si no hay resultados -->
          <div
            v-if="searchResults.length === 0 && !searching"
            class="empty-state !col-span-full !p-8"
          >
            <v-icon size="40" class="text-zinc-600 mb-2">mdi-package-variant</v-icon>
            <p class="text-sm text-zinc-500">
              {{
                barcodeSearch
                  ? 'No se encontraron productos con ese criterio'
                  : 'Escribe o escanea para ver productos'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Panel derecho: Carrito y pago -->
      <div class="pos-panel-right">
        <!-- Cliente -->
        <div class="pos-section">
          <label class="input-label">Cliente</label>
          <DarkSelect
            v-model="selectedCustomerId"
            :options="customerOptions"
            :searchable="true"
            search-placeholder="Buscar cliente..."
            placeholder="Consumidor final"
            class="full-width-select"
          />
        </div>

        <!-- Carrito -->
        <div class="pos-section flex-1 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <label class="input-label !mb-0">Carrito</label>
            <span class="text-xs text-zinc-500">{{ cart.length }} productos</span>
          </div>

          <div
            v-if="cart.length === 0"
            class="empty-cart flex-1 flex flex-col items-center justify-center"
          >
            <v-icon size="32" class="text-zinc-600 mb-2">mdi-cart-outline</v-icon>
            <p class="text-sm text-zinc-500">Carrito vacío</p>
          </div>

          <div v-else class="cart-items flex-1 overflow-y-auto">
            <div v-for="(item, index) in cart" :key="index" class="cart-item">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-zinc-200 truncate">
                  {{ item.product_name }}
                </div>

                <!-- Controles de Cantidad -->
                <div class="flex items-center gap-2 mt-1">
                  <button
                    class="w-6 h-6 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                    @click="decreaseQuantity(index)"
                  >
                    <v-icon size="14">mdi-minus</v-icon>
                  </button>
                  <span class="text-sm font-mono w-6 text-center">{{ item.quantity }}</span>
                  <button
                    class="w-6 h-6 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                    @click="increaseQuantity(index, item)"
                  >
                    <v-icon size="14">mdi-plus</v-icon>
                  </button>
                  <span class="text-xs text-zinc-500 ml-1">/ Stock: {{ item.max_stock }}</span>
                </div>
              </div>

              <div class="text-right flex-shrink-0">
                <!-- Precio Unitario Editable (Solo permite descuentos) -->
                <div class="flex items-center justify-end gap-1 mb-1">
                  <v-text-field
                    v-model="item.unit_price"
                    type="number"
                    density="compact"
                    hide-details
                    class="dark-input !w-20"
                    @update:model-value="validateAndRecalculate(index)"
                  />
                  <span class="text-xs text-zinc-500">c/u</span>
                </div>
                <div class="text-sm font-mono font-semibold text-zinc-200">
                  {{ formatPrice(item.total) }}
                </div>
                <button
                  class="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center justify-end w-full"
                  @click="removeFromCart(index)"
                >
                  <v-icon size="12" class="mr-1">mdi-delete</v-icon> Quitar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Totales -->
        <div class="pos-totals">
          <div class="flex justify-between py-1">
            <span class="text-zinc-400">Subtotal</span>
            <span class="font-mono text-zinc-200">{{ formatPrice(cartSubtotal) }}</span>
          </div>
          <div class="flex justify-between py-1">
            <span class="text-zinc-400">Impuestos</span>
            <span class="font-mono text-zinc-200">{{ formatPrice(0) }}</span>
          </div>
          <div class="flex justify-between pt-2 mt-2 border-t border-zinc-800">
            <span class="font-semibold text-zinc-100 text-lg">TOTAL</span>
            <span class="font-mono font-bold text-xl text-indigo-400">{{
              formatPrice(cartSubtotal)
            }}</span>
          </div>
        </div>

        <!-- Métodos de pago -->
        <div class="pos-section">
          <label class="input-label">Métodos de pago</label>
          <div v-if="payments.length === 0" class="text-xs text-zinc-500 mb-2">
            Agrega al menos un método de pago
          </div>
          <div v-for="(payment, index) in payments" :key="index" class="payment-row">
            <DarkSelect
              v-model="payment.payment_method_id"
              :options="paymentMethodOptions"
              placeholder="Método"
              class="flex-1"
            />
            <v-text-field
              v-model="payment.amount"
              type="number"
              placeholder="0.00"
              variant="outlined"
              density="compact"
              hide-details
              class="dark-input flex-1"
            />
            <button class="icon-btn !text-red-400" @click="removePayment(index)">
              <v-icon size="16">mdi-delete</v-icon>
            </button>
          </div>
          <button class="btn-secondary !text-xs !px-3 !py-1.5 mt-2" @click="addPayment">
            <v-icon size="14" class="mr-1">mdi-plus</v-icon>
            Agregar método de pago
          </button>

          <!-- Cambio -->
          <div v-if="totalPaid > cartSubtotal" class="change-display mt-3">
            <div class="flex justify-between">
              <span class="text-zinc-400">Total pagado</span>
              <span class="font-mono text-zinc-200">{{ formatPrice(totalPaid) }}</span>
            </div>
            <div class="flex justify-between text-lg">
              <span class="font-semibold text-green-400">Cambio</span>
              <span class="font-mono font-bold text-green-400">{{ formatPrice(change) }}</span>
            </div>
          </div>
        </div>

        <!-- Botón de cobrar -->
        <button
          class="btn-primary w-full !py-4 !text-lg mt-4"
          :disabled="!canCheckout"
          @click="checkout"
        >
          <v-progress-circular
            v-if="checkingOut"
            indeterminate
            size="20"
            color="white"
            class="mr-2"
          />
          <v-icon v-else size="22" class="mr-2">mdi-cash-register</v-icon>
          Cobrar {{ formatPrice(cartSubtotal) }}
        </button>
      </div>
    </div>

    <!-- Dialog: Abrir caja -->
    <v-dialog v-model="openCashDialog" max-width="500" class="dark-dialog">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="text-lg font-semibold text-zinc-100">Abrir caja</h3>
          <button class="icon-btn" @click="openCashDialog = false">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>
        <div class="dialog-body">
          <div class="mb-4">
            <label class="input-label">Punto de Venta</label>
            <!-- Campo de solo lectura que muestra el PV seleccionado -->
            <v-text-field
              :value="selectedWarehouseName"
              variant="outlined"
              density="comfortable"
              hide-details
              class="dark-input"
              disabled
            />
          </div>
          <div>
            <label class="input-label">Efectivo inicial (fondo de cambio)</label>
            <v-text-field
              v-model="openCashForm.opening_balance"
              type="number"
              placeholder="0.00"
              variant="outlined"
              density="comfortable"
              hide-details
              class="dark-input"
              @keyup.enter="openCash"
            />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="openCashDialog = false">Cancelar</button>
          <button class="btn-primary" @click="openCash" :disabled="openingCash">
            <v-progress-circular
              v-if="openingCash"
              indeterminate
              size="16"
              color="white"
              class="mr-2"
            />
            Abrir caja
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import api from '@/utils/axios'
import DarkSelect from '@/components/DarkSelect.vue'

const POS_API = 'pos/cash-registers/'
const MY_WAREHOUSES_URL = 'pos/my-warehouses/'
const PRODUCTS_URL = 'inventory/products/with-stock/'
const CUSTOMERS_URL = 'sales/customers/'
const PAYMENT_METHODS_URL = 'configuration/payment-methods/enabled/'
const INVOICES_URL = 'sales/invoices/create-with-items/'

// ===== Estado =====
const myWarehouses = ref([])
const selectedWarehouseId = ref(null)
const currentRegister = ref(null)

const barcodeInput = ref(null)
const barcodeSearch = ref('')
const searching = ref(false)
const searchResults = ref([])
let searchTimeout = null // Para el debounce

const cart = ref([])
const payments = ref([])
const selectedCustomerId = ref('')
const checkingOut = ref(false)

const customerOptions = ref([])
const paymentMethodOptions = ref([])

const openCashDialog = ref(false)
const openingCash = ref(false)
const openCashForm = ref({
  opening_balance: 0
})

const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const selectedWarehouseName = computed(() => {
  const wh = myWarehouses.value.find(w => w.id === selectedWarehouseId.value)
  return wh ? `${wh.code} - ${wh.name}` : 'Sin seleccionar'
})

const cartSubtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.total, 0)
})

const totalPaid = computed(() => {
  return payments.value.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
})

const change = computed(() => {
  return Math.max(0, totalPaid.value - cartSubtotal.value)
})

const canCheckout = computed(() => {
  return (
    currentRegister.value &&
    cart.value.length > 0 &&
    payments.value.length > 0 &&
    totalPaid.value >= cartSubtotal.value
  )
})

// ===== Helpers =====
const formatPrice = price => {
  const num = parseFloat(price)
  return isNaN(num) ? '—' : num.toLocaleString('es-CU', { minimumFractionDigits: 2 })
}

const formatDateTime = dateStr => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ===== Cargar datos =====
const loadMyWarehouses = async () => {
  try {
    const response = await api.get(MY_WAREHOUSES_URL)
    myWarehouses.value = response.data

    if (myWarehouses.value.length === 0) {
      currentRegister.value = null
      return
    }

    // 1. Intentar recuperar el último PV usado de localStorage
    const savedWarehouseId = localStorage.getItem('pos_selected_warehouse_id')
    const savedWarehouse = myWarehouses.value.find(w => w.id == savedWarehouseId)

    if (savedWarehouse) {
      selectedWarehouseId.value = savedWarehouse.id
    } else {
      // 2. Si no hay guardado, usar el primero de la lista
      selectedWarehouseId.value = myWarehouses.value[0].id
    }

    updateCurrentRegisterFromSelection()
  } catch (error) {
    console.error('Error cargando mis puntos de venta:', error)
    showSnackbar('Error al cargar puntos de venta', 'error')
  }
}

const updateCurrentRegisterFromSelection = () => {
  const selected = myWarehouses.value.find(w => w.id === selectedWarehouseId.value)

  if (selected && selected.has_open_register) {
    // Obtener detalles completos de la caja abierta
    api
      .get(`${POS_API}current/`, { params: { warehouse_id: selected.id } })
      .then(res => {
        currentRegister.value = res.data
        // Cargar productos iniciales al abrir caja
        loadInitialProducts()
      })
      .catch(() => {
        currentRegister.value = null
      })
  } else {
    currentRegister.value = null
    searchResults.value = [] // Limpiar grid si no hay caja
  }
}

const switchWarehouse = warehouseId => {
  selectedWarehouseId.value = warehouseId
  localStorage.setItem('pos_selected_warehouse_id', warehouseId)
  updateCurrentRegisterFromSelection()
  clearCart() // Limpiar carrito al cambiar de PV para evitar mezclar inventarios
}

const loadCustomers = async () => {
  try {
    const response = await api.get(CUSTOMERS_URL, { params: { page_size: 1000 } })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    customerOptions.value = data.map(c => ({ value: c.id, label: c.name }))

    const defaultCustomer = data.find(
      c =>
        c.name.toLowerCase().includes('consumidor') ||
        c.name.toLowerCase().includes('persona natural')
    )
    if (defaultCustomer) {
      selectedCustomerId.value = defaultCustomer.id
    } else if (data.length > 0) {
      selectedCustomerId.value = data[0].id
    }
  } catch (error) {
    console.error('Error cargando clientes:', error)
  }
}

const loadPaymentMethods = async () => {
  try {
    const response = await api.get(PAYMENT_METHODS_URL)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    paymentMethodOptions.value = data.map(pm => ({ value: pm.id, label: pm.name }))
  } catch (error) {
    console.warn('No se pudieron cargar métodos de pago, usando valores por defecto', error)
    paymentMethodOptions.value = [
      { value: 1, label: 'Efectivo' },
      { value: 2, label: 'Tarjeta' },
      { value: 3, label: 'Transferencia' }
    ]
  }
}

// ===== Búsqueda Inteligente (Grid + Escáner) =====
const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchProduct()
  }, 300) // Espera 300ms después de dejar de escribir
}

const handleSearchOrScan = () => {
  // Si hay una búsqueda activa, la ejecutamos inmediatamente (útil para escáneres que envían Enter)
  searchProduct(true)
}

const loadInitialProducts = async () => {
  if (!currentRegister.value) return
  searching.value = true
  try {
    const response = await api.get(PRODUCTS_URL, {
      params: {
        warehouse: currentRegister.value.warehouse,
        is_service: 'false',
        page_size: 50 // Carga inicial de 50 productos
      }
    })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    searchResults.value = data
  } catch (error) {
    console.error('Error cargando productos iniciales:', error)
  } finally {
    searching.value = false
  }
}

const searchProduct = async (isScan = false) => {
  if (!currentRegister.value) {
    showSnackbar('Debes abrir una caja primero', 'warning')
    return
  }

  const query = barcodeSearch.value.trim()

  // Si está vacío, mostramos los primeros productos
  if (!query) {
    loadInitialProducts()
    return
  }

  searching.value = true
  try {
    const response = await api.get(PRODUCTS_URL, {
      params: {
        warehouse: currentRegister.value.warehouse,
        is_service: 'false',
        search: query,
        page_size: 50
      }
    })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    searchResults.value = data

    // Lógica de escáner: Si la búsqueda arroja EXACTAMENTE 1 resultado,
    // asumimos que fue un código de barras escaneado y lo agregamos directo.
    if (isScan && data.length === 1) {
      addToCart(data[0])
      clearSearch()
    }
  } catch (error) {
    console.error('Error buscando producto:', error)
    showSnackbar('Error al buscar producto', 'error')
  } finally {
    searching.value = false
  }
}

const clearSearch = () => {
  barcodeSearch.value = ''
  searchResults.value = []
  loadInitialProducts() // Volver a mostrar el catálogo inicial
  nextTick(() => {
    barcodeInput.value?.focus()
  })
}

// ===== Carrito =====
const addToCart = product => {
  const existingItem = cart.value.find(item => item.product_id === product.id)
  const defaultPres = product.presentations?.find(p => p.is_default) || product.presentations?.[0]
  const maxStock = product.warehouse_stock || 0

  if (existingItem) {
    if (existingItem.quantity >= maxStock) {
      showSnackbar('No hay suficiente stock disponible', 'error')
      return
    }
    existingItem.quantity += 1
    existingItem.total = existingItem.quantity * existingItem.unit_price
  } else {
    cart.value.push({
      product_id: product.id,
      product_name: product.name,
      presentation_id: defaultPres?.id || '',
      presentation_name: defaultPres
        ? `${defaultPres.measure_unit.name} (x${defaultPres.conversion_factor})`
        : 'Unidad',
      quantity: 1,
      unit_price: parseFloat(defaultPres?.sale_price || product.sale_price || 0),
      base_price: parseFloat(defaultPres?.sale_price || product.sale_price || 0), // Guardamos el precio original para validar
      total: parseFloat(defaultPres?.sale_price || product.sale_price || 0),
      max_stock: maxStock
    })
  }

  nextTick(() => {
    barcodeInput.value?.focus()
  })
}

const increaseQuantity = (index, item) => {
  if (item.quantity < item.max_stock) {
    item.quantity += 1
    item.total = item.quantity * item.unit_price
  } else {
    showSnackbar('Stock máximo alcanzado para este producto', 'warning')
  }
}

const decreaseQuantity = index => {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity -= 1
    cart.value[index].total = cart.value[index].quantity * cart.value[index].unit_price
  } else {
    removeFromCart(index)
  }
}

const validateAndRecalculate = index => {
  const item = cart.value[index]
  let price = parseFloat(item.unit_price)

  // Validación: No permitir vender por encima del precio base
  if (price > item.base_price) {
    showSnackbar('No se puede vender por encima del precio base registrado', 'warning')
    item.unit_price = item.base_price
    price = item.base_price
  }

  // Evitar precios negativos o cero
  if (price <= 0) {
    price = 0
  }

  item.unit_price = price
  item.total = item.quantity * price
}

const removeFromCart = index => {
  cart.value.splice(index, 1)
}

const clearCart = () => {
  cart.value = []
  payments.value = []
}

// ===== Pagos =====
const addPayment = () => {
  const defaultMethod = paymentMethodOptions.value.find(pm =>
    pm.label.toLowerCase().includes('efectivo')
  )
  payments.value.push({
    payment_method_id: defaultMethod
      ? defaultMethod.value
      : paymentMethodOptions.value[0]?.value || '',
    amount: cartSubtotal.value
  })
}

const removePayment = index => {
  payments.value.splice(index, 1)
}

// ===== Checkout =====
const checkout = async () => {
  if (!canCheckout.value) return

  checkingOut.value = true
  try {
    const payload = {
      customer_id: parseInt(selectedCustomerId.value),
      status: 'PAID',
      cash_register_id: currentRegister.value.id,
      notes: 'Venta en punto de venta',
      items: cart.value.map(item => ({
        product_id: item.product_id,
        presentation_id: item.presentation_id,
        warehouse_id: currentRegister.value.warehouse,
        quantity: item.quantity,
        unit_price: item.unit_price // Envía el precio (posiblemente con descuento)
      })),
      payments: payments.value.map(p => ({
        payment_method_id: parseInt(p.payment_method_id),
        amount: parseFloat(p.amount),
        reference: ''
      }))
    }

    await api.post(INVOICES_URL, payload)
    showSnackbar('Venta registrada correctamente', 'success')

    clearCart()

    // 🔥 REFRESCAR EL STOCK EN TIEMPO REAL DESPUÉS DE LA VENTA
    await loadInitialProducts()

    nextTick(() => {
      barcodeInput.value?.focus()
    })
  } catch (error) {
    const msg =
      error.response?.data?.error || error.response?.data?.detail || 'Error al procesar venta'
    showSnackbar(msg, 'error')
    console.error('Error en checkout:', error)
  } finally {
    checkingOut.value = false
  }
}

// ===== Abrir caja =====
const openCash = async () => {
  if (!selectedWarehouseId.value) {
    showSnackbar('No hay un Punto de Venta seleccionado', 'error')
    return
  }

  openingCash.value = true
  try {
    await api.post(`${POS_API}open/`, {
      warehouse_id: parseInt(selectedWarehouseId.value),
      opening_balance: parseFloat(openCashForm.value.opening_balance) || 0
    })
    showSnackbar('Caja abierta correctamente', 'success')
    openCashDialog.value = false
    openCashForm.value = { opening_balance: 0 }

    // Recargar estado
    await loadMyWarehouses()

    nextTick(() => {
      barcodeInput.value?.focus()
    })
  } catch (error) {
    const msg = error.response?.data?.error || 'Error al abrir caja'
    showSnackbar(msg, 'error')
  } finally {
    openingCash.value = false
  }
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// ===== Lifecycle =====
onMounted(() => {
  loadMyWarehouses()
  loadCustomers()
  loadPaymentMethods()
})

// Enfocar el input de código de barras cuando se abre una caja
watch(currentRegister, newVal => {
  if (newVal) {
    nextTick(() => {
      barcodeInput.value?.focus()
    })
  }
})
</script>

<style scoped>
.pos-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: var(--bg-primary);
  position: relative;
}

.pos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.pos-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.pos-no-register-overlay {
  position: absolute;
  inset: 0;
  background: rgba(24, 24, 27, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(4px);
}

.pos-panel-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  overflow: hidden;
}

.pos-panel-right {
  width: 400px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  padding: 20px;
  overflow-y: auto;
}

.pos-search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
}

.pos-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--text-primary);
}

.pos-search-input::placeholder {
  color: var(--text-muted);
}

/* Grid de Productos estilo Odoo */
.pos-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.pos-product-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.pos-product-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--accent-start);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.product-image-placeholder {
  height: 100px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-subtle);
}

.product-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.product-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.product-sku {
  font-size: 11px;
  color: var(--text-muted);
  font-family: monospace;
  margin-bottom: 8px;
}

.product-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.product-price {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-light);
}

.product-stock {
  font-size: 11px;
  color: var(--text-muted);
}

.product-stock.stock-low {
  color: var(--error);
  font-weight: 600;
}

.pos-section {
  margin-bottom: 20px;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.pos-totals {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 20px;
}

.payment-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.change-display {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  padding: 12px;
}

.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}

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
