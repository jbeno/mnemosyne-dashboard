from __future__ import annotations

import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

from desktop_api import (  # noqa: E402
    constellation_payload,
    health_payload,
    memories_payload,
    memory_payload,
    overview_payload,
    timeline_payload,
)

router = APIRouter()


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, FileNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail="Mnemosyne memory data could not be read.")


@router.get("/health")
def health():
    try:
        return health_payload()
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.get("/overview")
def overview(days: int = Query(30), map_limit: int = Query(220)):
    try:
        return overview_payload(days=days, map_limit=map_limit)
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.get("/constellation")
def constellation(limit: int = Query(240)):
    try:
        return constellation_payload(limit=limit)
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.get("/memories")
def memories(
    q: str = Query("", max_length=240),
    kind: str = Query("all"),
    status: str = Query("active"),
    sort: str = Query("recent"),
    limit: int = Query(100),
    offset: int = Query(0),
):
    try:
        return memories_payload(q=q, kind=kind, status=status, sort=sort, limit=limit, offset=offset)
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.get("/memory/{memory_id}")
def memory(memory_id: str):
    try:
        return memory_payload(memory_id)
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.get("/timeline")
def timeline(
    q: str = Query("", max_length=240),
    group: str = Query("day"),
    limit: int = Query(240),
):
    try:
        return timeline_payload(q=q, group=group, limit=limit)
    except Exception as exc:
        raise _translate_error(exc) from exc
