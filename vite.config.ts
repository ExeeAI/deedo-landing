import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages notes:
// - USER/ORG page (username.github.io):        base = '/'
// - PROJECT page (username.github.io/<repo>):  base = '/<repo>/'
// Set BASE_PATH in the workflow/env to match your repo, or hard-code below.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist', // matches upload-pages-artifact path in deploy.yml
  },
});
