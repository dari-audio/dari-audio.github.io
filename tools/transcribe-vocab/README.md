# Dari vocabulary audio transcription (Mac Apple Silicon)

Private, local-first transcription helper for the 523 audio files listed in the site's
`vocab.trainers` data (18 categories). It does not modify the public website or upload
your transcripts anywhere. The audio is downloaded from the existing public Google Drive
file IDs; model inference and transcript storage happen on your Mac.

## Requirements

- Apple Silicon Mac (tested target: MacBook Air M1, 8 GB RAM)
- macOS with Xcode Command Line Tools
- Homebrew: https://brew.sh
- Internet for the initial audio/model downloads. After downloads, transcription can run offline.

## Install

Open Terminal, clone/download this repository, then:

```bash
cd tools/transcribe-vocab
brew install python@3.11 ffmpeg
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## First test: 15 files only

```bash
python transcribe.py --limit 15
```

This downloads the first 15 manifest entries (10 «Приветствия» files plus the first 5 «Команды» files) into
`audio/`, then transcribes them using the multilingual Whisper Base model with Persian
(`fa`) selected. On first run, the model weights are downloaded from Hugging Face.
The first run therefore needs internet access; inference itself runs locally.

For an 8 GB M1, start with Base rather than Medium/Large. If the test is stable and
quality is acceptable, try a stronger Small model:

```bash
python transcribe.py --limit 15 --model mlx-community/whisper-small-mlx
```

Compare the output with your Dari knowledge. Whisper labels this language Persian
(`fa`), not Dari separately, so spelling, idiom, accent and vocabulary need human review.

## Process all 523 files

After reviewing the test:

```bash
python transcribe.py
```

Resume is automatic: existing non-empty `.txt` outputs are skipped. To retry one file,
delete its corresponding text/JSON output and run again. To process one category:

```bash
python transcribe.py --category greetings
```

To re-run existing transcripts:

```bash
python transcribe.py --force
```

## Output and privacy

- `audio/<category-id>/<filename>`: downloaded source audio
- `transcripts/<category-id>/<filename>.txt`: editable plain-text draft
- `transcripts/<category-id>/<filename>.json`: raw model result, including segments/timestamps
- `transcripts/progress.csv`: run log

All outputs remain on this Mac unless you choose to share them. Do not put your transcript
folder into the public website repository. The repository contains only the public audio
manifest and the helper script; no transcript content or private review notes.

## Notes

- Transcription software and model weights are free; no paid API is used.
- Audio and model downloads require internet and Google Drive/Hugging Face availability.
- Processing time depends on clip lengths and Mac thermal/power conditions.
- The script never overwrites original site files and never edits the live vocabulary page.
