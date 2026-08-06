# Contributing

Thanks for improving Mnemosyne Dashboard.

## Local development

Use Python 3.11+, Node 20+ for the legacy JavaScript syntax check, and Bun
1.3.11 for the React dashboard. The built React assets are checked in because
the Python server serves only local files.

```bash
python -m pip install "pytest==8.4.1" "ruff==0.12.2"
python -m ruff check .
python -m pytest -q
python -m compileall -q .
node --check static/app.js

cd frontend
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
git diff --exit-code -- ../static/candidate
```

The frontend manifest uses exact versions. `frontend/bunfig.toml` rejects
packages released in the last seven days and disables lifecycle scripts. Do
not bypass those controls during an active supply-chain incident. New
components should normally be source-owned under `frontend/src/components/ui/`;
adding a dependency requires a documented reason, an age check, and a lockfile
review.

## Safety invariants

Please keep these invariants unless a change explicitly documents and tests a different security model:

- The dashboard binds to `0.0.0.0` by default for easy LAN access.
- SQLite is opened through a read-only URI (`mode=ro`).
- Memory admin/editing is disabled by default; LAN/non-local admin mode must stay password-gated.
- Static assets are served only from `static/`.
- External JavaScript/CSS/CDN dependencies are avoided.
- LAN exposure is the default and should be documented with auth/firewall guidance.
- The React dashboard is served at `/`; `/legacy` remains a temporary local
  fallback until the React cutover has completed its soak period.
- Screenshot fixtures use a temporary synthetic SQLite database and must never
  read a contributor's real Mnemosyne database.

## Pull request checklist

- [ ] Ruff passes.
- [ ] Pytest passes.
- [ ] Python compile check passes.
- [ ] `node --check static/app.js` passes.
- [ ] Frozen Bun install, React type-check, and React build pass.
- [ ] `static/candidate/` matches a fresh frontend build.
- [ ] New or changed frontend dependencies are exact-pinned, older than seven
      days, and reviewed against current supply-chain advisories.
- [ ] README/config docs updated for user-facing changes.
- [ ] Security notes updated if the network/auth/read-only model changes.
- [ ] Screenshots, when changed, were generated only from synthetic mock data.
