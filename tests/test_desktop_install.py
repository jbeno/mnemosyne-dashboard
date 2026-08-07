from __future__ import annotations

import re
from pathlib import Path

import desktop_install


def test_desktop_installer_targets_shared_home_from_profile(tmp_path, monkeypatch):
    shared = tmp_path / "hermes"
    monkeypatch.setenv("HERMES_HOME", str(shared / "profiles" / "developer"))
    source = tmp_path / "plugin.js"
    source.write_text("export default {}\n")
    monkeypatch.setattr(desktop_install, "desktop_plugin_source", lambda: source)

    result = desktop_install.install_desktop_plugin()
    target = shared / "desktop-plugins" / "mnemosyne-dashboard" / "plugin.js"

    assert result["target"] == str(target)
    assert target.read_text() == "export default {}\n"
    assert target.stat().st_mode & 0o777 == 0o600


def test_desktop_installer_links_and_enables_profile_backends(tmp_path, monkeypatch):
    shared = tmp_path / "hermes"
    source = shared / "plugins" / "mnemosyne-dashboard"
    source.mkdir(parents=True)
    (shared / "config.yaml").write_text("plugins: {}\n")
    developer = shared / "profiles" / "developer"
    developer.mkdir(parents=True)
    (developer / "config.yaml").write_text("plugins: {}\n")
    desktop_source = tmp_path / "plugin.js"
    desktop_source.write_text("export default {}\n")
    calls = []

    monkeypatch.setenv("HERMES_HOME", str(shared))
    monkeypatch.setattr(desktop_install, "desktop_plugin_source", lambda: desktop_source)
    monkeypatch.setattr(desktop_install, "hermes_executable", lambda: "/test/hermes")

    def fake_run(command, **kwargs):
        calls.append((command, kwargs["env"]["HERMES_HOME"]))

    monkeypatch.setattr(desktop_install.subprocess, "run", fake_run)

    result = desktop_install.install_desktop_plugin()

    assert (developer / "plugins" / "mnemosyne-dashboard").resolve() == source
    assert calls == [
        (["/test/hermes", "plugins", "enable", "mnemosyne-dashboard", "--no-allow-tool-override"], str(shared)),
        (["/test/hermes", "plugins", "enable", "mnemosyne-dashboard", "--no-allow-tool-override"], str(developer)),
    ]
    assert [profile["enabled"] for profile in result["profiles"]] == [True, True]


def test_checked_in_desktop_bundle_only_imports_host_runtime_modules():
    root = Path(__file__).resolve().parents[1]
    source = (root / "desktop" / "plugin.js").read_text()
    imports = set(re.findall(r'from\s*["\']([^"\']+)["\']', source))

    assert imports <= {"@hermes/plugin-sdk", "react", "react/jsx-runtime"}
