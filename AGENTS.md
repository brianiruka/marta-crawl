<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MARTA Crawl

An Atlanta city guide centered on the MARTA rail/streetcar system. Interactive
map on the homepage; selecting a station shows nearby points of interest.

## Design tokens — read before touching colors/spacing

Source of truth is Figma, synced via the Tokens Studio plugin to the `tokens`
branch of this repo, file `tokens/global.json`. Do not hand-edit
`src/styles/tokens.css` — it's generated output.

Workflow when tokens change:
1. Pull/merge the `tokens` branch into `main`
2. Run `npm run tokens:build` (Style Dictionary) to regenerate `src/styles/tokens.css`
3. Commit the regenerated CSS alongside the token source change

Never hardcode hex values or pixel spacing in components (e.g. `bg-[#EC2527]`).
Use the Tailwind utility classes tied to tokens instead (`bg-line-red`,
`p-5`, etc.) — that's the whole point of the pipeline.

## Tailwind v4

There is no `tailwind.config.js`. Theme values are declared in
`src/app/globals.css` inside the `@theme inline { ... }` block, which reads
the CSS variables from `src/styles/tokens.css`. If a utility class isn't
rendering, check that its variable is both defined in `tokens.css` and
aliased under `@theme` — both steps are required. Watch for dynamically
constructed class strings (e.g. `` `border-${x}` ``) — Tailwind's build-time
scanner only picks up literal class names in source, so dynamic strings
silently produce no CSS.

## Project structure

- `src/components/` — reusable UI components (e.g. `StationBadge`)
- `src/data/` — station and POI data (`stations.ts`, `pois.ts`)
- `tokens/global.json` — design token source, synced from Figma
- `style-dictionary.config.mjs` — token build config
