#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from desktop_install import install_desktop_plugin  # noqa: E402


if __name__ == "__main__":
    print(json.dumps(install_desktop_plugin(), indent=2))
