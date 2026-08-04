# Fork maintenance

`jbeno/mnemosyne-dashboard` is a maintained fork of
`wysie/mnemosyne-dashboard`. The goal is a small, dependable dashboard for
current Mnemosyne and multi-profile Hermes installations while preserving the
upstream safety model.

## Branches and releases

- `main` is the tested release branch used by the live Hermes plugin.
- Feature and maintenance work lands through pull requests.
- Keep `upstream` pointed at `https://github.com/wysie/mnemosyne-dashboard.git`.
- Release tags use the existing `vX.Y.Z` convention.

## Updating from upstream

```bash
git fetch upstream
git switch main
git pull --ff-only origin main
git switch -c codex/sync-upstream-YYYYMMDD
git merge --no-ff upstream/main
```

Review every upstream change against the fork-specific tests. Do not update the
live plugin until CI passes and the sync pull request is merged.

## Accepting upstream pull requests

Prefer cherry-picking the contributor commit so authorship is retained. If a
change must be adapted, credit the original pull request in the commit or pull
request description. Run the full checks after every integration:

```bash
python -m ruff check .
python -m pytest -q
python -m compileall -q .
node --check static/app.js
```

Changes involving SQLite access must verify that connections close on success
and failure. Schema-dependent features should be tested against synthetic tables
matching the oldest and current supported Mnemosyne layouts.

## Live deployment

The live checkout is `~/.hermes/plugins/mnemosyne-dashboard`. Install or replace
it from this fork with:

```bash
hermes plugins install jbeno/mnemosyne-dashboard --enable --force
hermes gateway restart
```

For a persistent macOS service, use `scripts/install_launchd_macos.sh`, bind to
`127.0.0.1`, and smoke-test `/api/health` after every update. Keep development
work in a separate checkout; never edit the live plugin directory directly.
