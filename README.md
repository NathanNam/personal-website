# Nathan Nam

My personal website: a short profile and the side projects I build and keep running.

**Live:** https://nathannam.com

## How it works

One static page, built with [Astro](https://astro.build) and served by Vercel.

- `src/pages/index.astro`: the page (bio, links, styles).
- `src/data/projects.json`: the side projects. Add one here, then rerun `npm run brand -- --shots`.
- `src/data/site.mjs`: the site's address, used for the share tags and the share image.
- `scripts/brand/make.mjs`: regenerates the project screenshots, the favicon set and the 1200×630 share image (`public/og.png`). Needs Google Chrome and `npm i --no-save puppeteer-core@23.11.1`.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static files in dist/
npm run brand    # screenshots + icons + share image
```

Page views are counted with Vercel Web Analytics (no cookies).
