from __future__ import annotations

import os
import secrets
import shutil
from pathlib import Path
from typing import Any

PLUGIN_ID = "mnemosyne-dashboard"


def shared_hermes_home() -> Path:
    configured = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes"))).expanduser().resolve()
    if configured.parent.name == "profiles":
        return configured.parent.parent
    return configured


def desktop_plugin_source() -> Path:
    return Path(__file__).resolve().parent / "desktop" / "plugin.js"


def desktop_plugin_target() -> Path:
    return shared_hermes_home() / "desktop-plugins" / PLUGIN_ID / "plugin.js"


def install_desktop_plugin() -> dict[str, Any]:
    source = desktop_plugin_source()
    if not source.is_file():
        raise FileNotFoundError(f"Built Desktop plugin not found: {source}")

    target = desktop_plugin_target()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.parent.chmod(0o700)
    temporary = target.with_name(f".{target.name}.{secrets.token_hex(8)}.tmp")
    try:
        shutil.copyfile(source, temporary)
        temporary.chmod(0o600)
        os.replace(temporary, target)
        target.chmod(0o600)
    finally:
        temporary.unlink(missing_ok=True)

    return {
        "ok": True,
        "source": str(source),
        "target": str(target),
        "message": "Desktop plugin installed. In Hermes Desktop, open Settings > Plugins, select Rescan, then enable Mnemosyne Memory.",
    }
