#!/usr/bin/env python3
"""Compare the Bun lockfile with a package/version IOC CSV without network access."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LOCK_ENTRY = re.compile(r'^\s{4}"(?P<name>[^"]+)"\s*:\s*\["(?P<resolved>[^"]+)"')


def lock_packages(path: Path) -> dict[str, str]:
    packages: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = LOCK_ENTRY.match(line)
        if not match:
            continue
        name = match.group("name")
        resolved = match.group("resolved")
        version = resolved.rsplit("@", 1)[-1]
        packages[name] = version
    return packages


def iocs(path: Path) -> dict[str, set[str]]:
    rows: dict[str, set[str]] = {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            name = (row.get("Package") or "").strip()
            versions = {
                version.strip()
                for version in (row.get("Malicious Versions") or "").split(",")
                if version.strip()
            }
            if name:
                rows[name] = versions
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ioc_csv", type=Path, help="CSV with Package and Malicious Versions columns")
    parser.add_argument("--lock", type=Path, default=ROOT / "frontend" / "bun.lock")
    args = parser.parse_args()

    installed = lock_packages(args.lock)
    known = iocs(args.ioc_csv)
    namespace_matches = sorted(set(installed) & set(known))
    malicious = [
        (name, installed[name])
        for name in namespace_matches
        if installed[name] in known[name]
    ]

    print(f"Audited {len(installed)} locked packages against {len(known)} IOC package names.")
    if malicious:
        for name, version in malicious:
            print(f"MALICIOUS VERSION MATCH: {name}@{version}")
        return 1
    if namespace_matches:
        for name in namespace_matches:
            print(f"IOC package name present at a different version: {name}@{installed[name]}")
        return 2
    print("No IOC package names or malicious versions found in frontend/bun.lock.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
