/**
 * router/index.ts
 *
 * Manual routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import Index from '@/pages/index.vue'
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
      path: 'profile',
      name: 'Mi Perfil',
      component: () => import('@/views/ProfileView.vue'),
    },
      // Administración
      {
        path: 'administration/users',
        name: 'Usuarios',
        component: () => import('@/views/administration/UsersView.vue'),
      },
      {
        path: 'administration/groups',
        name: 'Grupos',
        component: () => import('@/views/administration/GroupsView.vue'),
      },
      // Configuración
      {
        path: 'configuration/provinces',
        name: 'Provincias',
        component: () => import('@/views/configuration/ProvincesView.vue'),
      },
      {
        path: 'configuration/municipalities',
        name: 'Municipios',
        component: () => import('@/views/configuration/MunicipalitiesView.vue'),
      },
      {
        path: 'configuration/measure-units',
        name: 'Unidades de medida',
        component: () => import('@/views/configuration/MeasureUnitsView.vue'),
      },
      {
        path: 'configuration/currencies',
        name: 'Monedas',
        component: () => import('@/views/configuration/CurrenciesView.vue'),
      },
      {
        path: 'configuration/payment-methods',
        name: 'Métodos de pago',
        component: () => import('@/views/configuration/PaymentMethodsView.vue'),
      },
      {
        path: 'configuration/company',
        name: 'Mi Empresa',
        component: () => import('@/views/configuration/CompanyView.vue'),
      },
      {
        path: 'configuration/categories',
        name: 'Categorías',
        component: () => import('@/views/configuration/CategoriesView.vue'),
      },
      // Inventario
      {
        path: 'inventory/warehouses',
        name: 'Almacenes',
        component: () => import('@/views/inventory/WarehouseView.vue'),
      },
      {
        path: 'inventory/suppliers',
        name: 'Proveedores',
        component: () => import('@/views/inventory/SuppliersView.vue'),
      },
      {
      path: 'inventory/products',
      name: 'Productos',
      component: () => import('@/views/inventory/ProductsView.vue'),
      },
      {
        path: 'inventory/stock',
        name: 'Inventario',
        component: () => import('@/views/inventory/StockView.vue'),
      },
      {
        path: 'inventory/movements',
        name: 'Movimientos',
        component: () => import('@/views/inventory/MovementsView.vue'),
      },
      {
        path: 'inventory/alerts',
        name: 'Alertas de stock',
        component: () => import('@/views/inventory/StockAlertsView.vue'),
      },
      {
        path: 'inventory/import',
        name: 'Importación masiva',
        component: () => import('@/views/inventory/ImportView.vue'),
      },
      {
        path: 'sales/customers',
        name: 'Clientes',
        component: () => import('@/views/sales/CustomersView.vue'),
      },
      {
        path: 'sales/invoices',
        name: 'Facturas',
        component: () => import('@/views/sales/InvoicesView.vue'),
      },
      {
        path: 'inventory/stock-documents',
        name: 'Vales de Inventario',
        component: () => import('@/views/inventory/StockDocumentsView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
  ],
})

router.beforeEach((to, from) => {
  const authStore = useAuthStore();

  // Verificar autenticación real (token existente + no expirado)
  const hasToken = !!localStorage.getItem('auth_token');

  if (to.meta.requiresAuth && (!authStore.isAuthenticated || !hasToken)) {
    // Guardar la ruta deseada para redirigir después del login
    if (to.path !== '/login') {
      sessionStorage.setItem('redirect_after_login', to.fullPath);
    }
    return '/login';
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return '/dashboard';
  }
});

export default router
