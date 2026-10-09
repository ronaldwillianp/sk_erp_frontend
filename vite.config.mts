// import { fileURLToPath, URL } from 'node:url'
// import tailwindcss from '@tailwindcss/vite'
// import Vue from '@vitejs/plugin-vue'
// import Fonts from 'unplugin-fonts/vite'
// import { defineConfig } from 'vite'
// import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [
//     tailwindcss(),
//     Vue({
//       template: { transformAssetUrls },
//     }),
//     // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
//     Vuetify({
//       autoImport: true,
//       styles: {
//         configFile: 'src/styles/settings.scss',
//       },
//     }),
//     Fonts({
//       fontsource: {
//         families: [
//           {
//             name: 'Roboto Mono',
//             weights: [400, 700],
//           },
//           {
//             name: 'Roboto',
//             weights: [100, 300, 400, 500, 700, 900],
//             styles: ['normal', 'italic'],
//           },
//         ],
//       },
//     }),
//   ],
//   define: { 'process.env': {} },
//   resolve: {
//     alias: {
//       '@': fileURLToPath(new URL('src', import.meta.url)),
//     },
//     extensions: [
//       '.js',
//       '.json',
//       '.jsx',
//       '.mjs',
//       '.ts',
//       '.tsx',
//       '.vue',
//     ],
//   },
//   server: {
//     port: 3000,
//   },
// })
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import Vue from '@vitejs/plugin-vue'
import Fonts from 'unplugin-fonts/vite'
import { defineConfig, type Plugin } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import fs from 'node:fs'
import path from 'node:path'

const moveLayersCssPlugin = (): Plugin => ({
  name: 'move-layers-css',
  apply: 'build',
  closeBundle() {
    const distDir = path.resolve(process.cwd(), 'dist')
    const src = path.join(distDir, 'layers.css')
    const destDir = path.join(distDir, 'assets')
    const dest = path.join(destDir, 'layers.css')

    if (fs.existsSync(src)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      fs.renameSync(src, dest)

      // Actualizar la referencia en index.html
      const indexPath = path.join(distDir, 'index.html')
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8')
        html = html.replace(/\/?layers\.css/g, '/assets/layers.css')
        fs.writeFileSync(indexPath, html)
      }

      console.log('✅ layers.css movido a assets/')
    }
  },
})

export default defineConfig({
  base: '/',
  plugins: [
    tailwindcss(),
    Vue({
      template: { transformAssetUrls },
    }),
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Fonts({
      fontsource: {
        families: [
          {
            name: 'Roboto Mono',
            weights: [400, 700],
          },
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
    moveLayersCssPlugin(), // ← Agregado aquí
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  build: {
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
  },
})