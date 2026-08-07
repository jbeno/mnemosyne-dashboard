from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from typing import Any


PLUGIN_ROOT = Path(__file__).resolve().parent


def _load_local_module(name: str, filename: str):
    """Load plugin modules without colliding with another plugin's imports."""
    module_name = f"mnemosyne_dashboard_desktop_{name}"
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        return loaded
    spec = importlib.util.spec_from_file_location(module_name, PLUGIN_ROOT / filename)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load Mnemosyne Dashboard module: {filename}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(module_name, None)
        raise
    return module


_config = _load_local_module("config", "config.py")
_dashboard_core = _load_local_module("dashboard_core", "dashboard_core.py")
load_config = _config.load_config
DashboardStore = _dashboard_core.DashboardStore
discover_databases = _dashboard_core.discover_databases


def _clamp(value: int | str | None, *, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value) if value not in (None, "") else default
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(parsed, maximum))


def _profile_name() -> str:
    home = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes"))).expanduser().resolve()
    if home.parent.name == "profiles":
        return home.name
    return "coordinator"


def _store() -> tuple[DashboardStore, Any]:
    # Reads must not create or rewrite dashboard configuration. This matters for
    # Desktop profiles that have not opened the standalone dashboard before.
    cfg = load_config(create=False)
    return DashboardStore(cfg.db_path), cfg


def health_payload() -> dict[str, Any]:
    store, _ = _store()
    diagnostics = store.diagnostics()
    return {
        "ok": bool(diagnostics.get("ok")),
        "profile": _profile_name(),
        "read_only": True,
        "db_path": str(store.db_path),
        "error": diagnostics.get("error", ""),
    }


def overview_payload(days: int | str | None = 30, map_limit: int | str | None = 220) -> dict[str, Any]:
    store, cfg = _store()
    safe_days = _clamp(days, default=30, minimum=7, maximum=365)
    safe_map_limit = _clamp(map_limit, default=220, minimum=40, maximum=400)
    stats = store.stats()
    return {
        "profile": _profile_name(),
        "capabilities": {"read": True, "manage": False, "forget": False},
        "database": {
            "path": str(store.db_path),
            "label": next(
                (
                    item["label"]
                    for item in discover_databases(str(store.db_path), list(cfg.db_paths))
                    if item.get("active")
                ),
                _profile_name(),
            ),
        },
        "stats": stats,
        "activity": store.activity_series(days=safe_days),
        "constellation": store.constellation(limit=safe_map_limit),
    }


def constellation_payload(limit: int | str | None = 240) -> dict[str, Any]:
    store, _ = _store()
    return store.constellation(limit=_clamp(limit, default=240, minimum=40, maximum=600))


def memories_payload(
    *,
    q: str = "",
    kind: str = "all",
    status: str = "active",
    sort: str = "recent",
    limit: int | str | None = 100,
    offset: int | str | None = 0,
) -> dict[str, Any]:
    store, _ = _store()
    safe_limit = _clamp(limit, default=100, minimum=1, maximum=250)
    safe_offset = _clamp(offset, default=0, minimum=0, maximum=100_000)
    items = store.list_memories(
        q=str(q or "")[:240],
        kind=kind if kind in {"all", "working", "episodic"} else "all",
        status=status if status in {"active", "expired", "superseded", "all"} else "active",
        sort=sort if sort in {"recent", "oldest", "importance", "recall"} else "recent",
        limit=safe_limit,
        offset=safe_offset,
    )
    return {"items": items, "count": len(items), "limit": safe_limit, "offset": safe_offset}


def memory_payload(memory_id: str) -> dict[str, Any]:
    store, _ = _store()
    item = store.get_memory(str(memory_id or "")[:240])
    if item is None:
        raise FileNotFoundError(f"Memory not found: {memory_id}")
    return {"item": item, "read_only": True}


def timeline_payload(q: str = "", group: str = "day", limit: int | str | None = 240) -> dict[str, Any]:
    store, _ = _store()
    return store.timeline(
        q=str(q or "")[:240],
        group=group if group in {"day", "session"} else "day",
        limit=_clamp(limit, default=240, minimum=1, maximum=500),
    )
