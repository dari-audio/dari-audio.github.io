#!/usr/bin/env python3
"""Download and locally transcribe the Dari vocabulary audio pilot with MLX Whisper."""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from pathlib import Path

import gdown
import mlx_whisper

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
AUDIO_DIR = HERE / "audio"
OUTPUT_DIR = HERE / "transcripts"
DEFAULT_MODEL = "mlx-community/whisper-base-mlx"


def load_items():
    with MANIFEST.open(encoding="utf-8") as f:
        return json.load(f)["items"]


def download_audio(item: dict) -> Path:
    dest = AUDIO_DIR / item["category_id"] / item["filename"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    file_id = item["drive_id"]
    if not file_id:
        raise RuntimeError("No Google Drive ID in manifest")
    result = gdown.download(id=file_id, output=str(dest), quiet=False, fuzzy=True)
    if not result or not dest.exists() or dest.stat().st_size == 0:
        dest.unlink(missing_ok=True)
        raise RuntimeError("Google Drive download failed (possibly quota or permission)")
    return dest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=0, help="Process only the first N selected files")
    parser.add_argument("--category", help="Category ID, e.g. greetings or medical")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="MLX Whisper model repository")
    parser.add_argument("--force", action="store_true", help="Re-transcribe even if a text draft exists")
    args = parser.parse_args()

    items = load_items()
    if args.category:
        items = [x for x in items if x["category_id"] == args.category]
        if not items:
            parser.error(f"Unknown or empty category: {args.category}")
    if args.limit:
        items = items[:args.limit]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    progress_path = OUTPUT_DIR / "progress.csv"
    new_log = not progress_path.exists()
    completed = failed = skipped = 0

    with progress_path.open("a", newline="", encoding="utf-8-sig") as log_file:
        writer = csv.DictWriter(log_file, fieldnames=[
            "category_id", "category", "filename", "drive_id", "status", "message"
        ])
        if new_log:
            writer.writeheader()

        for n, item in enumerate(items, 1):
            out_dir = OUTPUT_DIR / item["category_id"]
            out_dir.mkdir(parents=True, exist_ok=True)
            txt_path = out_dir / (Path(item["filename"]).stem + ".txt")
            json_path = out_dir / (Path(item["filename"]).stem + ".json")

            if txt_path.exists() and txt_path.stat().st_size and not args.force:
                skipped += 1
                print(f"[{n}/{len(items)}] SKIP {item['filename']} (draft exists)")
                continue

            try:
                audio_path = download_audio(item)
                print(f"[{n}/{len(items)}] TRANSCRIBE {item['category']} / {item['filename']}")
                result = mlx_whisper.transcribe(
                    str(audio_path),
                    path_or_hf_repo=args.model,
                    language="fa",
                    task="transcribe",
                    temperature=0.0,
                    verbose=False,
                )
                text = (result.get("text") or "").strip()
                txt_path.write_text(text + "\n", encoding="utf-8")
                payload = {
                    "source": item,
                    "model": args.model,
                    "language_requested": "fa",
                    "language_detected": result.get("language"),
                    "text": text,
                    "segments": result.get("segments", []),
                }
                json_path.write_text(
                    json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                completed += 1
                writer.writerow({**{k: item.get(k, "") for k in (
                    "category_id", "category", "filename", "drive_id"
                )}, "status": "transcribed", "message": ""})
                log_file.flush()
                print(f"  -> {txt_path.relative_to(HERE)}")
            except KeyboardInterrupt:
                print("\nStopped by user. Run the same command to resume.")
                return 130
            except Exception as exc:
                failed += 1
                writer.writerow({**{k: item.get(k, "") for k in (
                    "category_id", "category", "filename", "drive_id"
                )}, "status": "error", "message": str(exc)})
                log_file.flush()
                print(f"  !! ERROR: {exc}", file=sys.stderr)
                time.sleep(1)

    print(f"\nFinished. Transcribed: {completed}; skipped: {skipped}; failed: {failed}.")
    print(f"Drafts are in: {OUTPUT_DIR}")
    if failed:
        print("Check transcripts/progress.csv and rerun to retry failed items.")


if __name__ == "__main__":
    raise SystemExit(main())
