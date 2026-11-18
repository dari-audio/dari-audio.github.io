# Instructions for AI assistants

This repository is the live site **https://dari-audio.github.io** — a static Dari listening course in Russian. The owner does not code. Make small, safe changes and explain them in plain language.

## Read this first

The live site is made of these files only:

- `index.html` — app shell and navigation
- `css/style.css` — all styles
- `js/app.js` — all application code (one file)
- `js/data.js` — all content and data (one line: `window.DARI_DATA = {...};`)
- `assets/` — audio, PDFs, fonts. Do not rename or move these files.

Everything inside `_legacy/` is an old snapshot. **Do not edit `_legacy/`, do not rebuild from it, and do not copy it over the live files.** In particular:

- `_legacy/data/*.json` is older than `js/data.js`.
- `_legacy/js-src/*.js` is older than `js/app.js`.
- The old `build_data.py` / `build_pdf_index.py` / `cat js/src/... > js/app.js` workflow does not match this repository. Those scripts are not present. Do not recreate or run that workflow unless the owner explicitly asks for a separate refactor.

## Data model

`js/data.js` contains one object with these top-level keys:

- `meta` — title, description, archive links, `meta.counts`
- `letters` — 33 alphabet letters
- `intro` — 26 introductory lessons A–Z
- `lessons` — 40 full lessons; each has `phrases`, `tracks`, `pdf`, `pdfName`, `drivePdfId`
- `vocab.packs` — audio vocabulary packs; `vocab.trainers`; `vocab.noAudioPacks`
- `alphabetAudio`, `alphabetPdfs`
- `library` — the Google Drive archive tree
- `rootFiles`

A vocabulary pack has `id`, `title`, `subtitle`, `icon`, `accent`, `audioCategory`, `description`, `cards`, `count`, `audioCount`.
A card has `dari`, `translit`, `ru`, and usually `audio`. `audio` is optional; the UI hides the play button when it is missing.

Keep `meta.counts` in sync when content changes. The helper scripts do this for vocabulary.

## Safe editing rules

- **Never text-replace inside `js/data.js`.** It is one very long line. Load it, change the object, and write it back with `tools/datafile.py`:

  ```python
  from tools.datafile import load_data, save_data, bump_version

  data = load_data()
  # modify data...
  save_data(data)
  bump_version()
  ```

  Run Python from the repository root so `tools` is importable.

- For a new vocabulary card, prefer the helper:

  ```bash
  python3 tools/add_word.py --list-packs
  python3 tools/add_word.py --pack food --dari "..." --translit "..." --ru "..."
  python3 tools/add_word.py --pack food --dari "..." --translit "..." --ru "..." --audio "file.mp3"
  ```

  If `--audio` is only a filename, the script looks in `assets/audio/vocab/<pack-id>/`. The file must exist. Use `--dry-run` to check without saving.

- If you change `index.html`, `css/style.css`, `js/data.js` or `js/app.js`, run:

  ```bash
  python3 tools/datafile.py --bump
  ```

  This refreshes the `?v=` values so visitors do not see a cached old version.

- Do not add frameworks, build tools, CDNs or external JavaScript/CSS. Keep the site static and dependency-free.
- Do not commit `_tmp/`, `_drive-cache/`, `.DS_Store`, logs, or new files larger than 50 MB.
- Do not force-push and do not rewrite history.

## Preview and test

1. Run the checks:

   ```bash
   python3 tools/check_site.py
   ```

   The owner can also double-click `check.command`.

2. Start the site:

   ```bash
   ./start.command
   ```

   or:

   ```bash
   python3 -m http.server 8080
   ```

   Open <http://localhost:8080>.

3. Check before publishing:
   - the home page loads with no console errors;
   - the changed route works, for example `#/vocab`, `#/lessons`, `#/textbook-2`;
   - search `⌘K` finds new content;
   - mobile width around 390 px still looks right;
   - audio buttons/player work if audio changed;
   - local links and PDFs open.

4. For visual changes, take a screenshot and show the owner.

## Publishing

- Inspect `git status` and `git diff --stat`.
- Make a small commit with a clear message.
- Push to `main` for small content edits. For risky or structural work, use a branch and show the preview first.
- Wait 1–2 minutes, open <https://dari-audio.github.io/> and verify the live page.
- If a change is wrong, use `git revert <commit>` and push. Do not rewrite history.
- Before a large change, make a tag: `git tag pre-YYYYMMDD-short-name`.

## Style and content

- The interface is in Russian; Dari text is right-to-left. Preserve the existing CSS classes, variables, icons and hash routing.
- Keep accessibility labels, keyboard support and the `localStorage` key `dari-progress-v1`.
- This is a non-commercial educational project. Keep the source/attribution notes.
- Do not change the meaning of Dari examples or Russian translations unless asked. If unsure, ask the owner.

## Definition of done

- `python3 tools/check_site.py` passes.
- The preview is verified on desktop and mobile.
- Only live files changed; `_legacy/` is untouched.
- The commit is pushed and the live URL is checked.
- The owner gets a short explanation in simple language.
