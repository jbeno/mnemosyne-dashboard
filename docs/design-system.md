# Mnemosyne UI system

The dashboard uses a source-owned component layer in
`static/ui-system.css`. It follows the same open-code principle as shadcn/ui:
the application owns its visual primitives and can tune them without depending
on a hosted theme or opaque runtime package.

A literal shadcn/ui installation would require React, TypeScript, Tailwind,
Radix primitives, a package manager, and a frontend build pipeline. Mnemosyne
instead keeps its Python standard-library server and static frontend so the
dashboard remains local-first, works offline, and introduces no browser calls
to third-party CDNs.

## Principles

- **Night-sky, not novelty:** deep blue-black foundations, restrained celestial
  texture, and antique-gold emphasis derived from the Mnemosyne portrait.
- **Information first:** borders organize data; they do not wrap every item in
  another decorative container.
- **Compact geometry:** controls use 7px radii and primary surfaces use 11px
  radii. Pills are reserved for true status tokens.
- **Source-owned components:** navigation, buttons, fields, grouped metrics,
  toolbars, tables, drawers, and state panels share the same semantic tokens.
- **Local and accessible:** no CDN assets, visible keyboard focus, semantic
  native controls, readable light mode, and reduced-motion support.

## Token layers

`--ui-*` variables are the canonical design tokens. Existing `--bg`, `--text`,
`--line`, and related variables are mapped to them for compatibility with older
feature-specific styles. New UI work should use `--ui-*` tokens directly.

## Editing rules

1. Put application behavior and feature layout in `static/style.css`.
2. Put shared visual primitives and theme decisions in `static/ui-system.css`.
3. Do not add one-off colors or radii inside feature markup.
4. Test dark and light themes at desktop, tablet, and phone widths.
5. Keep the dashboard functional without a network connection.
