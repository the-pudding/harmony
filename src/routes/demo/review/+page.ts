// Reads/writes local JSON files via api/+server.ts, which needs a real Node
// process — only available in `npm run dev`, not the static production
// build (see svelte.config.js's adapter-static). Excluding this route from
// prerendering keeps `npm run build` from trying (and failing) to statically
// render it; adapter-static's `strict: false` then just drops it from the
// output rather than erroring the whole build.
export const prerender = false;
