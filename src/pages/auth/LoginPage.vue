<template>
  <v-container fluid class="fill-height bg-grey-lighten-4">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="8" class="pa-6">
          <v-card-title class="text-h5 text-center mb-2">
            <v-icon size="48" color="primary" class="mb-2"
              >mdi-office-building</v-icon
            >
            <div>ERP Ligero</div>
          </v-card-title>

          <v-card-subtitle class="text-center mb-6">
            Inicia sesión en tu cuenta
          </v-card-subtitle>

          <v-form @submit.prevent="handleLogin" ref="formRef">
            <v-text-field
              v-model="form.username"
              label="Usuario"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              :rules="[(v) => !!v || 'Usuario es requerido']"
              required
              class="mb-3"
            />

            <v-text-field
              v-model="form.password"
              label="Contraseña"
              prepend-inner-icon="mdi-lock"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              @click:append-inner="showPassword = !showPassword"
              variant="outlined"
              :rules="[(v) => !!v || 'Contraseña es requerida']"
              required
              class="mb-4"
            />

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              block
              size="large"
              :loading="isLoading"
            >
              Iniciar Sesión
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
  username: "",
  password: "",
});
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const formRef = ref(null);

const handleLogin = async () => {
  const { valid } = await formRef.value.validate();

  if (!valid) return;

  isLoading.value = true;
  errorMessage.value = "";

  const success = await authStore.login(form.value);

  if (success) {
    router.push("/dashboard");
  } else {
    errorMessage.value = "Credenciales inválidas. Intenta de nuevo.";
  }

  isLoading.value = false;
};
</script>
