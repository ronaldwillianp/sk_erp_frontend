<template>
  <div class="dark-select-wrapper" ref="wrapperRef">
    <button
      class="dark-select-trigger"
      :class="{
        'dark-select-trigger-focus': isOpen,
        'dark-select-trigger-error': hasError
      }"
      @click="toggleDropdown"
      type="button"
    >
      <span v-if="selectedLabel" class="dark-select-value">{{ selectedLabel }}</span>
      <span v-else class="dark-select-placeholder">{{ placeholder }}</span>
      <v-icon size="16" class="dark-select-chevron" :class="{ 'rotate-180': isOpen }">
        mdi-chevron-down
      </v-icon>
    </button>

    <!-- Mensajes de error animados -->
    <TransitionGroup name="vuetify-error" tag="div" class="error-messages-container">
      <p v-for="(msg, index) in displayErrors" :key="`error-${index}-${msg}`" class="field-error">
        {{ msg }}
      </p>
    </TransitionGroup>

    <!-- Dropdown teleportado al body para evitar conflictos de stacking context -->
    <Teleport to="body">
      <transition name="dropdown-fade">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="dark-select-dropdown dark-select-dropdown-teleported"
          :style="dropdownStyle"
        >
          <div v-if="searchable" class="dark-select-search">
            <v-icon size="14" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="dark-select-search-input"
              @click.stop
            />
          </div>

          <div class="dark-select-options">
            <div v-if="filteredOptions.length === 0" class="dark-select-empty">Sin resultados</div>
            <button
              v-for="option in filteredOptions"
              :key="option.value"
              class="dark-select-option"
              :class="{ 'dark-select-option-active': modelValue === option.value }"
              @click="selectOption(option)"
              type="button"
            >
              <span>{{ option.label }}</span>
              <v-icon v-if="modelValue === option.value" size="16" color="indigo">mdi-check</v-icon>
            </button>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Seleccionar...' },
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: 'Buscar...' },
  // NUEVO: Recibe un array de errores (estilo Vuetify)
  errorMessages: { type: [Array, String], default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const wrapperRef = ref(null)
const dropdownRef = ref(null)
const searchInputRef = ref(null)
const dropdownStyle = ref({})

// NUEVO: Normalizamos el error a array siempre
const normalizedErrors = computed(() => {
  const errors = props.errorMessages
  if (!errors) return []
  if (Array.isArray(errors)) return errors
  if (typeof errors === 'string') {
    return errors.trim() ? [errors] : []
  }
  return []
})

// Computed: detecta si hay errores
const hasError = computed(() => normalizedErrors.value.length > 0)
const displayErrors = computed(() => normalizedErrors.value)

const selectedLabel = computed(() => {
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : ''
})

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value.trim()) return props.options
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

// ===== Posicionamiento dinámico =====
const updatePosition = () => {
  if (!wrapperRef.value) return

  const rect = wrapperRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const estimatedDropdownHeight = 300

  const openUpward = rect.bottom + estimatedDropdownHeight > viewportHeight

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${Math.max(rect.width, 200)}px`,
    zIndex: 99999,
    ...(openUpward
      ? { bottom: `${viewportHeight - rect.top + 4}px` }
      : { top: `${rect.bottom + 4}px` })
  }
}

// ===== Toggle =====
const toggleDropdown = () => {
  if (!isOpen.value) {
    updatePosition()
    searchQuery.value = ''
    isOpen.value = true
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    isOpen.value = false
  }
}

// ===== Select =====
const selectOption = option => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

// ===== Click outside =====
const handleClickOutside = e => {
  if (!isOpen.value) return
  if (
    wrapperRef.value &&
    !wrapperRef.value.contains(e.target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(e.target)
  ) {
    isOpen.value = false
  }
}

// ===== Recalcular posición en scroll/resize =====
const handleScrollOrResize = () => {
  if (isOpen.value) updatePosition()
}

// ===== Watchers =====
watch(isOpen, async val => {
  if (val) {
    await nextTick()
    updatePosition()
  } else {
    searchQuery.value = ''
  }
})

// ===== Lifecycle =====
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>

<style scoped>
.dark-select-wrapper {
  position: relative;
  min-width: 160px;
}

/* ===== Trigger ===== */
.dark-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  /* Transición suave estilo Vuetify */
  transition:
    border-color 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
    background 0.2s ease,
    color 0.3s ease;
  text-align: left;
  gap: 8px;
}

.dark-select-trigger:hover {
  border-color: var(--border-default);
}

.dark-select-trigger-focus {
  border-color: var(--accent-start);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

/* NUEVO: Estado de error */
.dark-select-trigger-error {
  border-color: var(--error) !important;
  box-shadow: 0 0 0 1px rgba(255, 82, 82, 0.2);
}

.dark-select-trigger-error .dark-select-chevron {
  color: var(--error);
}

.dark-select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark-select-placeholder {
  flex: 1;
  color: var(--text-faint);
}

.dark-select-chevron {
  color: var(--text-dim);
  transition:
    transform 0.2s ease,
    color 0.3s ease;
  flex-shrink: 0;
}

.rotate-180 {
  transform: rotate(180deg);
}

/* ===== Contenedor de errores ===== */
.error-messages-container {
  min-height: 0;
}

.field-error {
  color: var(--error);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  margin: 8px 0 0 14px;
  padding: 0;
}

/* ===== Animación Dropdown ===== */
.dropdown-fade-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-fade-leave-active {
  transition: all 0.15s ease-in;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-8px);
}
</style>

<!-- Estilos GLOBALES para la animación de error y el dropdown teleportado -->
<style>
/* ===== Animación de errores (estilo Vuetify) ===== */
.vuetify-error-enter-active,
.vuetify-error-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
}

.vuetify-error-enter-from,
.vuetify-error-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.vuetify-error-enter-to,
.vuetify-error-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 40px;
  margin-top: 4px;
  margin-bottom: 0;
}

/* ===== Dropdown teleportado ===== */
.dark-select-dropdown-teleported {
  background: rgba(24, 24, 27, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.dark-select-search {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.dark-select-search-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-secondary);
  font-size: 13px;
}

.dark-select-search-input::placeholder {
  color: var(--text-faint);
}

.dark-select-options {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.dark-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.dark-select-option:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dark-select-option-active {
  background: var(--accent-soft);
  color: var(--accent-light);
}

.dark-select-option-active:hover {
  background: var(--accent-soft);
}

.dark-select-empty {
  padding: 12px;
  text-align: center;
  color: var(--text-faint);
  font-size: 12px;
}
</style>
