// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/data/site.mjs';

// Fully static site. Vercel serves the files in dist/ as-is.
export default defineConfig({
  site: SITE_URL,
  output: 'static',
});
