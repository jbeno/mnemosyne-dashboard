from __future__ import annotations

import json
import sqlite3
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from test_dashboard_core import make_db  # noqa: E402

from server import Handler, ThreadingHTTPServer  # noqa: E402


def _resolved(path: Path) -> str:
    return str(path.resolve())


def _request(url: str, method: str = "GET", body: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> tuple[int, dict[str, str], bytes]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req_headers = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, method=method, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()


class ServerHarness:
    def __init__(self, tmp_path: Path, monkeypatch):
        self.db = tmp_path / "mnemosyne.db"
        make_db(self.db)
        monkeypatch.setenv("HERMES_HOME", str(tmp_path / "hermes"))
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.httpd.db_path = self.db
        self.httpd.bind_host = "127.0.0.1"
        self.httpd.bind_port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"

    def close(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)


def test_health_endpoint_and_security_headers(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, headers, body = _request(f"{server.base}/api/health")
        payload = json.loads(body)
        assert status == 200
        assert payload["ok"] is True
        assert payload["read_only"] is True
        assert headers["X-Content-Type-Options"] == "nosniff"
        assert headers["X-Frame-Options"] == "DENY"
        assert "font-src 'self' data:" in headers["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]
    finally:
        server.close()


def test_invalid_limit_query_falls_back_instead_of_500(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/memories?limit=not-a-number")
        payload = json.loads(body)
        assert status == 200
        assert len(payload["items"]) == 6
    finally:
        server.close()


def test_static_path_escape_is_blocked(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/static/%2e%2e/server.py")
        assert status == 404
        assert b"not found" in body
    finally:
        server.close()


def test_favicon_route_serves_icon_without_404(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, headers, body = _request(f"{server.base}/favicon.ico")
        assert status == 200
        assert headers["Content-Type"].startswith("image/png")
        assert body.startswith(b"\x89PNG\r\n\x1a\n")
    finally:
        server.close()


def test_react_dashboard_is_default_and_candidate_alias_is_retained(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        for path in ("/?page=overview", "/candidate?page=overview"):
            status, headers, body = _request(f"{server.base}{path}")
            assert status == 200
            assert headers["Content-Type"].startswith("text/html")
            assert b'<title>Mnemosyne Dashboard</title>' in body
            assert b'/static/candidate/assets/' in body
    finally:
        server.close()


def test_legacy_dashboard_remains_available_as_fallback(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, headers, body = _request(f"{server.base}/legacy?tab=overview")
        assert status == 200
        assert headers["Content-Type"].startswith("text/html")
        assert b'<script src="/static/app.js' in body
        assert b'id="overview"' in body
    finally:
        server.close()


def test_diagnostics_and_session_endpoints(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/diagnostics")
        payload = json.loads(body)
        assert status == 200
        assert payload["ok"] is True
        assert payload["table_counts"]["working_memory"] == 4

        status, _headers, body = _request(f"{server.base}/api/session?id=s2")
        payload = json.loads(body)
        assert status == 200
        assert payload["counts"]["memories"] == 1
        assert payload["counts"]["consolidations"] == 1
    finally:
        server.close()


def test_memory_intelligence_endpoints_are_read_only(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        for path in ("/api/digest/today?day=2026-05-04", "/api/profile/inferred", "/api/constellation?limit=80"):
            status, _headers, body = _request(f"{server.base}{path}")
            payload = json.loads(body)
            assert status == 200
            assert payload["read_only"] is True
    finally:
        server.close()


def test_activity_series_endpoint(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/activity-series?days=30")
        payload = json.loads(body)
        assert status == 200
        assert payload["days"] == 30
        assert len(payload["series"]) == 30
        assert {"date", "memories", "triples", "consolidations", "total"} <= payload["series"][0].keys()
    finally:
        server.close()


def test_persona_and_canonical_endpoints(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/persona?tier=permanent&q=local-only")
        payload = json.loads(body)
        assert status == 200
        assert payload["stats"]["total"] == 1
        assert [row["topic"] for row in payload["items"]] == ["preferences"]

        status, _headers, body = _request(f"{server.base}/api/canonical?owner_id=default&q=Jim")
        payload = json.loads(body)
        assert status == 200
        assert payload["stats"]["total"] == 1
        assert [row["name"] for row in payload["items"]] == ["user_name"]
    finally:
        server.close()


def test_config_post_updates_server_and_database_settings(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        new_db = tmp_path / "other-mnemosyne.db"
        status, _headers, body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"host": "0.0.0.0", "port": "9876", "db_path": str(new_db)},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["config"]["host"] == "0.0.0.0"
        assert payload["config"]["port"] == 9876
        assert payload["config"]["db_path"] == str(new_db)
        assert payload["config"]["local_url"] == "http://127.0.0.1:9876/"

        status, _headers, body = _request(f"{server.base}/api/auth/status")
        payload = json.loads(body)
        assert status == 200
        assert payload["config"]["host"] == "0.0.0.0"
    finally:
        server.close()


def test_remote_control_plane_is_denied_while_auth_is_disabled(tmp_path, monkeypatch):
    monkeypatch.setattr(Handler, '_client_is_loopback', lambda self: False)
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/auth/status")
        assert status == 200
        assert json.loads(body)["can_backup"] is False

        status, _headers, body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"auth_enabled": True, "password": "attacker", "memory_admin_enabled": True},
        )
        assert status == 403
        assert b"localhost or password authentication" in body

        status, _headers, body = _request(f"{server.base}/api/admin/backup", method="POST", body={})
        assert status == 403
        assert b"localhost or password authentication" in body

        status, _headers, body = _request(
            f"{server.base}/api/databases/select",
            method="POST",
            body={"path": str(server.db)},
        )
        assert status == 403
        assert b"localhost or password authentication" in body
    finally:
        server.close()


def test_authenticated_remote_control_plane_remains_available(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        remote_db = tmp_path / "hermes" / "profiles" / "developer" / "mnemosyne" / "data" / "mnemosyne.db"
        make_db(_mkparents(remote_db))
        status, _headers, _body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"host": "0.0.0.0", "auth_enabled": True, "password": "correct horse battery staple"},
        )
        assert status == 200

        monkeypatch.setattr(Handler, "_client_is_loopback", lambda self: False)
        status, headers, body = _request(
            f"{server.base}/api/auth/login",
            method="POST",
            body={"password": "correct horse battery staple"},
        )
        assert status == 200
        assert json.loads(body)["can_backup"] is True
        cookie = headers["Set-Cookie"].split(";", 1)[0]

        status, _headers, body = _request(
            f"{server.base}/api/admin/backup",
            method="POST",
            body={},
            headers={"Cookie": cookie},
        )
        assert status == 200
        assert Path(json.loads(body)["backup"]["path"]).exists()

        status, _headers, body = _request(
            f"{server.base}/api/databases/select",
            method="POST",
            body={"path": str(remote_db)},
            headers={"Cookie": cookie},
        )
        assert status == 200
        assert json.loads(body)["active"] == _resolved(remote_db)

        status, _headers, body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"port": 8766},
            headers={"Cookie": cookie},
        )
        assert status == 200
        assert json.loads(body)["config"]["port"] == 8766
    finally:
        server.close()


def test_local_backup_does_not_require_memory_admin_and_is_audited(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/auth/status")
        assert status == 200
        assert json.loads(body)["can_backup"] is True

        status, _headers, body = _request(f"{server.base}/api/admin/backup", method="POST", body={})
        payload = json.loads(body)
        assert status == 200
        assert Path(payload["backup"]["path"]).exists()

        status, _headers, body = _request(f"{server.base}/api/admin/audit")
        assert status == 200
        assert json.loads(body)["items"][0]["action"] == "backup"
    finally:
        server.close()


def test_bulk_memory_endpoint_is_all_or_none_with_one_backup(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, _body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"host": "127.0.0.1", "memory_admin_enabled": True},
        )
        assert status == 200

        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/bulk",
            method="POST",
            body={"memory_ids": ["w1", "w2"], "action": "importance", "value": 0.72},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["count"] == 2
        assert Path(payload["backup"]["path"]).exists()
        assert len(list(Path(payload["backup"]["path"]).parent.glob("*.db"))) == 1

        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/bulk",
            method="POST",
            body={"memory_ids": ["w1", "missing"], "action": "importance", "value": 0.2},
        )
        assert status == 400
        assert b"memory not found" in body
        status, _headers, body = _request(f"{server.base}/api/memory?id=w1")
        assert json.loads(body)["item"]["importance"] == 0.72
        assert len(list(Path(payload["backup"]["path"]).parent.glob("*.db"))) == 1
    finally:
        server.close()



def test_admin_memory_mutation_endpoints_allow_localhost_admin_without_auth_and_audit(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/invalidate",
            method="POST",
            body={"memory_id": "w1"},
        )
        assert status == 403
        assert b"admin mode is disabled" in body

        status, _headers, body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"host": "127.0.0.1", "memory_admin_enabled": True},
        )
        assert status == 200
        payload = json.loads(body)
        assert payload["config"]["host"] == "127.0.0.1"
        assert payload["config"]["memory_admin_enabled"] is True

        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/veracity",
            method="POST",
            body={"memory_id": "w2", "veracity": "stated"},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["item"]["veracity"] == "stated"

        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/expiry",
            method="POST",
            body={"memory_id": "w3", "valid_until": "2026-06-01T00:00:00"},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["item"]["valid_until"] == "2026-06-01T00:00:00"

        status, _headers, body = _request(
            f"{server.base}/api/admin/memory/supersede",
            method="POST",
            body={"memory_id": "w1", "content": "YC prefers private local memory", "importance": 0.91},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["replacement_id"].startswith("dash_")
        assert Path(payload["backup"]["path"]).exists()

        status, _headers, body = _request(f"{server.base}/api/memory?id=w1")
        assert json.loads(body)["item"]["status"] == "superseded"

        status, _headers, body = _request(f"{server.base}/api/admin/audit")
        audit = json.loads(body)["items"]
        assert status == 200
        assert audit[0]["action"] == "supersede"
    finally:
        server.close()


def test_databases_endpoint_lists_active_and_discovered_brains(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        # Create per-profile brains under HERMES_HOME so auto-discovery finds them.
        home = tmp_path / "hermes"
        pm = home / "profiles" / "project-manager" / "mnemosyne" / "data" / "mnemosyne.db"
        make_db(_mkparents(pm))

        status, _headers, body = _request(f"{server.base}/api/databases")
        payload = json.loads(body)
        assert status == 200
        assert "databases" in payload and "active" in payload
        by_path = {d["path"]: d for d in payload["databases"]}
        assert by_path[_resolved(server.db)]["active"] is True
        assert by_path[_resolved(pm)]["label"] == "project-manager"
        assert all("size_bytes" in d for d in payload["databases"])
    finally:
        server.close()


def _mkparents(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def test_databases_select_hot_swaps_active_brain(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(f"{server.base}/api/stats")
        assert json.loads(body)["counts"]["working_memory"] == 4

        home = tmp_path / "hermes"
        pm = home / "profiles" / "project-manager" / "mnemosyne" / "data" / "mnemosyne.db"
        make_db(_mkparents(pm))
        # Make this brain distinguishable from the active one.
        con = sqlite3.connect(pm)
        con.execute(
            "INSERT INTO working_memory(id,content,source,timestamp,session_id,importance,scope) VALUES (?,?,?,?,?,?,?)",
            ("w5", "extra brain memory", "preference", "2026-06-01T00:00:00", "s9", 0.5, "global"),
        )
        con.commit()
        con.close()

        status, _headers, body = _request(
            f"{server.base}/api/databases/select", method="POST", body={"path": str(pm)},
        )
        payload = json.loads(body)
        assert status == 200
        assert payload["ok"] is True
        assert payload["active"] == _resolved(pm)
        assert payload["persisted"] is False

        status, _headers, body = _request(f"{server.base}/api/admin/audit")
        assert status == 200
        selection = json.loads(body)["items"][0]
        assert selection["action"] == "database_select"
        assert selection["before"]["path"] == str(server.db)
        assert selection["after"]["path"] == _resolved(pm)

        status, _headers, body = _request(f"{server.base}/api/stats")
        assert json.loads(body)["counts"]["working_memory"] == 5
    finally:
        server.close()


def test_databases_select_rejects_path_outside_allowlist(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, body = _request(
            f"{server.base}/api/databases/select", method="POST", body={"path": "/etc/passwd"},
        )
        payload = json.loads(body)
        assert status == 400
        assert payload["ok"] is False
        assert "allowlist" in payload["error"]

        # Active DB unchanged.
        status, _headers, body = _request(f"{server.base}/api/stats")
        assert json.loads(body)["counts"]["working_memory"] == 4
    finally:
        server.close()


def test_databases_select_requires_auth_when_enabled(tmp_path, monkeypatch):
    server = ServerHarness(tmp_path, monkeypatch)
    try:
        status, _headers, _body = _request(
            f"{server.base}/api/config",
            method="POST",
            body={"auth_enabled": True, "password": "hunter2"},
        )
        assert status == 200

        status, _headers, body = _request(
            f"{server.base}/api/databases/select", method="POST", body={"path": str(server.db)},
        )
        assert status == 401
        assert b"auth required" in body
    finally:
        server.close()
