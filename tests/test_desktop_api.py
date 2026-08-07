from __future__ import annotations

import json
from pathlib import Path

from config import save_config
from desktop_api import memories_payload, memory_payload, overview_payload, timeline_payload
from test_dashboard_core import make_db


def configure_store(tmp_path: Path, monkeypatch):
    home = tmp_path / "hermes" / "profiles" / "developer"
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("MNEMOSYNE_DASHBOARD_CONFIG", str(tmp_path / "config.json"))
    db = tmp_path / "mnemosyne.db"
    make_db(db)
    save_config(db_path=str(db))
    return db


def test_overview_is_profile_aware_and_read_only(tmp_path, monkeypatch):
    db = configure_store(tmp_path, monkeypatch)

    payload = overview_payload(days=30, map_limit=120)

    assert payload["profile"] == "developer"
    assert payload["database"]["path"] == str(db)
    assert payload["capabilities"] == {"read": True, "manage": False, "forget": False}
    assert payload["stats"]["counts"]["working_memory"] == 4
    assert payload["stats"]["counts"]["episodic_memory"] == 2
    assert payload["constellation"]["read_only"] is True
    assert payload["constellation"]["nodes"]


def test_memories_and_detail_are_bounded_read_views(tmp_path, monkeypatch):
    configure_store(tmp_path, monkeypatch)

    result = memories_payload(q="Obsidian", limit=9999)
    detail = memory_payload("w2")

    assert result["limit"] == 250
    assert result["count"] == 1
    assert result["items"][0]["id"] == "w2"
    assert detail["read_only"] is True
    assert detail["item"]["content"] == "YC uses Obsidian for notes"


def test_timeline_groups_profile_memory_without_writes(tmp_path, monkeypatch):
    configure_store(tmp_path, monkeypatch)

    payload = timeline_payload(q="Mnemosyne", group="session", limit=50)

    assert payload["group"] == "session"
    assert payload["groups"]
    assert any(event["type"] == "memory" for group in payload["groups"] for event in group["events"])


def test_dashboard_manifest_mounts_hidden_profile_api():
    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / "dashboard" / "manifest.json").read_text())

    assert manifest["name"] == "mnemosyne-dashboard"
    assert manifest["api"] == "plugin_api.py"
    assert manifest["tab"]["hidden"] is True
