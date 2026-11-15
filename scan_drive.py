#!/usr/bin/env python3
"""Сканирует публичную папку Google Drive через embeddedfolderview.

Страница обычной папки Drive отдаёт только первые ~50 записей, а
embeddedfolderview — весь список (до 1000+). Скрипт обходит папки рекурсивно,
кэширует HTML и сохраняет _drive-tree.json в прежнем формате.
"""
from __future__ import annotations

import argparse
import html
import json
import random
import re
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT_ID = "1kf8DOFt5s4M4y-Slw3CztqF13LbjVcEa"
ROOT_NAME = "АУДИРОВАНИЯ ДАРИ"
ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "_drive-cache"
TREE = ROOT / "_drive-tree.json"
REPORT = ROOT / "_drive-scan-report.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", "", value or "")
    return html.unescape(value).replace("\u00a0", " ").strip()


def parse_folder(folder_id: str, data: str) -> list[dict]:
    blocks = re.split(r'<div class="flip-entry" id="entry-', data)[1:]
    entries: list[dict] = []
    seen: set[str] = set()
    for block in blocks:
        item_id = block.split('"', 1)[0]
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        link = re.search(r'<a href="([^"]+)"', block)
        title = re.search(r'<div class="flip-entry-title">(.*?)</div>', block, re.S)
        if not title:
            continue
        href = html.unescape(link.group(1)) if link else ""
        name = clean_text(title.group(1))
        if not name:
            continue
        is_folder = "/drive/folders/" in href or f"folders/{item_id}" in href
        mime_match = re.search(r"drive-thirdparty\.googleusercontent\.com/[^\"']*?/type/([^\"'?]+)", block)
        mime = html.unescape(mime_match.group(1)) if mime_match else ""
        alt_match = re.search(r'alt="([^"]*)"', block)
        alt = html.unescape(alt_match.group(1)) if alt_match else ""
        kind = "folder" if is_folder else "file"
        if not is_folder and ("document" in mime or alt.lower() in {"google docs", "google документа"}):
            kind = "gdoc:document"
        modified_match = re.search(r'<div class="flip-entry-last-modified"><div>(.*?)</div>', block)
        entries.append({
            "id": item_id,
            "name": name,
            "type": kind,
            "mime": mime,
            "modified": clean_text(modified_match.group(1)) if modified_match else "",
        })
    return entries


def fetch(folder_id: str) -> tuple[list[dict], str]:
    CACHE.mkdir(exist_ok=True)
    cache_file = CACHE / f"{folder_id}.html"
    if cache_file.exists() and cache_file.stat().st_size > 500:
        return parse_folder(folder_id, cache_file.read_text(encoding="utf-8")), "cache"
    url = f"https://drive.google.com/embeddedfolderview?id={folder_id}#list"
    last_error = ""
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ru,en;q=0.8"})
            with urllib.request.urlopen(request, timeout=40) as response:
                data = response.read().decode("utf-8", "replace")
            if "flip-entry" not in data and "flip-entries" not in data:
                raise ValueError("в ответе нет списка файлов")
            cache_file.write_text(data, encoding="utf-8")
            return parse_folder(folder_id, data), "live"
        except Exception as exc:  # noqa: BLE001 - нужен максимально устойчивый обход
            last_error = f"{type(exc).__name__}: {exc}"
            time.sleep(1.5 * (attempt + 1) + random.random())
    raise RuntimeError(last_error or "не удалось прочитать папку")


def natural_key(value: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", value)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--refresh", action="store_true", help="не использовать кэш HTML")
    args = parser.parse_args()
    if args.refresh and CACHE.exists():
        for path in CACHE.glob("*.html"):
            path.unlink()

    started = time.time()
    nodes: dict[str, dict] = {}
    pending: dict[str, tuple[str, int]] = {ROOT_ID: (ROOT_NAME, 0)}
    errors: list[dict] = []
    fetched = 0

    while pending:
        batch = list(pending.items())
        pending = {}
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            futures = {pool.submit(fetch, folder_id): (folder_id, name, depth) for folder_id, (name, depth) in batch}
            for future in as_completed(futures):
                folder_id, name, depth = futures[future]
                try:
                    entries, source = future.result()
                except Exception as exc:  # noqa: BLE001
                    errors.append({"id": folder_id, "name": name, "error": str(exc)})
                    nodes[folder_id] = {
                        "id": folder_id,
                        "name": name,
                        "path": name,
                        "depth": depth,
                        "folders": [],
                        "files": [],
                        "error": str(exc),
                    }
                    continue
                fetched += 1
                folders = []
                files = []
                for entry in entries:
                    item = {"id": entry["id"], "name": entry["name"], "type": entry["type"]}
                    if entry.get("mime"):
                        item["mime"] = entry["mime"]
                    if entry.get("modified"):
                        item["modified"] = entry["modified"]
                    if entry["type"] == "folder":
                        folders.append(item)
                        if entry["id"] not in nodes:
                            pending[entry["id"]] = (entry["name"], depth + 1)
                    else:
                        files.append(item)
                folders.sort(key=lambda item: natural_key(item["name"]))
                files.sort(key=lambda item: natural_key(item["name"]))
                nodes[folder_id] = {
                    "id": folder_id,
                    "name": name,
                    "path": name,
                    "depth": depth,
                    "folders": folders,
                    "files": files,
                }
                print(f"[{fetched:3d}] {name}: {len(folders)} папок, {len(files)} файлов ({source})", flush=True)
        if pending:
            print(f"    осталось папок: {len(pending)}", flush=True)

    # Восстанавливаем полные пути и порядок обхода от корня.
    ordered: list[dict] = []
    queue = [ROOT_ID]
    visited: set[str] = set()
    while queue:
        folder_id = queue.pop(0)
        if folder_id in visited or folder_id not in nodes:
            continue
        visited.add(folder_id)
        node = nodes[folder_id]
        parent_path = ""
        for other in ordered:
            if any(child["id"] == folder_id for child in other.get("folders", [])):
                parent_path = other["path"]
                break
        node["path"] = f"{parent_path} / {node['name']}" if parent_path else node["name"]
        ordered.append(node)
        queue.extend(child["id"] for child in node.get("folders", []))

    # Добавляем папки, которые не достижимы из корня (например, ошибки обхода).
    for folder_id, node in nodes.items():
        if folder_id not in visited:
            ordered.append(node)

    all_files = [file for node in ordered for file in node.get("files", [])]
    audio_ext = {".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac", ".opus", ".wma"}
    audio = sum(1 for file in all_files if Path(file["name"]).suffix.lower() in audio_ext)
    tree = {
        "folderCount": len(ordered),
        "fileCount": len(all_files),
        "audioCount": audio,
        "errors": errors,
        "nodes": ordered,
    }
    TREE.write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")

    old = None
    try:
        old = json.loads(TREE.read_text(encoding="utf-8"))
    except Exception:
        pass
    report = {
        "scannedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "durationSeconds": round(time.time() - started, 1),
        "root": ROOT_ID,
        "folderCount": len(ordered),
        "fileCount": len(all_files),
        "audioCount": audio,
        "errors": errors,
        "topLevel": [{"id": node["id"], "name": node["name"], "files": len(node.get("files", [])), "folders": len(node.get("folders", []))} for node in ordered if node.get("depth") == 1],
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
