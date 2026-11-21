# Spoken Dari transcription test (Mac Apple Silicon)

This is a separate local transcription pilot for the site's **Spoken Dari** library collection. It contains 48 MP3 recordings and is separate from the bilingual vocabulary trainer pilot.

The script downloads the public Google Drive audio and runs inference locally on your Mac. It does not change the public site or upload transcripts.

## Run the first test

Use the same virtual environment and installed packages from the existing transcription setup:

```bash
cd tools/transcribe-vocab
source .venv/bin/activate
python transcribe-spoken-dari.py --limit 5
```

The script uses Whisper's Persian language code (`fa`) because Whisper does not expose a separate Dari language code. These recordings are from the Spoken Dari collection, so this test removes the English/Dari alternation that confused the earlier vocabulary recordings.

Default model: `mlx-community/whisper-base-mlx`. The model is already downloaded if you completed the earlier test.

## Review the result before processing all 48

Drafts are saved separately in:

- `transcripts-spoken-dari/spoken-dari/*.txt` — editable drafts
- `transcripts-spoken-dari/spoken-dari/*.json` — model output and timestamps
- `transcripts-spoken-dari/progress.csv` — run log
- `audio-spoken-dari/spoken-dari/` — downloaded audio

If the first five are useful, process the remaining files with:

```bash
python transcribe-spoken-dari.py
```

Existing non-empty text drafts are skipped on rerun. To regenerate them:

```bash
python transcribe-spoken-dari.py --force
```

All downloaded audio and transcript drafts remain in your local working copy unless you choose to share them. Do not commit the `audio-spoken-dari/` or `transcripts-spoken-dari/` folders to the public repository.

## Source

Collection: https://dari-audio.github.io/#/library/1fOF2fJg4gb8T8iAPLGboEJW4Sh_DS-Sv
