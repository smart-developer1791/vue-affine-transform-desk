<div align="center">

# 📐 Affine Transform Desk

**A shape, moved by a little math.**

![Vue](https://img.shields.io/badge/Vue-3-42b883?style=for-the-badge&logo=vuedotjs&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=ffffff)
![License](https://img.shields.io/badge/License-MIT-777777?style=for-the-badge)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

_Vue affine desk with ordered operations, validated named models, stable computed matrices, original SVG geometry, and SVG/matrix TXT/JSON exports._

</div>

---

## ✨ Highlights

- **Three original polygons:** Start from a triangle, rectangle, or arrow.
- **An ordered sequence:** Keep 1–6 translations, origin rotations, or percentage scales.
- **A controlled Vue model:** A typed operation model publishes complete validated replacements.
- **Computed stability:** Reuse the previous matrix object when every numeric entry remains equal.
- **Visible composition:** Inspect the homogeneous matrix, transformed points, signed area factor, and orientation.
- **Reflection and collapse:** Negative and zero scales are valid and explained.
- **Clean delivery:** Export one transparent transformed SVG polygon, complete matrix TXT, or AF JSON.

## 🧱 Project Structure

```text
public/
├── favicon.svg                         # Original project emblem
├── og.svg                              # Original social artwork
├── font-licenses.txt                   # Font copyright and OFL licenses
└── sample-workspace.json               # Complete importable workspace
src/
├── components/
│   ├── OperationControls.vue
│   ├── TransformPreview.vue
│   ├── DataTools.vue                   # Workspace actions and restoration
│   ├── AppDialog.vue                   # Native Teleport modal and focus lifecycle
│   ├── AppIcon.vue                     # Original inline SVG icons
│   ├── DataExchange.vue                # Validated workspace import dialog
│   └── StudioHeader.vue                # Workspace branding and actions
├── domain/
│   ├── affine.ts                      # Pure validation, calculations, and exports
│   ├── shared.ts                       # Text, identity, number, and provenance helpers
│   └── validation.ts                   # Strict unknown-input guards
├── composables/
│   └── useStableMatrix.ts
├── services/
│   ├── draft.ts                        # Validated device-local persistence
│   └── files.ts                        # Downloads and deterministic identities
├── App.vue                             # Workspace and editor state
├── base.css                            # Tailwind, local fonts, and control defaults
├── style.css                           # Project theme tokens
└── main.ts                             # Vue application entry
tests/
├── *.test.ts                           # Native domain/composable/export tests
└── e2e/                                # Production browser workflows
```

Root files include Vite, TypeScript, Playwright, and Prettier configuration, an npm lockfile, the MIT license, and explicit `vercel.json`. The official scaffold’s default artwork and empty `src/assets` directory are removed. The shared generic development container stays unchanged.

## 🛠 Tech Stack

| Tool                          | Role                                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| Vue 3.5                       | Typed SFCs, component contracts, reactive state, and lifecycle management   |
| TypeScript 6                  | Checked domain structures and component/composable inputs                   |
| Vite 8                        | Development server and static production bundles                            |
| Tailwind CSS 4                | Vite plugin, theme tokens, template utilities, and responsive/state styling |
| DM Sans + Bricolage Grotesque | Locally bundled Latin variable fonts                                        |
| Node.js 24+                   | Local CLI tools and native TypeScript tests                                 |
| Playwright                    | Chromium workflows against the production build                             |

The app requires no account, backend, remote data source, or extra UI library. All dependencies and CLI tools are installed locally inside this independent project.

## 🎨 Tailwind Styling

The Vite config enables `@tailwindcss/vite`. `base.css` imports Tailwind, defines font tokens, and uses `@apply` for small native control defaults. `style.css` defines project colors through `@theme`. Actual application templates use Tailwind utilities for grid/flex layouts, spacing, typography, borders, colors, responsive behavior, focus, and visible states.

`data-ui`, `data-project`, and domain identity attributes are explicit browser hooks. There are no orphan semantic styling classes. Reserved preview/list containers and internal overflow keep neighboring panels stable when modes, selected details, or results change. All application layout and visible-state classes use Tailwind utilities. Native SVG attributes describe transform geometry where present. Standalone exported artwork carries its own presentation. Reduced-motion preferences shorten transitions.

Two Fontsource variable font files are bundled as hashed local assets. Their copyright and OFL text are in [font-licenses.txt](./public/font-licenses.txt). Favicon/social artwork and SVG interface icons are original project assets.

## 📦 Included Demo Data

The original **A little arrow, on a journey** stretches X to 130% and Y to 80%, rotates 30 degrees, then translates to (70,−25). Its signed area factor is 1.04. The seven-vertex arrow remains an original polygon plus the composed SVG matrix in delivery output.

The complete [sample-workspace.json](./public/sample-workspace.json) includes valid provenance and is served as a public static file. The application imports this same JSON sample for first use and confirmed restoration.

## 🚀 Local Development

Use Node.js **24 or later**:

```bash
npm ci
npm run dev
```

Vite prints the local URL and binds to `0.0.0.0` for the shared container. Inspect a production bundle with:

```bash
npm run build
npm run preview
```

## 🧩 Vue Implementation

OperationControls owns detached numeric/name/enabled fields and a typed defineModel operation. Applying creates one fully validated replacement. The parent writable computed resolves the selected identity and validates the complete workspace before replacing that record. Name/artwork changes do not erase pending operation edits; value-based signatures refresh a form when its selected operation actually changes.

useStableMatrix uses Vue [computed stability with the previous value](https://vuejs.org/guide/best-practices/performance.html#computed-stability). It always calculates the full next matrix first, preserving dependency collection, then returns the previous array when all six entries are Object.is equal. Label changes, disabled-value edits, and neutral operations therefore do not notify matrix consumers. Native tests inspect reference identity and synchronous watcher counts.

A matrix is [a,b,c,d,e,f], with X'=aX+cY+e and Y'=bX+dY+f. Listed operations apply first to last; each step left-multiplies the accumulated matrix. SVG X grows right and Y grows down, so positive rotation appears clockwise. Rotation is around the origin. Scale values are percentages, allowing reflections and zero-axis collapse.

Composition keeps JavaScript floating-point precision, including very small nonzero scales. Output formats use up to 12 significant digits and preserve scientific notation. Exact quarter-turn trigonometric noise is removed before composition. An enabled zero scale explicitly reports a collapsed area factor rather than presenting floating-point cancellation as a nonzero area.

The preview fits original/result polygons and the origin. Faint source geometry stays separate from the filled transformed polygon. SVG delivery fits only the transformed result with a 20-unit margin, including line/point collapse, and contains no editor axes or source outline. A reserved frame and internal scrolling keep surrounding panels stable.

The shared modal uses `Teleport`, a unique `useId` heading, and a post-flush watcher to synchronize Vue state with native `showModal`/`close`. Escape and focus return remain native. A queued close event cannot reset a modal that has already reopened.

## 💾 Local Drafts & Data Exchange

Validated workspace data is stored under `vue-affine-transform-desk:v1`. First-use and restored data are validated before use. Invalid saved JSON/schema falls back to the sample without immediately overwriting the damaged entry. A later valid change writes a new draft. Blocked storage leaves editing and downloads usable and shows a status message.

Import parses a detached candidate and replaces the workspace only after complete validation. Failure keeps current work and the saved draft intact. Workspace JSON is limited to **120,000 characters**. Known fields are rebuilt in canonical order; unknown fields and supplied provenance are not trusted or carried into the editable domain. Project markers are recomputed from validated data. Workspace name, polygon choice, ink, and ordered operation identities/names/enabled flags/numeric fields are persisted. Selection, dialogs, pending fields, composed matrices, and transformed vertices are transient.

| Field                   | Accepted values                                      |
| ----------------------- | ---------------------------------------------------- |
| version, name           | 1; nonblank single-line title up to 80 characters    |
| shape                   | triangle, rectangle, or arrow                        |
| ink                     | Six-digit HEX canonicalized uppercase                |
| steps                   | 1–6 ordered operations with unique safe IDs up to 40 |
| Operation name, enabled | Nonblank single-line name up to 32; actual boolean   |
| translate x, y          | Whole units −200 through 200                         |
| rotate angle            | Whole degrees −180 through 180                       |
| scale x, y              | Whole percentages −200 through 200, including zero   |

Operation kind fixes its accepted numeric fields. Unknown fields are discarded. Duplicate/reserved IDs, wrong primitives, missing kind-specific values, unsupported shapes/kinds, fractions, out-of-range values, malformed colors, and unsupported versions reject candidates. All steps persist, including disabled ones.

SVG contains a single filled original polygon with the composed matrix, escaped full title/description, AF attribution, and a fitted transparent view box. It omits axes/editor outline and external resources. Matrix TXT includes every enabled/disabled operation in order, coordinate conventions, the SVG matrix and homogeneous rows, signed area factor, and every source/result vertex. JSON retains the complete editable operation sequence, shape, ink, and canonical provenance.

Download Blob URLs are revoked after download. Destructive collection removal and sample restoration use native confirmation dialogs.

## ◈ Project Markers

- `AF` appears in the wordmark, project metadata, and workspace identity; original favicon/social artwork use a matching emblem.
- `AF-XXXXXXXX` is a deterministic 32-bit content stamp calculated with FNV-1a over the UTF-8 canonical workspace JSON, excluding supplied provenance.
- JSON provenance includes the project slug, `CodeSculptor`, and the marker. Downloaded artifacts carry the appropriate identity in filenames and/or metadata/content.
- Markers help identify configurations and artifacts; they are not cryptographic signatures or tamper-proof authorship claims.
- Author metadata and the MIT license retain CodeSculptor attribution.

## 🧭 Extension Notes & Nuances

- Fixed original polygons only; no arbitrary SVG import, editable vertices, path curves, skew controls, pivot editing, or animation.
- First listed applies first. Reordering a translation/scale can change the final position even when the linear part is unchanged.
- Scale uses percentages, with negative values reflecting and zero collapsing an axis. A collapsed fill can become visually empty; matrix and point values remain inspectable.
- The signed determinant represents area scale and orientation; it is not a full shape similarity measure.
- Computed stability compares exact numeric results rather than approximate equality; separate mathematically equivalent floating calculations can retain small differences.
- Numeric export uses 12 significant digits, so text/native SVG can differ slightly from full-precision intermediate calculations.
- Auto-fitting includes the source/origin in the preview and only the result in delivery, so zoom/placement can differ.
- Selection, dialogs, pending fields, computed matrices, and transformed vertices are transient.
- Extend operation validation, multiplication order, stable equality, geometry bounds, and exports together.

The application and documentation are English. At 320 px panels stack, while larger screens use the shared grid. Scrollable data regions, named native controls, visible focus styles, and a single main landmark remain available across layouts.

## ✅ Build & Checks

```bash
npm run build
npm run format:check
npm test
npx playwright install chromium
npm run test:e2e
```

`build` runs `vue-tsc` before Vite. Native tests use Node’s built-in runner. Playwright starts the current production bundle with the local preview command and does not reuse another server. Build before browser tests so they inspect current output. `npm run format` formats maintained source; dependencies, generated output, lockfiles, and browser artifacts are excluded.

Six native tests cover exact sample coefficients/area, independently applied point composition, operation-order differences, disabled steps/reflection/collapse/tiny scales, actual Vue computed identity/notification behavior, strict schema guards, escaped SVG/TXT, and maximum sequences. Four browser workflows cover named-model failures and pending fields, native SVG matrix values, persistence, keyed reordering/stable panels, zero/negative/disabled operations, confirmed removal/limits, and parsed fitted SVG plus full TXT/JSON downloads.

Shared browser workflows check valid/failed imports, persistence after reload, provenance downloads, blocked/corrupt storage, confirmed sample restoration, native modal reopening/Escape/focus, real Tailwind grid behavior, named visible controls, and overflow at 320–1440 px. A separate maximum-content case downloads and re-imports the complete escaped JSON workspace at 320 px. These are local production checks, not a deployed Vercel smoke test.

## ▲ Vercel Deployment

1. Import the repository and select this project folder as the Root Directory when deploying from the shared workspace.
2. Use the committed config: `npm ci`, `npm run build`, and output folder `dist`.
3. Check the root page, public sample/artwork, and main editor after deployment.

The explicit `vercel.json` rewrites only `/` to `/index.html` and permanently redirects `/index.html` to `/`. There are no client routes requiring a catch-all rewrite. Declared routes preserve missing-resource behavior. HTML and unhashed public files revalidate; Vite’s hashed JS/CSS/font assets receive one-year immutable caching. All responses include `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`. The dev command accepts Vercel’s `$PORT` with `--strictPort`.

Used fields, route compilation, and generated asset/cache behavior are checked locally against the [official Vercel configuration schema](https://openapi.vercel.sh/vercel.json). Vite preview does not emulate deployment headers. SVG social artwork is included as an editable source; platforms requiring raster cards need a rendered image and an absolute deployed image URL.

## 📄 License

[MIT](./LICENSE) · Copyright (c) 2026 **CodeSculptor**. Bundled fonts retain separate OFL licenses.
