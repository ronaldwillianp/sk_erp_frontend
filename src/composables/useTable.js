// src/composables/useTable.js
import { ref, watch, onUnmounted } from 'vue';
import api from '@/utils/axios';

export function useTable({ apiUrl, defaultOrdering = 'name', pageSize: initialPageSize = 10, searchDebounce = 500, defaultFilters = {} }) {
  // ===== Estado =====
  const items = ref([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(initialPageSize);
  const search = ref('');
  const ordering = ref(defaultOrdering);

  // Filtros inicializados con valores por defecto (ej: { enabled: '', default: '' })
  const filters = ref({ ...defaultFilters });

  let searchTimer = null;
  let isFirstLoad = true;

  // ===== Carga de datos =====
  const loadData = async () => {
    loading.value = true;
    try {
      const params = {};

      // Manejo de paginación:
      // - pageSize === -1  → cargar todos los registros (page_size muy grande, sin página)
      // - pageSize > 0     → paginación normal con page y page_size
      if (pageSize.value === -1) {
        params.page_size = 10000; // Suficiente para "todos" en un ERP ligero
      } else {
        params.page = page.value;
        params.page_size = pageSize.value;
      }

      if (search.value.trim()) params.search = search.value.trim();
      if (ordering.value) params.ordering = ordering.value;

      Object.entries(filters.value).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      const response = await api.get(apiUrl, { params });

      if (response.data.results) {
        items.value = response.data.results;
        total.value = response.data.count;
      } else {
        items.value = Array.isArray(response.data) ? response.data : [];
        total.value = items.value.length;
      }
    } catch (error) {
      console.error(`[useTable] Error cargando ${apiUrl}:`, error);
      items.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  };

  // ===== Paginación =====
  const changePage = (newPage) => {
    if (newPage === page.value) return;
    page.value = newPage;
    // El watch de page dispara loadData automáticamente
  };

  const changePageSize = (newSize) => {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    if (size === pageSize.value) return;
    pageSize.value = size;
    page.value = 1; // Reset a la primera página al cambiar tamaño
    // El watch de page dispara loadData automáticamente (porque page cambió a 1)
    // Pero si page ya era 1, forzamos manualmente
    if (page.value === 1) loadData();
  };

  // ===== Búsqueda con debounce =====
  const debouncedSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page.value = 1;
      loadData();
    }, searchDebounce);
  };

  const onSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    page.value = 1;
    loadData();
  };

  const clearSearch = () => {
    search.value = '';
    if (searchTimer) clearTimeout(searchTimer);
    page.value = 1;
    loadData();
  };

  // ===== Ordenamiento =====
  const toggleOrdering = (field) => {
    if (ordering.value === field) {
      ordering.value = `-${field}`;
    } else {
      ordering.value = field;
    }
    page.value = 1;
    loadData();
  };

  const getOrderingIcon = (field) => {
    if (ordering.value === field) return 'mdi-sort-ascending';
    if (ordering.value === `-${field}`) return 'mdi-sort-descending';
    return 'mdi-sort';
  };

  // ===== Filtros =====
  const clearFilters = () => {
    Object.keys(filters.value).forEach(key => { filters.value[key] = ''; });
    page.value = 1;
    loadData();
  };

  // ===== Watchers =====
  // Primera carga: solo cuando page cambia de su valor inicial
  // Esto evita la doble petición porque los filtros ya están inicializados
  watch(page, () => loadData(), { immediate: true });

  // Debounce automático al escribir
  watch(search, () => {
    if (!isFirstLoad) debouncedSearch();
  });

  // Marcar que la primera carga ya pasó
  watch(loading, (val) => {
    if (!val && isFirstLoad) isFirstLoad = false;
  });

  // Limpieza
  onUnmounted(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });

  return {
    items, loading, total, page, pageSize, search, ordering, filters,
    loadData, toggleOrdering, getOrderingIcon,
    onSearch, clearSearch, clearFilters,
    changePage, changePageSize,
  };
}