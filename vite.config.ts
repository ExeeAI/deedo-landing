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
       * Multi-page:
       *   index.html       -> /        the landing page (alias of /tryus/)
       *   tryus/index.html -> /tryus/  the landing page, its canonical home
       *   talk/index.html  -> /talk/   the original self-contained lead form
       *
       * / and /tryus/ render the same app. Both carry rel=canonical pointing at
       * /tryus/, so the duplicate is not indexed twice: this host carries
       * several landings, so /tryus/ is the stable identity while the root is a
       * convenience alias that may point elsewhere later.
       *
       * Rollup shares the module graph between the two, so the second entry
       * costs a stub, not a second copy of React. /talk/ pulls in no JS bundle
       * at all — it has no module script.
       *
       * Adding another landing = a new folder with an index.html plus an entry.
       */
      input: {
        main: entry('./index.html'),
        tryus: entry('./tryus/index.html'),
        talk: entry('./talk/index.html'),
      },
    },
  },
});
