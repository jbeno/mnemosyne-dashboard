#!/usr/bin/env python3
"""Generate mock-data screenshots for the README gallery.

This script intentionally builds a temporary SQLite database with fictional
records. It never reads the user's real Mnemosyne database.
"""

from __future__ import annotations

import base64
import json
import os
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

try:
    import websocket
except ImportError as exc:  # pragma: no cover - optional local utility
    raise SystemExit("websocket-client is required to generate screenshots") from exc

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "screenshots"
TMP_DIR = Path("/tmp/mnemosyne-dashboard-screenshots")
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def make_mock_db(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE working_memory (
            id TEXT PRIMARY KEY, content TEXT NOT NULL, source TEXT, timestamp TEXT,
            session_id TEXT DEFAULT 'default', importance REAL DEFAULT 0.5,
            metadata_json TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recall_count INTEGER DEFAULT 0, last_recalled TIMESTAMP DEFAULT NULL,
            valid_until TIMESTAMP DEFAULT NULL, superseded_by TEXT DEFAULT NULL,
            scope TEXT DEFAULT 'global', author_id TEXT, author_type TEXT, channel_id TEXT
        );
        CREATE TABLE episodic_memory (
            rowid INTEGER PRIMARY KEY AUTOINCREMENT,
            id TEXT UNIQUE NOT NULL, content TEXT NOT NULL, source TEXT, timestamp TEXT,
            session_id TEXT DEFAULT 'default', importance REAL DEFAULT 0.5,
            metadata_json TEXT, summary_of TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            recall_count INTEGER DEFAULT 0, last_recalled TIMESTAMP DEFAULT NULL,
            valid_until TIMESTAMP DEFAULT NULL, superseded_by TEXT DEFAULT NULL,
            scope TEXT DEFAULT 'global', author_id TEXT, author_type TEXT, channel_id TEXT
        );
        CREATE TABLE triples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL, predicate TEXT NOT NULL, object TEXT NOT NULL,
            valid_from TEXT NOT NULL, valid_until TEXT, source TEXT, confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE consolidation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, items_consolidated INTEGER,
            summary_preview TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )
    working = [
        (
            "wm-001",
            "User prefers local-first memory tools with clear provenance, fast search, and no cloud calls for private chat data.",
            "preference",
            "2026-05-04T08:15:00",
            "product_strategy_20260504",
            0.92,
            "global",
            7,
        ),
        (
            "wm-002",
            "The Mnemosyne dashboard should feel premium on mobile, with compact controls, readable cards, and zero horizontal overflow.",
            "insight",
            "2026-05-04T09:30:00",
            "design_review_20260504",
            0.86,
            "session",
            5,
        ),
        (
            "wm-003",
            "Use token-prefix search: 'Dian' should match Diana but not the middle of Obsidian.",
            "debugging",
            "2026-05-04T10:05:00",
            "search_quality_20260504",
            0.81,
            "global",
            4,
        ),
        (
            "wm-004",
            "Graph view should make relationships explorable without exposing write actions in the browser.",
            "security",
            "2026-05-04T10:45:00",
            "graph_review_20260504",
            0.74,
            "global",
            3,
        ),
        (
            "wm-005",
            "Short phone-landscape screens should keep the compact top bar and avoid desktop sidebar takeover.",
            "ux",
            "2026-05-04T11:20:00",
            "mobile_layout_20260504",
            0.79,
            "session",
            6,
        ),
        (
            "wm-006",
            "Settings should keep authentication optional and transparent: disabled by default, password stored as salt/hash only.",
            "security",
            "2026-05-04T12:00:00",
            "auth_review_20260504",
            0.69,
            "global",
            2,
        ),
    ]
    con.executemany(
        """
        INSERT INTO working_memory(id,content,source,timestamp,session_id,importance,scope,recall_count)
        VALUES (?,?,?,?,?,?,?,?)
        """,
        working,
    )
    episodic = [
        (
            "em-001",
            "Published the dashboard as a GitHub-ready Hermes plugin with README, CI, license, security notes, and read-only SQLite access.",
            "task",
            "2026-05-03T17:25:34",
            "release_hardening_20260503",
            0.77,
            "session",
            "wm-001,wm-004",
            3,
        ),
        (
            "em-002",
            "Refined the mobile overview so stat cards, memory pills, and long session identifiers fit within the viewport.",
            "task",
            "2026-05-04T09:45:00",
            "mobile_layout_20260504",
            0.72,
            "session",
            "wm-002,wm-005",
            5,
        ),
        (
            "em-003",
            "Tightened search behavior across Memories, Global Search, Recall Debugger, Timeline, Graph, Triples, and Consolidations.",
            "debugging",
            "2026-05-04T10:50:00",
            "search_quality_20260504",
            0.83,
            "global",
            "wm-003",
            4,
        ),
        (
            "em-004",
            "Added a visible mobile top-bar theme toggle while keeping the desktop sidebar theme switch in sync.",
            "ux",
            "2026-05-04T12:06:00",
            "design_review_20260504",
            0.68,
            "session",
            "wm-002,wm-005",
            2,
        ),
    ]
    con.executemany(
        """
        INSERT INTO episodic_memory(id,content,source,timestamp,session_id,importance,scope,summary_of,recall_count)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        episodic,
    )
    triples = [
        ("Mnemosyne Dashboard", "reads", "SQLite memory store", "2026-05-03", "architecture", 0.98),
        ("Mnemosyne Dashboard", "serves", "local web UI", "2026-05-03", "architecture", 0.96),
        ("Local web UI", "supports", "dark theme", "2026-05-04", "design", 0.94),
        ("Local web UI", "supports", "light theme", "2026-05-04", "design", 0.94),
        ("Search", "uses", "token-prefix matching", "2026-05-04", "debugging", 0.91),
        ("Graph", "visualizes", "triples", "2026-05-04", "feature", 0.89),
        ("Timeline", "groups by", "session", "2026-05-04", "feature", 0.88),
        ("Settings", "controls", "optional password auth", "2026-05-04", "security", 0.87),
        ("Mobile header", "contains", "theme toggle", "2026-05-04", "ux", 0.85),
        ("Dashboard", "avoids", "external JavaScript dependencies", "2026-05-03", "security", 0.93),
    ]
    con.executemany(
        "INSERT INTO triples(subject,predicate,object,valid_from,source,confidence) VALUES (?,?,?,?,?,?)",
        triples,
    )
    consolidations = [
        ("release_hardening_20260503", 8, "Repository publication checklist: README, CI, security headers, path traversal tests."),
        ("mobile_layout_20260504", 14, "Mobile layout fixes for overview cards, top bar, timeline headers, and landscape mode."),
        ("search_quality_20260504", 6, "Search semantics consolidated around token-prefix behavior and shared backend helpers."),
        ("design_review_20260504", 5, "Theme switch moved into mobile top bar; brand spacing adjusted for script M overhang."),
    ]
    con.executemany(
        "INSERT INTO consolidation_log(session_id,items_consolidated,summary_preview) VALUES (?,?,?)",
        consolidations,
    )
    con.commit()
    con.close()


class ChromeSession:
    def __init__(self, port: int, url: str, width: int, height: int, mobile: bool) -> None:
        self.port = port
        self.url = url
        self.width = width
        self.height = height
        self.mobile = mobile
        self.proc: subprocess.Popen[bytes] | None = None
        self.ws: websocket.WebSocket | None = None
        self.counter = 0

    def __enter__(self) -> ChromeSession:
        if not CHROME.exists():
            raise SystemExit(f"Chrome not found at {CHROME}")
        self.proc = subprocess.Popen(
            [
                str(CHROME),
                "--headless=new",
                "--disable-gpu",
                f"--remote-debugging-port={self.port}",
                "--remote-allow-origins=*",
                f"--window-size={self.width},{self.height}",
                self.url,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        deadline = time.time() + 20
        tabs: list[dict[str, Any]] = []
        while time.time() < deadline:
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json", timeout=1))
                if tabs:
                    break
            except Exception:
                time.sleep(0.2)
        tab = next(tab for tab in tabs if tab.get("type") == "page")
        # Some slower machines need more than one API round-trip window before
        # React resolves the active profile. Keep the CDP socket open through
        # the explicit readiness checks in prepare().
        self.ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=30)
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": self.width,
                "height": self.height,
                "deviceScaleFactor": 2 if self.mobile else 1,
                "mobile": self.mobile,
            },
        )
        return self

    def __exit__(self, *exc: object) -> None:
        if self.ws is not None:
            self.ws.close()
        if self.proc is not None:
            self.proc.terminate()
            self.proc.wait(timeout=10)

    def call(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if self.ws is None:
            raise RuntimeError("Chrome session not started")
        self.counter += 1
        self.ws.send(json.dumps({"id": self.counter, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.counter:
                return msg

    def prepare(self, theme: str, tab: str) -> dict[str, Any]:
        page_map = {
            "overview": "overview",
            "today": "today",
            "profile": "context",
            "constellation": "visualizer",
            "neural": "visualizer",
            "search": "memories",
            "graph": "graph",
            "timelineView": "history",
            "settings": "settings",
        }
        page = page_map.get(tab, tab)
        query = urllib.parse.urlencode({"page": page, **({"q": "dashboard"} if tab == "search" else {})})
        self.call("Page.navigate", {"url": self.url})
        self.call("Page.loadEventFired")
        self.call(
            "Runtime.evaluate",
            {"expression": f"localStorage.setItem('mnemosyne-dashboard-theme', {json.dumps(theme)})"},
        )
        self.call("Page.navigate", {"url": f"{self.url}?{query}"})
        self.call("Page.loadEventFired")
        expr = f"""
        (async()=>{{
          for (let i = 0; i < 100 && !document.querySelector('main h1'); i++) {{
            await new Promise(r=>setTimeout(r,100));
          }}
          if (!document.querySelector('main h1')) throw new Error('React dashboard did not initialise');
          const databaseSelector = () => document.querySelector('[aria-label="Active memory database"]');
          const databaseLabel = () => databaseSelector()?.querySelector('span.flex-1')?.textContent?.trim() || '';
          for (let i = 0; i < 150; i++) {{
            const label = databaseLabel();
            if (label && !label.startsWith('Loading')) break;
            await new Promise(r=>setTimeout(r,100));
          }}
          const loadedDatabaseLabel = databaseLabel();
          if (!loadedDatabaseLabel || loadedDatabaseLabel.startsWith('Loading')) {{
            throw new Error('Active memory database did not finish loading');
          }}
          let neuralCenter = null;
          if ({json.dumps(tab)} === 'neural') {{
            const neural = [...document.querySelectorAll('[role="tab"]')].find(button => button.textContent?.trim() === 'Neural map');
            if (!neural) throw new Error('Neural map tab was not found');
            const rect = neural.getBoundingClientRect();
            neuralCenter = {{x: rect.left + rect.width / 2, y: rect.top + rect.height / 2}};
          }}
          window.scrollTo(0,0);
          const doc = document.documentElement;
          return {{scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, title: document.title, page: {json.dumps(page)}, database: loadedDatabaseLabel, neuralCenter}};
        }})()
        """
        res = self.call("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
        evaluation = res.get("result", {})
        remote = evaluation.get("result", {})
        if "exceptionDetails" in evaluation or "value" not in remote:
            description = remote.get("description", "React screenshot preparation failed")
            raise RuntimeError(description)
        metrics = remote["value"]
        neural_center = metrics.pop("neuralCenter", None)
        if tab == "neural":
            if not neural_center:
                raise RuntimeError("Neural map tab coordinates were not resolved")
            pointer = {"x": neural_center["x"], "y": neural_center["y"], "button": "left", "clickCount": 1}
            self.call("Input.dispatchMouseEvent", {"type": "mousePressed", **pointer})
            self.call("Input.dispatchMouseEvent", {"type": "mouseReleased", **pointer})
        settled = self.call(
            "Runtime.evaluate",
            {
                "expression": "(async()=>{await new Promise(r=>setTimeout(r,2200)); return document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim() || '';})()",
                "awaitPromise": True,
                "returnByValue": True,
            },
        )
        selected_tab = settled.get("result", {}).get("result", {}).get("value", "")
        if tab == "neural" and selected_tab != "Neural map":
            raise RuntimeError(f"Neural map tab did not activate (selected: {selected_tab or 'none'})")
        metrics["selected_tab"] = selected_tab
        return metrics

    def screenshot(self, path: Path) -> None:
        data = self.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})["result"]["data"]
        path.write_bytes(base64.b64decode(data))


def wait_for_server(url: str) -> None:
    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.2)
    raise RuntimeError(f"Server did not become ready: {url}")


def run() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    db_path = TMP_DIR / "hermes" / "profiles" / "demo" / "mnemosyne" / "data" / "mnemosyne.db"
    make_mock_db(db_path)
    config_path = TMP_DIR / "config.json"
    config_path.write_text(
        json.dumps({"db_path": str(db_path), "db_paths": [], "auth_enabled": False}),
        encoding="utf-8",
    )
    port = free_port()
    base_url = f"http://127.0.0.1:{port}/"
    server = subprocess.Popen(
        [sys.executable, str(ROOT / "server.py"), "--host", "127.0.0.1", "--port", str(port), "--db", str(db_path)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env={
            **os.environ,
            "HERMES_HOME": str(TMP_DIR / "hermes"),
            "MNEMOSYNE_DASHBOARD_CONFIG": str(config_path),
        },
    )
    try:
        wait_for_server(f"{base_url}api/health")
        shots = [
            ("desktop-dark-overview.png", 1440, 1000, False, "dark", "overview"),
            ("desktop-dark-today.png", 1440, 1000, False, "dark", "today"),
            ("desktop-dark-profile.png", 1440, 1000, False, "dark", "profile"),
            ("desktop-dark-constellation.png", 1440, 1000, False, "dark", "constellation"),
            ("desktop-dark-neural.png", 1440, 1000, False, "dark", "neural"),
            ("desktop-dark-search.png", 1440, 1000, False, "dark", "search"),
            ("desktop-dark-graph.png", 1440, 1000, False, "dark", "graph"),
            ("desktop-dark-timeline.png", 1440, 1000, False, "dark", "timelineView"),
            ("desktop-dark-settings.png", 1440, 1000, False, "dark", "settings"),
            ("mobile-dark-overview.png", 390, 844, True, "dark", "overview"),
            ("mobile-dark-today.png", 390, 844, True, "dark", "today"),
            ("mobile-dark-profile.png", 390, 844, True, "dark", "profile"),
            ("mobile-dark-constellation.png", 390, 844, True, "dark", "constellation"),
            ("mobile-dark-neural.png", 390, 844, True, "dark", "neural"),
            ("mobile-dark-search.png", 390, 844, True, "dark", "search"),
            ("mobile-dark-timeline.png", 390, 844, True, "dark", "timelineView"),
            ("mobile-dark-graph.png", 390, 844, True, "dark", "graph"),
            ("mobile-dark-settings.png", 390, 844, True, "dark", "settings"),
        ]
        manifest: list[dict[str, Any]] = []
        for idx, (name, width, height, mobile, theme, tab) in enumerate(shots):
            with ChromeSession(9330 + idx, base_url, width, height, mobile) as chrome:
                metrics = chrome.prepare(theme, tab)
                out = OUT_DIR / name
                chrome.screenshot(out)
                manifest.append({"file": name, "theme": theme, "tab": tab, "viewport": f"{width}x{height}", **metrics})
                print(f"wrote {out.relative_to(ROOT)}")
        (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    run()
