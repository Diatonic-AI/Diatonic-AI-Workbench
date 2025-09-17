import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8083,
    hmr: {
      port: 8083, // Ensure HMR WebSocket uses same port
    },
    // Automatically find available port if 8083 is busy
    strictPort: false,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // AWS SDK chunks
          'aws-core': [
            '@aws-sdk/client-cognito-identity-provider',
            '@aws-sdk/client-dynamodb',
            '@aws-sdk/client-s3',
            'aws-amplify'
          ],
          // React ecosystem
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slot'
          ],
          // Data fetching and state management
          'data-vendor': [
            '@tanstack/react-query'
          ],
          // Visualization and flow
          'viz-vendor': [
            '@xyflow/react',
            'recharts',
            'lucide-react'
          ],
          // Utilities
          'utils-vendor': [
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'date-fns'
          ]
        },
      },
    },
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    } : undefined,
  },
}));
