import {defineConfig, externalizeDepsPlugin} from 'electron-vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [tailwindcss(),svelte()],
    resolve: {
      alias: {
        $lib: path.resolve("./src/renderer/src/lib"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'src/renderer/index.html'),
          settings: path.resolve(__dirname, 'src/renderer/settings.html'),
          session: path.resolve(__dirname, 'src/renderer/session.html'),
          session_launcher: path.resolve(__dirname, 'src/renderer/session_launcher.html'),
        },
      }
    }
  }
})
