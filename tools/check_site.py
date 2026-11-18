#!/usr/bin/env python3
"""Validate the live static site before publishing."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "js" / "data.js"
APP_FILE = ROOT / "js" / "app.js"
INDEX_FILE = ROOT / "index.html"
CSS_FILE = ROOT / "css" / "style.css"

ASSET_RE = re.compile(r"""["'](assets/[^"']+)["']""")
VERSION_RE = re.compile(r"\?v=([^\"']+)")
LINK_RE = re.compile(r"""(?:src|href)="([^"]+)\"""")
MERGE_MARKERS = ("<<<<<<<", ">>>>>>>")
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac", ".opus", ".wma"}

errors = []
warnings = []


def error(message: str) -> None:
    errors.append(message)


def warn(message: str) -> None:
    warnings.append(message)


def parse_data():
    text = DATA_FILE.read_text(encoding="utf-8")
    if "window.DARI_DATA" not in text:
        raise ValueError("js/data.js does not contain window.DARI_DATA")
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("js/data.js does not contain a JSON object")
    return json.loads(text[start : end + 1])


def count_files(path: Path, extensions=None) -> int:
    if not path.exists():
        return 0
    return sum(
        1
        for item in path.rglob("*")
        if item.is_file() and (extensions is None or item.suffix.lower() in extensions)
    )


def expect_count(counts: dict, key: str, actual: int) -> None:
    if key not in counts:
        error(f"meta.counts.{key} is missing")
    elif counts[key] != actual:
        error(f"meta.counts.{key}={counts[key]}, but the data has {actual}")


def expect_meta(meta: dict, key: str, actual: int) -> None:
    if key not in meta:
        error(f"meta.{key} is missing")
    elif meta[key] != actual:
        error(f"meta.{key}={meta[key]}, but the data has {actual}")


def tracked_files():
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [name for name in raw.decode("utf-8").split("\0") if name]


def main() -> int:
    try:
        data = parse_data()
    except Exception as exc:
        print(f"ERROR: {exc}")
        return 1

    for key in ("meta", "letters", "intro", "lessons", "vocab", "alphabetAudio", "alphabetPdfs", "library", "rootFiles"):
        if key not in data:
            error(f"js/data.js is missing the top-level key {key!r}")
    if errors:
        for message in errors:
            print(f"ERROR: {message}")
        return 1

    counts = data["meta"].get("counts", {})
    packs = data["vocab"].get("packs", [])
    cards = [card for pack in packs for card in pack.get("cards", [])]
    trainers = data["vocab"].get("trainers", [])

    expect_count(counts, "letters", len(data["letters"]))
    expect_count(counts, "intro", len(data["intro"]))
    expect_count(counts, "lessons", len(data["lessons"]))
    expect_count(counts, "packs", len(packs))
    expect_count(counts, "vocabWords", len(cards))
    expect_count(counts, "vocabAudio", sum(1 for card in cards if card.get("audio")))
    expect_count(counts, "alphabetPdfs", len(data["alphabetPdfs"]))
    expect_count(counts, "libraryCollections", len(data["library"]))
    expect_count(counts, "libraryFiles", sum(item.get("fileCount", 0) for item in data["library"]) + len(data["rootFiles"]))
    expect_count(counts, "libraryLocalPdfs", count_files(ROOT / "assets" / "pdfs" / "library", {".pdf"}))
    meta = data["meta"]
    expect_meta(meta, "localAudio", count_files(ROOT / "assets" / "audio", AUDIO_EXT))
    expect_meta(meta, "localLessonTracks", sum(1 for lesson in data["lessons"] for track in lesson.get("tracks", []) if track.get("local")))
    expect_meta(meta, "archiveFiles", sum(item.get("fileCount", 0) for item in data["library"]) + len(data["rootFiles"]))
    expect_meta(meta, "archiveAudio", sum(item.get("audioCount", 0) for item in data["library"]))
    expect_meta(meta, "archivePdfs", sum(item.get("pdfCount", 0) for item in data["library"]) + sum(1 for item in data["rootFiles"] if item.get("type") == "file" and str(item.get("name", "")).lower().endswith(".pdf")))

    if counts.get("trainers") != len(trainers):
        warn(f"meta.counts.trainers={counts.get('trainers')} but vocab.trainers has {len(trainers)} entries")

    letter_ids = [item.get("id") for item in data["letters"]]
    if len(letter_ids) != len(set(letter_ids)):
        error("Duplicate letter ids in data.letters")

    lesson_nums = [item.get("num") for item in data["lessons"]]
    if len(lesson_nums) != len(set(lesson_nums)):
        error("Duplicate lesson numbers in data.lessons")

    pack_ids = [pack.get("id") for pack in packs]
    if len(pack_ids) != len(set(pack_ids)):
        error("Duplicate vocabulary pack ids")

    asset_refs = set()
    for source in (DATA_FILE, APP_FILE):
        text = source.read_text(encoding="utf-8")
        asset_refs.update(ASSET_RE.findall(text))
    missing_assets = sorted(path for path in asset_refs if not (ROOT / path).exists())
    for path in missing_assets:
        error(f"Missing asset referenced by the site: {path}")

    html = INDEX_FILE.read_text(encoding="utf-8")
    for needle in ("js/data.js?v=", "js/app.js?v=", "css/style.css?v="):
        if needle not in html:
            error(f"index.html does not load {needle.split('?')[0]} with a version query")
    versions = set(VERSION_RE.findall(html))
    if not versions:
        error("index.html has no ?v= version strings")
    elif len(versions) > 1:
        warn(f"index.html uses different ?v= values: {', '.join(sorted(versions))}")

    for link in LINK_RE.findall(html):
        if link.startswith(("http://", "https://", "#", "data:", "mailto:")):
            continue
        path = link.split("?", 1)[0].split("#", 1)[0]
        if path and not (ROOT / path).exists():
            error(f"index.html links to a missing local file: {path}")

    for source in (INDEX_FILE, APP_FILE, DATA_FILE, CSS_FILE):
        text = source.read_text(encoding="utf-8")
        for marker in MERGE_MARKERS:
            if marker in text:
                error(f"Merge conflict marker {marker!r} found in {source.relative_to(ROOT)}")

    tracked = tracked_files()
    for prefix in ("_tmp/", "_drive-cache/"):
        if any(name.startswith(prefix) for name in tracked):
            error(f"Generated folder {prefix} is still tracked by git")
    if (ROOT / "data").exists() or (ROOT / "js" / "src").exists():
        error("Old source folders data/ or js/src/ are back in the live path; move them to _legacy/")
    if not (ROOT / "_legacy" / "README.md").exists():
        warn("_legacy/README.md is missing")

    for name in tracked:
        path = ROOT / name
        if path.is_file() and path.stat().st_size > 95 * 1024 * 1024:
            error(f"Tracked file is larger than GitHub's 100 MB limit: {name}")

    print(
        "Data: "
        f"{len(data['letters'])} letters, "
        f"{len(data['intro'])} intro lessons, "
        f"{len(data['lessons'])} lessons, "
        f"{len(packs)} vocabulary packs ({len(cards)} cards), "
        f"{len(data['library'])} library sections."
    )
    print(
        "Media: "
        f"{count_files(ROOT / 'assets' / 'audio', AUDIO_EXT)} local audio files, "
        f"{count_files(ROOT / 'assets' / 'pdfs', {'.pdf'})} local PDFs."
    )
    print(f"Assets: {len(asset_refs)} unique references, {len(missing_assets)} missing.")
    print(f"Tracked files: {len(tracked)}.")

    if warnings:
        print("\nWarnings:")
        for message in warnings:
            print(f"  - {message}")

    if errors:
        print("\nErrors:")
        for message in errors:
            print(f"  - {message}")
        return 1

    print("\nOK: data, links, media, and tracked files look consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
