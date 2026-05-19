# Meeting Minutes Realtime MVP

Offline meeting MVP for live transcription and meeting-minute generation.

## What it does

- Captures microphone audio in the browser.
- Connects to OpenAI Realtime transcription with a short-lived client secret.
- Streams transcript deltas into the page.
- Sends the final transcript to the Responses API.
- Produces structured meeting minutes, decisions, TODOs, risks, open questions, and an email draft.
- Supports Korean/English UI switching and sends the selected UI language as the minutes output language.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY`.
3. Run:

```powershell
npm.cmd start
```

Open `http://localhost:3000`.

## Notes

- The default live transcription model is `gpt-4o-mini-transcribe`.
- Set `OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe` if you want to compare higher-accuracy transcription behavior.
- Set `OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe-diarize` when you want speaker labels from the transcription model.
- Speaker names are not guaranteed from a single room microphone. Add participants before recording so names can be used as vocabulary hints, then verify TODO owners in the generated minutes.
