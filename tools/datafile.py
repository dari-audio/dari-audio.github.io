#!/usr/bin/env python3
"""Safe helpers for the single-line content file js/data.js."""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "js" / "data.js"
INDEX_FILE = ROOT / "index.html"
VERSION_RE = re.compile(r"\?v=[^\"']+")


def load_data(path: Path = DATA_FILE) -> dict:
    """Read window.DARI_DATA = {...}; from data.js and return the object."""
    text = path.read_text(encoding="utf-8")
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"Could not find a JSON object in {path}")
    return json.loads(text[start : end + 1])


def _write_atomic(path: Path, text: str) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def save_data(data: dict, path: Path = DATA_FILE) -> None:
    """Write the object back in the compact format the site expects."""
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    _write_atomic(path, "window.DARI_DATA = " + payload + ";\n")


def current_version(index: Path = INDEX_FILE) -> Optional[str]:
    text = index.read_text(encoding="utf-8")
    match = VERSION_RE.search(text)
    return match.group(0)[3:] if match else None


def bump_version(index: Path = INDEX_FILE, version: Optional[str] = None) -> Tuple[str, int]:
    """Set a fresh ?v= value on every local asset reference in index.html."""
    if version is None:
        version = datetime.now().strftime("%Y%m%d-%H%M")
    text = index.read_text(encoding="utf-8")
    text, count = VERSION_RE.subn("?v=" + version, text)
    if count == 0:
        raise ValueError(f"No ?v= query strings found in {index}")
    _write_atomic(index, text)
    return version, count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bump", action="store_true", help="set a fresh ?v= value on all local assets")
    parser.add_argument("--version", help="version value for --bump (default: current time)")
    parser.add_argument("--show", action="store_true", help="show the current ?v= lines")
    args = parser.parse_args()

    if args.bump:
        version, count = bump_version(version=args.version)
        print(f"Updated {count} asset version(s) to {version}.")

    if args.show or not args.bump:
        for line in INDEX_FILE.read_text(encoding="utf-8").splitlines():
            if "?v=" in line:
                print(line.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
