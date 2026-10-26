<template>
  <div class="login-wrapper">
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
    <div class="grid-pattern"></div>

    <div class="relative z-10 flex min-h-screen items-center justify-center p-6 overflow-hidden">
      <div class="w-full max-w-105">
        <!-- Logo -->
        <div class="flex flex-col items-center mb-10">
          <div class="login-logo">
            <v-icon size="28" color="white">mdi-store-outline</v-icon>
          </div>
          <h1 class="mt-5 text-2xl font-semibold tracking-tight text-white">Mi Negocio</h1>
          <p class="mt-2 text-sm text-zinc-500">Mi negocio al día</p>
        </div>

        <!-- Form Card -->
        <div class="login-card">
          <v-form @submit.prevent="handleLogin" ref="formRef">
            <div class="mb-5">
              <label class="input-label">Usuario</label>
              <v-text-field
                v-model="form.username"
                placeholder="Nombre de usuario"
                prepend-inner-icon="mdi-account-outline"
                variant="outlined"
                :error-messages="errors.username"
                class="dark-input"
                @blur="validateField('username')"
                @update:model-value="clearError('username')"
              />
            </div>

            <div class="mb-6">
              <!-- <div class="flex items-center justify-between mb-2">
                <label class="input-label mb-0">Contraseña</label>
                <a href="#" class="link-accent text-xs">¿La olvidaste?</a>
              </div> -->
              <v-text-field
                v-model="form.password"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                :error-messages="errors.password"
                class="dark-input"
                @blur="validateField('password')"
                @update:model-value="clearError('password')"
              />
            </div>

            <transition name="slide-fade">
              <div v-if="errorMessage" class="alert-error mb-5">
                <v-icon size="16" class="mr-2">mdi-alert-circle-outline</v-icon>
                {{ errorMessage }}
              </div>
            </transition>

            <button type="submit" class="btn-primary w-full !h-[48px]" :disabled="isLoading">
              <span v-if="!isLoading">Iniciar sesión</span>
              <v-icon v-if="!isLoading" end size="18" class="ml-1">mdi-arrow-right</v-icon>
              <v-progress-circular v-else indeterminate size="20" color="white" />
            </button>
          </v-form>
        </div>

        <!-- Separador -->
        <!-- <div class="flex items-center gap-4 my-8">
          <div class="h-px flex-1 bg-zinc-800"></div>
          <span class="text-xs text-zinc-600">¿Necesitas acceso?</span>
          <div class="h-px flex-1 bg-zinc-800"></div>
        </div>

        <div class="text-center">
          <a href="#" class="link-muted text-[13px] inline-flex items-center">
            <v-icon size="16" class="mr-1.5">mdi-lifebuoy</v-icon>
            Contactar al administrador
          </a>
        </div> -->

        <p class="mt-10 text-center text-xs text-zinc-600">© 2026 Mi Negocio · v1.0.0</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)

const form = ref({ username: '', password: '' })
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const errors = ref({ username: [], password: [] })
const redirectTo = sessionStorage.getItem('redirect_after_login')

const validateField = field => {
  if (!form.value[field]) {
    errors.value[field] = [field === 'username' ? 'Ingresa tu usuario' : 'Ingresa tu contraseña']
  } else {
    errors.value[field] = []
  }
}

const clearError = field => {
  if (form.value[field]) errors.value[field] = []
}

const handleLogin = async () => {
  let hasErrors = false
  if (!form.value.username) {
    errors.value.username = ['Ingresa tu usuario']
    hasErrors = true
  }
  if (!form.value.password) {
    errors.value.password = ['Ingresa tu contraseña']
    hasErrors = true
  }
  if (hasErrors) return

  isLoading.value = true
  errorMessage.value = ''

  const result = await authStore.login(form.value)
  if (result.success) {
    // Después del login exitoso
    if (redirectTo) {
      sessionStorage.removeItem('redirect_after_login')
      router.push(redirectTo)
    } else {
      router.push('/dashboard')
    }
  } else {
    errorMessage.value = result.message
  }
  isLoading.value = false
}
</script>

<style scoped>
/* Solo estilos específicos del Login */
.login-wrapper {
  position: relative;
  min-height: 100vh;
  background-color: var(--bg-primary);
  overflow: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
}

.glow-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(51, 54, 252, 0.15));
  top: -150px;
  left: -100px;
}

.glow-2 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(111, 51, 249, 0.1));
  bottom: -200px;
  right: -150px;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}

.login-logo {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    var(--shadow-glow);
}

.login-card {
  background: rgba(24, 24, 27, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

.slide-fade-enter-active {
  transition: all 0.3s ease;
}
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}
.slide-fade-leave-to {
  opacity: 0;
}
</style>
