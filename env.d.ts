/// <reference types="vite/client" />
/// <reference types="vite-plugin-vue-layouts-next/client" />

// Declaración para que TypeScript reconozca archivos .vue
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}