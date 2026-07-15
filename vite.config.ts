import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// GitHub Pages notes:
// - Served from the custom domain land.deedo.ai (see public/CNAME), i.e. the
//   domain ROOT, so base stays '/'. It is not a project page.
// - BASE_PATH remains overridable for a project-page deploy (`/<repo>/`).
const base = process.env.BASE_PATH ?? '/';

const entry = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist', // matches upload-pages-artifact path in deploy.yml
    rollupOptions: {
      /*
       * Multi-page. This host carries several landing pages, so no single one
       * owns the root:
       *   index.html       -> /        the original self-contained lead form
       *   tryus/index.html -> /tryus/  the React landing page
       *
       * Adding another landing = a new folder with an index.html plus an entry
       * here. Shared chunks are split across entries automatically, and the
       * root page pulls in no JS bundle at all since it has no module script.
       */
      input: {
        main: entry('./index.html'),
        tryus: entry('./tryus/index.html'),
      },
    },
  },
});
