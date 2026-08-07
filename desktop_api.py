from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from config import load_config
from dashboard_core import DashboardStore, discover_databases


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
