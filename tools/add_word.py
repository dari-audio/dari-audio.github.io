#!/usr/bin/env python3
"""Add one card to an audio vocabulary pack in js/data.js."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datafile import ROOT, bump_version, load_data, save_data  # noqa: E402


def find_pack(data: dict, needle: str):
    packs = data["vocab"]["packs"]
    for pack in packs:
        if pack.get("id") == needle:
            return pack
    lowered = needle.strip().lower()
    for pack in packs:
        if str(pack.get("title", "")).strip().lower() == lowered:
            return pack
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list-packs", action="store_true", help="show pack ids and exit")
    parser.add_argument("--pack", help="pack id or exact Russian title")
    parser.add_argument("--dari", help="word or phrase in Dari")
    parser.add_argument("--translit", help="transliteration")
    parser.add_argument("--ru", help="Russian translation")
    parser.add_argument("--audio", help="audio file path, or just a filename inside the pack folder")
    parser.add_argument("--dry-run", action="store_true", help="validate and print without saving")
    args = parser.parse_args()

    data = load_data()
    packs = data["vocab"]["packs"]

    if args.list_packs:
        for pack in packs:
            print(f"{pack['id']:<12} {pack['title']} ({len(pack.get('cards', []))} cards)")
        return 0

    missing = [name for name in ("pack", "dari", "translit", "ru") if not getattr(args, name)]
    if missing:
        parser.error("required arguments: " + ", ".join("--" + name for name in missing))

    pack = find_pack(data, args.pack)
    if pack is None:
        available = ", ".join(pack["id"] for pack in packs)
        print(f"Pack not found: {args.pack}\nAvailable: {available}", file=sys.stderr)
        return 1

    dari = args.dari.strip()
    if any(card.get("dari", "").strip() == dari for card in pack.get("cards", [])):
        print(f"This word is already in the {pack['title']} pack: {dari}", file=sys.stderr)
        return 1

    card = {
        "dari": dari,
        "translit": args.translit.strip(),
        "ru": args.ru.strip(),
    }

    if args.audio:
        audio = args.audio.strip()
        if not audio.startswith("assets/"):
            audio = f"assets/audio/vocab/{pack['id']}/{audio}"
        if not (ROOT / audio).exists():
            print(f"Audio file not found: {audio}", file=sys.stderr)
            return 1
        card["audio"] = audio

    pack.setdefault("cards", []).append(card)
    pack["count"] = len(pack["cards"])
    pack["audioCount"] = sum(1 for item in pack["cards"] if item.get("audio"))
    data["meta"]["counts"]["vocabWords"] = sum(len(item.get("cards", [])) for item in packs)
    data["meta"]["counts"]["vocabAudio"] = sum(
        1 for item in packs for card in item.get("cards", []) if card.get("audio")
    )

    print(json.dumps(card, ensure_ascii=False, indent=2))
    print(f"Pack: {pack['title']} — {pack['count']} cards, {pack['audioCount']} with audio.")
    print(
        f"Vocabulary total: {data['meta']['counts']['vocabWords']} cards, "
        f"{data['meta']['counts']['vocabAudio']} with audio."
    )

    if args.dry_run:
        print("Dry run: nothing was saved.")
        return 0

    save_data(data)
    version, _ = bump_version()
    print(f"Saved js/data.js and set asset version to {version}.")

    check = subprocess.run([sys.executable, str(ROOT / "tools" / "check_site.py")], cwd=ROOT)
    if check.returncode != 0:
        print("The site check failed; fix the errors before publishing.", file=sys.stderr)
    return check.returncode


if __name__ == "__main__":
    sys.exit(main())
