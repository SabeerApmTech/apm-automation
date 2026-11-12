import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /[/\\]node_modules[/\\](react|react-dom|react-router|scheduler)[/\\]/ },
            { name: 'mantine', test: /[/\\]node_modules[/\\]@mantine[/\\](core|hooks)[/\\]/ },
          ],
        },
      },
    },
  },
})
