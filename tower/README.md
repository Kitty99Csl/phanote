# Phajot Tower

Operator surface for Phajot. Admin-only. Lives at
`tower-phajot.pages.dev` (Session 15) or `tower.phajot.com`
(Session 16+).

## Toolchain

Matches main Phajot app (no divergence):

- React 19 + Vite 8 + Tailwind 4 (`@tailwindcss/vite` plugin)
- No `postcss.config.js` — Tailwind 4 is Vite-native
- No `tailwind.config.js` — design tokens in `src/index.css`
  via `@theme` block

## Local development

```bash
cd tower
npm install
npm run dev
```

Runs on http://localhost:5174 (main Phajot app uses 3000).

## Build

```bash
cd tower
npm run build
```

Output in `tower/dist/`.

## Deployment

CF Pages project: `tower-phajot` (separate from main app's Pages
project). Build command: `cd tower && npm install && npm run
build`. Output: `tower/dist`.

See Sprint F in [docs/tower/vanguard/SPRINT-CURRENT.md](../docs/tower/vanguard/SPRINT-CURRENT.md).

## Design system

Celadon (#ACE1AF) matches main Phajot app. Design tokens in
`tower/src/index.css` `@theme` block mirror the `:root` vars in
main app's `src/index.css`.

## Session status

- Session 15: stub page only ("Tower. Lobby coming next.")
- Session 16: admin auth + Lobby nav + 3 rooms rendering data
