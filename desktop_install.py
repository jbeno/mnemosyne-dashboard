from __future__ import annotations

import os
import secrets
import shutil
import subprocess
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


def backend_plugin_source() -> Path:
    shared_source = shared_hermes_home() / "plugins" / PLUGIN_ID
    if shared_source.is_dir():
        return shared_source.resolve()
    return Path(__file__).resolve().parent


def profile_homes() -> list[Path]:
    shared = shared_hermes_home()
    homes = [shared] if (shared / "config.yaml").is_file() else []
    profiles = shared / "profiles"
    if profiles.is_dir():
        homes.extend(
            profile
            for profile in sorted(profiles.iterdir())
            if profile.is_dir() and (profile / "config.yaml").is_file()
        )
    return homes


def hermes_executable() -> str | None:
    executable = shutil.which("hermes")
    if executable:
        return executable
    bundled = shared_hermes_home() / "hermes-agent" / "venv" / "bin" / "hermes"
    return str(bundled) if bundled.is_file() else None


def install_profile_backends() -> list[dict[str, Any]]:
    source = backend_plugin_source()
    executable = hermes_executable()
    results: list[dict[str, Any]] = []

    for home in profile_homes():
        target = home / "plugins" / PLUGIN_ID
        linked = False
        warning = ""
        if home != shared_hermes_home():
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_symlink() and target.resolve() == source:
                linked = True
            elif not target.exists() and not target.is_symlink():
                target.symlink_to(source, target_is_directory=True)
                linked = True
            elif target.resolve() != source:
                warning = f"Existing profile plugin was left unchanged: {target}"

        enabled = False
        if executable and not warning:
            environment = os.environ.copy()
            environment["HERMES_HOME"] = str(home)
            try:
                subprocess.run(
                    [executable, "plugins", "enable", PLUGIN_ID, "--no-allow-tool-override"],
                    check=True,
                    capture_output=True,
                    env=environment,
                    text=True,
                    timeout=60,
                )
                enabled = True
            except (OSError, subprocess.SubprocessError) as exc:
                warning = f"Could not enable the backend for {home.name}: {exc}"
        elif not executable:
            warning = "Hermes CLI was not found; enable the backend manually for this profile."

        results.append(
            {
                "profile": "coordinator" if home == shared_hermes_home() else home.name,
                "home": str(home),
                "linked": linked,
                "enabled": enabled,
                "warning": warning,
            }
        )
    return results


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

    profiles = install_profile_backends()

    return {
        "ok": True,
        "source": str(source),
        "target": str(target),
        "profiles": profiles,
        "message": "Desktop plugin installed for the shared UI and discovered Hermes profiles. Restart Hermes Desktop so profile-scoped backend routes reload; Mnemosyne Memory can be disabled in Settings > Plugins.",
    }
