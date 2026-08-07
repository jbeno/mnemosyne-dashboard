from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Query, Request

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

from desktop_api import (  # noqa: E402
    constellation_payload,
    correct_memory_payload,
    forget_memory_payload,
    health_payload,
    memories_payload,
    memory_payload,
    overview_payload,
    timeline_payload,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _translate_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, FileNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    logger.exception("Mnemosyne Desktop API read failed", exc_info=exc)
    return HTTPException(status_code=500, detail="Mnemosyne memory data could not be read.")


@router.get("/health")
def health():
    try:
        return health_payload()
    except Exception as exc:
        raise _translate_error(exc) from exc


def _is_loopback(request: Request) -> bool:
    host = request.client.host if request.client else ""
    return host in {"127.0.0.1", "::1", "localhost", "testclient"}


@router.get("/overview")
def overview(request: Request, days: int = Query(30), map_limit: int = Query(220)):
    try:
        return overview_payload(days=days, map_limit=map_limit, local_request=_is_loopback(request))
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


@router.post("/memory/{memory_id}/correct")
def correct_memory(request: Request, memory_id: str, body: Annotated[dict, Body()]):
    if not _is_loopback(request):
        raise HTTPException(status_code=403, detail="Memory changes are available only from local Hermes Desktop")
    try:
        importance = body.get("importance")
        return correct_memory_payload(
            memory_id,
            str(body.get("content") or ""),
            float(importance) if importance is not None else None,
        )
    except Exception as exc:
        raise _translate_error(exc) from exc


@router.post("/memory/{memory_id}/forget")
def forget_memory(request: Request, memory_id: str):
    if not _is_loopback(request):
        raise HTTPException(status_code=403, detail="Memory changes are available only from local Hermes Desktop")
    try:
        return forget_memory_payload(memory_id)
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
