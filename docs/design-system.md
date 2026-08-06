# Mnemosyne UI system

The dashboard has two source-owned presentation layers during the local cutover
soak period:

- `frontend/src/components/ui/` and `frontend/src/index.css` form the default
  React UI served at `/`.
- `static/ui-system.css` keeps the temporary `/legacy` fallback coherent.

The React interface follows shadcn/ui's open-code principle: this repository owns the
visible component source and semantic theme while Radix supplies interaction
semantics for controls such as tabs, dialogs, and selects. It is a compiled,
local asset with no third-party browser calls or CDN dependency. The Python
standard-library server and read-only data API remain unchanged.

## Principles

- **Night-sky, not novelty:** deep blue-black foundations, restrained celestial
  texture, and antique-gold emphasis derived from the Mnemosyne portrait.
- **Information first:** borders organize data; they do not wrap every item in
  another decorative container.
- **Compact geometry:** controls use 7px radii and primary surfaces use 11px
  radii. Pills are reserved for true status tokens.
- **Functional typography:** use the local system sans-serif stack, make the
  page title the dominant heading, and reserve compact uppercase text for
  labels and metadata rather than navigation or body copy.
- **Source-owned components:** navigation, buttons, fields, grouped metrics,
  toolbars, tables, drawers, and state panels share the same semantic tokens.
- **Local and accessible:** no CDN assets, visible keyboard focus, semantic
  native controls, readable light mode, and reduced-motion support.
- **Charts explain relationships:** Overview, Lifecycle, Trust Review, Context
  Bank, MEMORIA, Persona & Facts, and Visualizer use
  source-owned wrappers over the exact-pinned Recharts dependency, keep an
  accessibility layer enabled, and retain visible labels or legends instead of
  communicating with color alone.
- **Tabs are tabs:** line tabs have no surrounding trigger border; the active
  item is indicated by a two-pixel underline and semantic Radix state.
- **Tables remain semantic:** dense relationship, diagnostic, and fact data use
  the shared responsive Table primitive instead of hand-aligned divs. Tables
  scroll within their own region at compact widths rather than widening the page.
- **Exploration is shared:** Knowledge Graph and Visualizer use one keyboard-
  addressable SVG network-map composition with consistent selection, zoom,
  fullscreen, and inspector behavior. Visualizer can switch to a source-owned
  Three.js composition that reuses the same deterministic category-aware
  coordinates and honors reduced-motion preferences.

## Token layers

`--ui-*` variables remain canonical for the legacy fallback. The React UI uses
matching shadcn-style semantic variables such as `--background`,
`--foreground`, `--card`, `--border`, `--primary`, and `--muted-foreground`.
Both systems derive from the same night-sky palette during the fallback period.

## Editing rules

1. Limit legacy changes to safety or fallback correctness in `static/style.css`
   and `static/ui-system.css`.
2. Put React primitives in `frontend/src/components/ui/`, compositions in
   `frontend/src/components/`, and page layouts in `frontend/src/pages/`.
3. Keep tokens and theme decisions centralized in `frontend/src/index.css`.
4. Add component source deliberately; do not run a latest-version component
   generator or bypass the repository's dependency age gate.
5. Do not add one-off colors or radii inside feature markup.
6. Test dark and light themes at desktop, tablet, and phone widths.
7. Keep the dashboard functional without a network connection.
8. Aggregate chart series in the read-only Python API; do not ship raw database
   rows to the browser merely to calculate a visualization.
9. Prefer the existing source-owned Badge, Table, Tabs, Tooltip, Select, and
   chart primitives before introducing a new one. New shadcn-style source is
   welcome when it solves a repeated interaction and passes the dependency age
   gate without adding unnecessary runtime surface.
