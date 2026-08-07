from __future__ import annotations

import json
from pathlib import Path

from test_dashboard_core import make_db

import desktop_api
from config import save_config
from desktop_api import (
    correct_memory_payload,
    forget_memory_payload,
    memories_payload,
    memory_payload,
    overview_payload,
    timeline_payload,
)


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


def test_desktop_api_uses_isolated_local_modules():
    assert desktop_api._config.__name__ == "mnemosyne_dashboard_desktop_config"
    assert desktop_api._dashboard_core.__name__ == "mnemosyne_dashboard_desktop_dashboard_core"


def test_native_view_prefers_the_active_profiles_canonical_database(tmp_path, monkeypatch):
    home = tmp_path / "hermes" / "profiles" / "developer"
    canonical = home / "mnemosyne" / "data" / "mnemosyne.db"
    configured = tmp_path / "project-manager.db"
    canonical.parent.mkdir(parents=True)
    make_db(canonical)
    make_db(configured)
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("MNEMOSYNE_DASHBOARD_CONFIG", str(tmp_path / "config.json"))
    save_config(db_path=str(configured))

    payload = overview_payload()

    assert payload["profile"] == "developer"
    assert payload["database"]["path"] == str(canonical.resolve())
    assert payload["database"]["available"] is True


def test_profile_without_memory_database_is_an_empty_ready_view(tmp_path, monkeypatch):
    home = tmp_path / "hermes" / "profiles" / "new-profile"
    missing = tmp_path / "missing.db"
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setenv("MNEMOSYNE_DASHBOARD_CONFIG", str(tmp_path / "config.json"))
    save_config(db_path=str(missing))

    overview = overview_payload()

    assert overview["database"]["available"] is False
    assert overview["stats"]["counts"]["working_memory"] == 0
    assert overview["constellation"]["nodes"] == []
    assert memories_payload()["items"] == []
    assert timeline_payload()["groups"] == []


def test_native_mutations_are_disabled_until_memory_admin_is_enabled(tmp_path, monkeypatch):
    configure_store(tmp_path, monkeypatch)

    try:
        correct_memory_payload("w2", "Corrected content")
    except PermissionError as exc:
        assert "disabled" in str(exc)
    else:
        raise AssertionError("correction should be gated")

    try:
        forget_memory_payload("w2")
    except PermissionError as exc:
        assert "disabled" in str(exc)
    else:
        raise AssertionError("forget should be gated")


def test_local_admin_correction_and_forget_preserve_recoverable_history(tmp_path, monkeypatch):
    configure_store(tmp_path, monkeypatch)
    save_config(host="127.0.0.1", memory_admin_enabled=True)

    overview = overview_payload(local_request=True)
    correction = correct_memory_payload("w2", "YC uses a corrected notes workflow")
    replacement_id = correction["replacement_id"]
    forgotten = forget_memory_payload(replacement_id)

    assert overview["capabilities"] == {"read": True, "manage": True, "forget": True}
    assert correction["ok"] is True
    assert Path(correction["backup"]["path"]).is_file()
    assert memory_payload("w2")["item"]["status"] == "superseded"
    assert forgotten["ok"] is True
    assert Path(forgotten["backup"]["path"]).is_file()
    assert memory_payload(replacement_id)["item"]["status"] == "expired"
