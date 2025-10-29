import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://ColinGamez.github.io',
  base: '/colingamez-website',
  integrations: [tailwind()],
  output: 'static',
  build: {
    assets: 'assets'
  }
});