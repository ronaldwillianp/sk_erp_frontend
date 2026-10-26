<template>
  <div>
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1 class="page-title">Mi Perfil</h1>
          <p class="page-subtitle">Gestiona tu información personal y tu contraseña</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingProfile" class="content-card p-12 text-center">
      <v-progress-circular indeterminate color="indigo" />
      <p class="text-sm text-zinc-500 mt-4">Cargando tu perfil...</p>
    </div>

    <template v-else>
      <!-- Card: Resumen del perfil -->
      <div class="content-card mb-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div class="profile-avatar avatar-gradient">
            <span class="text-2xl font-bold text-white">{{ userInitials }}</span>
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-zinc-100">
              {{ profile.first_name }} {{ profile.last_name }}
            </h2>
            <p class="text-sm text-zinc-500 mt-0.5">@{{ profile.username }}</p>
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <span class="badge badge-info">
                <v-icon size="12" class="mr-1">mdi-shield-account-outline</v-icon>
                {{ userRole }}
              </span>
              <span :class="['badge', profile.is_active ? 'badge-success' : 'badge-neutral']">
                {{ profile.is_active ? 'Activo' : 'Inactivo' }}
              </span>
              <span v-if="profile.email" class="badge badge-neutral">
                <v-icon size="12" class="mr-1">mdi-email-outline</v-icon>
                {{ profile.email }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid: Información personal + Cambiar contraseña -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <!-- Card: Información personal -->
        <div class="content-card lg:col-span-3">
          <div class="card-header !border-b-0 !pb-0">
            <div>
              <h3 class="card-title">Información personal</h3>
              <p class="card-description">Actualiza tus datos personales y de contacto</p>
            </div>
          </div>

          <div class="p-6 pt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Nombre</label>
                <v-text-field
                  v-model="form.first_name"
                  placeholder="Ej: Juan"
                  variant="outlined"
                  hide-details
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
                  hide-details
                  :error-messages="formErrors.last_name"
                  class="dark-input"
                  @update:model-value="clearFieldError('last_name')"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Email</label>
                <v-text-field
                  v-model="form.email"
                  placeholder="usuario@ejemplo.com"
                  variant="outlined"
                  hide-details
                  :error-messages="formErrors.email"
                  class="dark-input"
                  prepend-inner-icon="mdi-email-outline"
                  @update:model-value="clearFieldError('email')"
                />
              </div>
              <div>
                <label class="input-label">Carné de identidad</label>
                <v-text-field
                  v-model="form.ci"
                  placeholder="Ej: 90010112345"
                  variant="outlined"
                  hide-details
                  :error-messages="formErrors.ci"
                  class="dark-input"
                  maxlength="11"
                  @update:model-value="clearFieldError('ci')"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="input-label">Contacto</label>
                <v-text-field
                  v-model="form.contact"
                  placeholder="Ej: 55551234"
                  variant="outlined"
                  hide-details
                  class="dark-input"
                />
              </div>
              <div>
                <label class="input-label">Dirección</label>
                <v-text-field
                  v-model="form.address"
                  placeholder="Ej: Calle 1 #101"
                  variant="outlined"
                  hide-details
                  class="dark-input"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

            <div class="flex justify-end">
              <button class="btn-primary" @click="saveProfile" :disabled="savingProfile">
                <v-progress-circular
                  v-if="savingProfile"
                  indeterminate
                  size="16"
                  color="white"
                  class="mr-2"
                />
                Guardar cambios
              </button>
            </div>
          </div>
        </div>

        <!-- Card: Cambiar contraseña -->
        <div class="content-card lg:col-span-2 self-start">
          <div class="card-header !border-b-0 !pb-0">
            <div>
              <h3 class="card-title">Cambiar contraseña</h3>
              <p class="card-description">Usa una contraseña segura de al menos 8 caracteres</p>
            </div>
          </div>

          <div class="p-6 pt-4">
            <div class="mb-4">
              <label class="input-label">Contraseña actual</label>
              <v-text-field
                v-model="passwordForm.current_password"
                placeholder="••••••••"
                variant="outlined"
                hide-details
                :type="showPasswords ? 'text' : 'password'"
                :append-inner-icon="showPasswords ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="showPasswords = !showPasswords"
                :error-messages="passwordErrors.current_password"
                class="dark-input"
                prepend-inner-icon="mdi-lock-outline"
                @update:model-value="clearPasswordError('current_password')"
              />
            </div>

            <div class="mb-4">
              <label class="input-label">Nueva contraseña</label>
              <v-text-field
                v-model="passwordForm.new_password"
                placeholder="••••••••"
                variant="outlined"
                hide-details
                :type="showPasswords ? 'text' : 'password'"
                :error-messages="passwordErrors.new_password"
                class="dark-input"
                prepend-inner-icon="mdi-lock-plus-outline"
                @update:model-value="clearPasswordError('new_password')"
              />
            </div>

            <div class="mb-6">
              <label class="input-label">Confirmar nueva contraseña</label>
              <v-text-field
                v-model="passwordForm.confirm_password"
                placeholder="••••••••"
                variant="outlined"
                hide-details
                :type="showPasswords ? 'text' : 'password'"
                :error-messages="passwordErrors.confirm_password"
                class="dark-input"
                prepend-inner-icon="mdi-lock-check-outline"
                @update:model-value="clearPasswordError('confirm_password')"
              />
            </div>

            <div class="flex justify-end">
              <button class="btn-primary" @click="changePassword" :disabled="savingPassword">
                <v-progress-circular
                  v-if="savingPassword"
                  indeterminate
                  size="16"
                  color="white"
                  class="mr-2"
                />
                Cambiar contraseña
              </button>
            </div>
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
import { useAuthStore } from '@/stores/auth'
import DarkSelect from '@/components/DarkSelect.vue'

const authStore = useAuthStore()

const ME_URL = 'v1.0/administration/users/me/'
const CHANGE_PASSWORD_URL = 'v1.0/administration/change-password/'
const PROVINCES_URL = 'configuration/provinces/enabled/'

// ===== Estado =====
const loadingProfile = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const showPasswords = ref(false)

const profile = ref({})
const form = ref({})
const formErrors = ref({})
const passwordForm = ref({ current_password: '', new_password: '', confirm_password: '' })
const passwordErrors = ref({})

const provinceOptions = ref([])
const municipalityOptions = ref([])

const snackbar = ref({ show: false, message: '', color: 'success' })

// ===== Computed =====
const userInitials = computed(() => {
  const first = profile.value.first_name?.[0] || profile.value.username?.[0] || ''
  const last = profile.value.last_name?.[0] || ''
  return (first + last).toUpperCase() || '?'
})

const userRole = computed(() => {
  const groups = profile.value.groups || []
  if (groups.length > 0) return groups[0].name
  return profile.value.is_superuser ? 'Administrador' : 'Usuario'
})

// ===== Cargar datos =====
const loadProfile = async () => {
  loadingProfile.value = true
  try {
    const response = await api.get(ME_URL)
    profile.value = response.data

    // Llenar el formulario con los datos del perfil
    form.value = {
      first_name: response.data.first_name || '',
      last_name: response.data.last_name || '',
      email: response.data.email || '',
      ci: response.data.ci || '',
      contact: response.data.contact || '',
      address: response.data.address || '',
      province_id: response.data.province?.id || '',
      municipality_id: response.data.municipality?.id || ''
    }

    // Cargar municipios de la provincia actual del usuario
    if (response.data.province?.id) {
      await loadMunicipalities(response.data.province.id)
    }
  } catch (error) {
    console.error('Error cargando perfil:', error)
    showSnackbar('Error al cargar tu perfil', 'error')
  } finally {
    loadingProfile.value = false
  }
}

const loadProvinces = async () => {
  try {
    const response = await api.get(PROVINCES_URL)
    provinceOptions.value = response.data.map(p => ({ value: p.id, label: p.name }))
  } catch (error) {
    console.error('Error cargando provincias:', error)
  }
}

const loadMunicipalities = async provinceId => {
  if (!provinceId) {
    municipalityOptions.value = []
    return
  }
  try {
    const response = await api.get(`configuration/provinces/${provinceId}/municipalities/`)
    municipalityOptions.value = response.data.map(m => ({ value: m.id, label: m.name }))
  } catch (error) {
    console.error('Error cargando municipios:', error)
    municipalityOptions.value = []
  }
}

const onProvinceChange = provinceId => {
  form.value.municipality_id = ''
  loadMunicipalities(provinceId)
}

// ===== Guardar información personal =====
const saveProfile = async () => {
  formErrors.value = {}
  let hasErrors = false

  if (!form.value.first_name.trim()) {
    formErrors.value.first_name = ['El nombre es requerido']
    hasErrors = true
  }
  if (!form.value.last_name.trim()) {
    formErrors.value.last_name = ['Los apellidos son requeridos']
    hasErrors = true
  }
  if (!form.value.email.trim()) {
    formErrors.value.email = ['El email es requerido']
    hasErrors = true
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    formErrors.value.email = ['Email inválido']
    hasErrors = true
  }
  if (!form.value.ci.trim()) {
    formErrors.value.ci = ['El CI es requerido']
    hasErrors = true
  }

  if (hasErrors) return

  savingProfile.value = true
  try {
    // ✅ CORREGIDO: Expandir form.value, no form
    const payload = {
      ...form.value,
      province_id: form.value.province_id || null,
      municipality_id: form.value.municipality_id || null
    }

    const response = await api.put(ME_URL, payload)

    // Actualizar el perfil mostrado y el store de autenticación
    profile.value = response.data
    authStore.updateUser(response.data)

    showSnackbar('Perfil actualizado correctamente')
  } catch (error) {
    console.error('Error guardando perfil:', error)
    handleProfileError(error)
  } finally {
    savingProfile.value = false
  }
}

// ===== Cambiar contraseña =====
const changePassword = async () => {
  passwordErrors.value = {}
  let hasErrors = false

  if (!passwordForm.value.current_password) {
    passwordErrors.value.current_password = ['Ingresa tu contraseña actual']
    hasErrors = true
  }
  if (!passwordForm.value.new_password) {
    passwordErrors.value.new_password = ['La nueva contraseña es requerida']
    hasErrors = true
  } else if (passwordForm.value.new_password.length < 8) {
    passwordErrors.value.new_password = ['Mínimo 8 caracteres']
    hasErrors = true
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordErrors.value.confirm_password = ['Las contraseñas no coinciden']
    hasErrors = true
  }

  if (hasErrors) return

  savingPassword.value = true
  try {
    await api.post(CHANGE_PASSWORD_URL, passwordForm.value)
    showSnackbar('Contraseña actualizada correctamente')
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch (error) {
    console.error('Error cambiando contraseña:', error)
    handlePasswordError(error)
  } finally {
    savingPassword.value = false
  }
}

// ===== Manejo de errores =====
const handleProfileError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['first_name', 'last_name', 'email', 'ci'].forEach(field => {
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

const handlePasswordError = error => {
  if (error.response?.data) {
    const data = error.response.data
    const fieldErrors = {}

    ;['current_password', 'new_password', 'confirm_password'].forEach(field => {
      if (data[field]) {
        fieldErrors[field] = Array.isArray(data[field]) ? data[field] : [data[field]]
      }
    })

    passwordErrors.value = fieldErrors

    if (Object.keys(fieldErrors).length === 0) {
      showSnackbar(data.detail || 'Error al cambiar la contraseña', 'error')
    }
  } else {
    showSnackbar('Error de conexión', 'error')
  }
}

const clearFieldError = field => {
  if (formErrors.value[field]) formErrors.value[field] = []
}

const clearPasswordError = field => {
  if (passwordErrors.value[field]) passwordErrors.value[field] = []
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

onMounted(() => {
  loadProvinces()
  loadProfile()
})
</script>

<style scoped>
/* Avatar grande del perfil */
.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-glow);
}

/* Selects a ancho completo */
.full-width-select {
  width: 100%;
}
.full-width-select :deep(.dark-select-wrapper) {
  width: 100%;
}
</style>
