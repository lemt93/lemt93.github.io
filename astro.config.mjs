import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import svelte from "@astrojs/svelte";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  srcDir: './src',
  integrations: [
    tailwind(),
    svelte(),
    mdx()
  ],
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
      langs: ['ts'],
      wrap: true,
    }
  }
});
