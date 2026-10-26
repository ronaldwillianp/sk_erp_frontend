<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Mi Empresa</h1>
          <p class="page-subtitle">Datos legales y operativos de tu negocio</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingCompany" class="content-card p-12 text-center">
      <v-progress-circular indeterminate color="indigo" />
      <p class="text-sm text-zinc-500 mt-4">Cargando datos de la empresa...</p>
    </div>

    <template v-else>
      <!-- Banner si no hay empresa -->
      <div v-if="!companyExists" class="alert-warning mb-5 max-w-4xl mx-auto">
        <v-icon size="16" class="mr-2">mdi-information-outline</v-icon>
        Aún no has configurado tu empresa. Completa los datos y guarda para crearla.
      </div>

      <!-- Card centrada con ancho máximo -->
      <div class="content-card max-w-4xl mx-auto">
        <div class="card-header !border-b-0 !pb-0">
          <div>
            <h3 class="card-title">Información de la empresa</h3>
            <p class="card-description">Esta información aparecerá en facturas y reportes</p>
          </div>
        </div>

        <div class="p-6 pt-4">
          <!-- Logo -->
          <div class="mb-6">
            <label class="input-label">Logo de la empresa</label>
            <div class="flex items-center gap-5">
              <!-- Preview -->
              <div class="logo-preview avatar-gradient">
                <img v-if="logoPreviewUrl" :src="logoPreviewUrl" alt="Logo" class="logo-img" />
                <v-icon v-else size="32" color="white">mdi-office-building-outline</v-icon>
              </div>
              <div class="flex-1">
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onLogoSelected"
                />
                <button class="btn-secondary" @click="$refs.fileInputRef.click()">
                  <v-icon size="16" class="mr-2">mdi-upload-outline</v-icon>
                  Seleccionar imagen
                </button>
                <p class="text-xs text-zinc-500 mt-2">
                  PNG o JPG, máximo 2MB. Se recomienda fondo transparente.
                </p>
                <button
                  v-if="logoFile || company.logo"
                  class="text-xs text-red-400 hover:text-red-300 mt-2"
                  @click="removeLogo"
                >
                  Quitar logo
                </button>
              </div>
            </div>
          </div>

          <div class="divider mb-6"></div>

          <!-- Campos -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="input-label">Nombre de la empresa</label>
              <v-text-field
                v-model="form.name"
                placeholder="Ej: Mi Negocio S.A."
                variant="outlined"
                :error-messages="formErrors.name"
                class="dark-input"
                prepend-inner-icon="mdi-office-building-outline"
                @update:model-value="clearFieldError('name')"
              />
            </div>
            <div>
              <label class="input-label">Eslogan</label>
              <v-text-field
                v-model="form.slogan"
                placeholder="Ej: Calidad al mejor precio"
                variant="outlined"
                :error-messages="formErrors.slogan"
                class="dark-input"
                prepend-inner-icon="mdi-tagline"
                @update:model-value="clearFieldError('slogan')"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="input-label">Email</label>
              <v-text-field
                v-model="form.email"
                placeholder="contacto@minegocio.com"
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
                :error-messages="formErrors.phone"
                class="dark-input"
                prepend-inner-icon="mdi-phone-outline"
                @update:model-value="clearFieldError('phone')"
              />
            </div>
          </div>

          <div class="mb-6">
            <label class="input-label">Dirección</label>
            <v-text-field
              v-model="form.address"
              placeholder="Ej: Calle 1 #101, Reparto Centro"
              variant="outlined"
              :error-messages="formErrors.address"
              class="dark-input"
              prepend-inner-icon="mdi-map-marker-outline"
              @update:model-value="clearFieldError('address')"
            />
          </div>

          <div class="flex justify-end">
            <button class="btn-primary" @click="saveCompany" :disabled="saving">
              <v-progress-circular
                v-if="saving"
                indeterminate
                size="16"
                color="white"
                class="mr-2"
              />
              {{ companyExists ? 'Guardar cambios' : 'Crear empresa' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/utils/axios'

const COMPANY_URL = 'configuration/company/'
// URL base del backend (para construir URLs absolutas de archivos media)
const API_BASE_URL = 'http://localhost:8000'

// ===== Estado =====
const loadingCompany = ref(false)
const saving = ref(false)
const companyExists = ref(false)
const company = ref({})
const form = ref({})
const formErrors = ref({})
const logoFile = ref(null)
const fileInputRef = ref(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Helpers =====
/**
 * Construye una URL absoluta para archivos media
 * Maneja casos donde el backend devuelve URL relativa (/media/...) o absoluta
 */
const buildMediaUrl = path => {
  if (!path) return null
  // Si ya es absoluta (empieza con http), devolverla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // Si es relativa, concatenar con la base
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

// ===== Computed =====
const logoPreviewUrl = computed(() => {
  // Prioridad 1: archivo local seleccionado (blob URL)
  if (logoFile.value) {
    return URL.createObjectURL(logoFile.value)
  }
  // Prioridad 2: URL del logo guardado en el servidor
  if (company.value?.logo) {
    return buildMediaUrl(company.value.logo)
  }
  return null
})

// ===== Cargar empresa =====
const loadCompany = async () => {
  loadingCompany.value = true
  try {
    const response = await api.get(COMPANY_URL)
    company.value = response.data
    companyExists.value = true
    form.value = {
      name: response.data.name || '',
      slogan: response.data.slogan || '',
      email: response.data.email || '',
      phone: response.data.phone || '',
      address: response.data.address || ''
    }
  } catch (error) {
    if (error.response?.status === 404) {
      companyExists.value = false
      form.value = { name: '', slogan: '', email: '', phone: '', address: '' }
    } else {
      console.error('Error cargando empresa:', error)
      showSnackbar('Error al cargar los datos de la empresa', 'error')
    }
  } finally {
    loadingCompany.value = false
  }
}

// ===== Logo =====
const onLogoSelected = event => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showSnackbar('El archivo debe ser una imagen', 'error')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    showSnackbar('La imagen no debe superar 2MB', 'error')
    return
  }

  logoFile.value = file
}

const removeLogo = () => {
  logoFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// ===== Guardar =====
const saveCompany = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.name.trim()) {
    formErrors.value.name = ['El nombre es requerido']
    hasErrors = true
  }
  if (!form.value.email.trim()) {
    formErrors.value.email = ['El email es requerido']
    hasErrors = true
  }
  if (!form.value.phone.trim()) {
    formErrors.value.phone = ['El teléfono es requerido']
    hasErrors = true
  }

  if (hasErrors) return

  saving.value = true
  try {
    const companyId = company.value.id
    let response

    if (logoFile.value) {
      // Con archivo: usar FormData
      const formData = new FormData()
      Object.entries(form.value).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('logo', logoFile.value)

      if (companyId) {
        response = await api.put(`${COMPANY_URL}${companyId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        response = await api.post(COMPANY_URL, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
    } else if (companyId) {
      response = await api.patch(`${COMPANY_URL}${companyId}/`, form.value)
    } else {
      response = await api.post(COMPANY_URL, form.value)
    }

    company.value = response.data
    companyExists.value = true
    logoFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''

    showSnackbar('Empresa guardada correctamente')
  } catch (error) {
    console.error('Error guardando empresa:', error)
    handleApiError(error)
  } finally {
    saving.value = false
  }
}

// ===== Errores =====
const handleApiError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['name', 'slogan', 'email', 'phone', 'address'].forEach(field => {
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

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

onMounted(loadCompany)
</script>

<style scoped>
.logo-preview {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hidden {
  display: none;
}
</style>
