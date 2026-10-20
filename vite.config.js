import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'node:fs';

function cleanUrls() {
  return {
    name: 'clean-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url.split('?')[0];
        if (!url.includes('.') && url !== '/' && fs.existsSync('.' + url + '.html')) {
          req.url = url + '.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [cleanUrls()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        invitation: resolve(__dirname, 'invitation.html'),
        manage: resolve(__dirname, 'manage.html'),
      },
    },
  },
});
