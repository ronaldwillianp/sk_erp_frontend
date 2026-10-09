<template>
  <v-app class="layout-wrapper">
    <div class="glow glow-sidebar"></div>
    <div class="glow glow-main"></div>

    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      class="sidebar"
      elevation="0"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 h-16 border-b border-white/5">
        <div class="sidebar-logo">
          <v-icon color="white" size="20">mdi-store-outline</v-icon>
        </div>
        <transition name="fade">
          <span
            v-if="!rail"
            class="text-base font-semibold text-zinc-100 tracking-tight"
            >Mi Negocio</span
          >
        </transition>
      </div>

      <!-- Menu -->
      <div class="px-3 py-5">
        <v-list
          density="compact"
          nav
          class="sidebar-menu !py-0 !bg-transparent"
        >
          <!-- Dashboard -->
          <v-list-item
            prepend-icon="mdi-view-dashboard-outline"
            title="Dashboard"
            to="/dashboard"
            :active="currentPath === '/dashboard'"
          />

          <!-- Sección: Administración -->
          <div v-if="!rail" class="menu-section-label mt-5">Administración</div>
          <v-list-group value="Administración" v-if="!rail">
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-account-group-outline"
                title="Administración"
              />
            </template>
            <v-list-item
              v-for="item in adminItems"
              :key="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
              :to="item.to"
              :active="currentPath === item.to"
            />
          </v-list-group>

          <!-- Sección: Configuración -->
          <div v-if="!rail" class="menu-section-label mt-5">Configuración</div>
          <v-list-group value="Configuración" v-if="!rail">
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-cog-outline"
                title="Configuración"
              />
            </template>
            <v-list-item
              v-for="item in configItems"
              :key="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
              :to="item.to"
              :active="currentPath === item.to"
            />
          </v-list-group>

          <!-- Sección: Almacenes -->
          <div v-if="!rail" class="menu-section-label mt-5">Inventario</div>
            <v-list-group value="Inventario" v-if="!rail">
              <template v-slot:activator="{ props }">
                <v-list-item
                  v-bind="props"
                  prepend-icon="mdi-account-group-outline"
                  title="Inventario"
                />
              </template>
              <v-list-item
                v-for="item in inventoryItems"
                :key="item.to"
                :prepend-icon="item.icon"
                :title="item.title"
                :to="item.to"
                :active="currentPath === item.to"
              />
          </v-list-group>

          <!-- Sección: Ventas -->
          <div v-if="!rail" class="menu-section-label mt-5">Ventas</div>
          <v-list-group value="Ventas" v-if="!rail">
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                prepend-icon="mdi-file-document-outline"
                title="Ventas"
              />
            </template>
            <v-list-item
              v-for="item in salesItems"
              :key="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
              :to="item.to"
              :active="currentPath === item.to"
            />
          </v-list-group>

        </v-list>
      </div>

      

      <!-- Bottom: User info -->
      <div class="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5">
        <v-list-item
          prepend-icon="mdi-logout"
          title="Cerrar Sesión"
          @click="handleLogout"
          class="!text-red-400"
        />
      </div>
    </v-navigation-drawer>

    <!-- Topbar -->
    <v-app-bar color="transparent" elevation="0" class="topbar" height="64">
      <v-btn
        icon
        variant="text"
        @click="rail = !rail"
        class="!rounded-lg toggle-btn"
      >
        <v-icon color="zinc-400">{{
          rail ? "mdi-menu" : "mdi-menu-open"
        }}</v-icon>
      </v-btn>

      <div class="hidden sm:flex items-center gap-2 ml-2">
        <span class="text-xs text-zinc-500">Mi Negocio</span>
        <v-icon size="12" color="zinc-600">mdi-chevron-right</v-icon>
        <span class="text-xs text-zinc-300 font-medium">{{
          currentRoute
        }}</span>
      </div>

      <v-spacer />

      <!-- Search -->
      <div class="hidden md:flex items-center mr-4">
        <div class="search-box">
          <v-icon size="16" class="mr-2 text-zinc-500">mdi-magnify</v-icon>
          <input v-model="searchQuery" type="text" placeholder="Buscar..." />
          <kbd class="search-shortcut">⌘K</kbd>
        </div>
      </div>

      <!-- Notifications -->
      <v-btn icon variant="text" class="!rounded-lg toggle-btn mx-1">
        <v-badge color="error" content="3" floating offset-x="-2" offset-y="2">
          <v-icon color="zinc-400">mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <!-- Profile -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            class="profile-trigger !rounded-xl !px-2 ml-2"
          >
            <v-avatar size="32" class="avatar-gradient mr-2">
              <span class="text-white text-xs font-semibold">{{
                authStore.userInitials
              }}</span>
            </v-avatar>
            <div class="hidden sm:block text-left">
              <div class="text-xs font-medium text-zinc-200">
                {{ authStore.userName }}
              </div>
              <div class="text-[10px] text-zinc-500">{{ userRole }}</div>
            </div>
            <v-icon size="14" class="ml-2 text-zinc-600"
              >mdi-chevron-down</v-icon
            >
          </v-btn>
        </template>

        <div class="profile-dropdown">
          <div class="p-4 border-b border-white/5">
            <div class="flex items-center gap-3">
              <v-avatar size="40" class="avatar-gradient">
                <span class="text-white text-sm font-semibold">{{
                  authStore.userInitials
                }}</span>
              </v-avatar>
              <div>
                <div class="text-sm font-medium text-zinc-200">
                  {{ authStore.userName }}
                </div>
                <div class="text-xs text-zinc-500">
                  {{ authStore.user?.email }}
                </div>
              </div>
            </div>
          </div>
          <div class="p-2">
            <router-link to="/profile" class="dropdown-item">
              <v-icon size="18" class="mr-3 text-zinc-500"
                >mdi-account-outline</v-icon
              >
              Mi Perfil
            </router-link>
          </div>
          <div class="p-2 border-t border-white/5">
            <button
              @click="handleLogout"
              class="dropdown-item logout-item w-full text-left"
            >
              <v-icon size="18" class="mr-3">mdi-logout</v-icon>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="main-content">
      <div class="content-area">
        <router-view />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const drawer = ref(true);
const rail = ref(false);
const searchQuery = ref("");

// Menú: Administración (backend en inglés, UI en español)
const adminItems = [
  {
    title: "Usuarios",
    icon: "mdi-account-outline",
    to: "/administration/users",
  },
  {
    title: "Grupos",
    icon: "mdi-account-multiple-outline",
    to: "/administration/groups",
  },
];

// Menú: Configuración
const configItems = [
  {
    title: "Empresa",
    icon: "mdi-office-building-outline",
    to: "/configuration/company",
  },
  {
    title: "Provincias",
    icon: "mdi-map-outline",
    to: "/configuration/provinces",
  },
  {
    title: "Municipios",
    icon: "mdi-map-marker-outline",
    to: "/configuration/municipalities",
  },
  {
    title: "Categorías",
    icon: "mdi-shape-outline",
    to: "/configuration/categories",
  },
  {
    title: "Unidades de medida",
    icon: "mdi-ruler-square",
    to: "/configuration/measure-units",
  },
  {
    title: "Monedas",
    icon: "mdi-currency-usd",
    to: "/configuration/currencies",
  },
  {
    title: "Métodos de pago",
    icon: "mdi-credit-card-outline",
    to: "/configuration/payment-methods",
  },
];

// Menú: Inventario
const inventoryItems = [
  { title: 'Almacenes', icon: 'mdi-warehouse', to: '/inventory/warehouses' },
  { title: 'Proveedores', icon: 'mdi-truck-delivery-outline', to: '/inventory/suppliers' },
  { title: 'Productos', icon: 'mdi-package-variant', to: '/inventory/products' },
  { title: 'Inventario', icon: 'mdi-clipboard-list-outline', to: '/inventory/stock' },
  { title: 'Movimientos', icon: 'mdi-swap-horizontal', to: '/inventory/movements' },
  { title: 'Alertas de stock', icon: 'mdi-alert-circle-outline', to: '/inventory/alerts' },
  { title: 'Importación masiva', icon: 'mdi-file-upload-outline', to: '/inventory/import' }
];

// Sección: Ventas
const salesItems = [
  { title: 'Clientes', icon: 'mdi-account-group-outline', to: '/sales/customers' },
  { title: 'Facturas', icon: 'mdi-file-document-outline', to: '/sales/invoices' },
  // { title: 'Cotizaciones', icon: 'mdi-file-sign', to: '/sales/quotes' }, ← futuro
];

const currentPath = computed(() => route.path);
const currentRoute = computed(() => route.name || "Dashboard");

const userRole = computed(() => {
  const groups = authStore.user?.groups || [];
  if (groups.length > 0) return groups[0].name;
  return authStore.user?.is_superuser ? "Administrador" : "Usuario";
});

const handleLogout = async () => {
  await authStore.logout();
  router.push("/login");
};
</script>

<style scoped>
/* Solo estilos específicos del Layout */
.layout-wrapper {
  background-color: var(--bg-primary) !important;
}
.main-content {
  background: transparent !important;
}
.content-area {
  padding: 24px;
  min-height: calc(100vh - 64px);
}

.glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}

.glow-sidebar {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.08),
    transparent 70%
  );
  top: 0;
  left: -100px;
}

.glow-main {
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(139, 92, 246, 0.06),
    transparent 70%
  );
  bottom: -100px;
  right: -100px;
}

.sidebar {
  background: rgba(15, 15, 18, 0.8) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.sidebar-logo {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  flex-shrink: 0;
}

.topbar {
  background: rgba(9, 9, 11, 0.8) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.toggle-btn:hover {
  background: var(--bg-hover) !important;
}

.search-shortcut {
  font-size: 10px;
  color: var(--text-faint);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}

.profile-trigger:hover {
  background: var(--bg-elevated) !important;
}

.profile-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 8px;
  width: 260px;
  background: var(--bg-card-solid);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: none;
}

.dropdown-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.logout-item {
  color: var(--error);
}
.logout-item:hover {
  background: var(--error-bg);
  color: #fca5a5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
