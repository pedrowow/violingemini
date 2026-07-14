# Violin Ear Trainer

Ear training for beginner violinists, using real violin samples. Hear a note, find it on the fingerboard.

Live app: [pedrowow.github.io/violingemini](https://pedrowow.github.io/violingemini/)

Originally built by Gemini; redesigned and extended with Claude.

## How it works

- Choose **First position** or **Second position** on the start screen. The choice is remembered between visits.
- Press **Play note** to hear a random note from the selected position. Replay it, or play the reference note (C4), as many times as you like.
- Answer by tapping the note on the fingerboard. Correct answers light green; incorrect answers light red alongside the correct note, and both can be replayed to compare.
- A running score is shown during practice. Stopping a session saves it, and the best three scores per position appear on the start screen.

## Per-note statistics

Every answer is logged per note, per position. The start screen shows the six weakest notes with:

- accuracy percentage and attempt count
- the most common wrong answer for that note (e.g. `F#4 · hears as G4`)

Stats accumulate across sessions to build a meaningful sample, and can be reset per position from the panel.

## Playback

All notes play for a standardised 3 seconds with a short fade-out, so sample length never gives the answer away. If a sample file is missing, a synthesised tone with the same 3-second envelope is used as a fallback.

## Audio samples

Samples live in the `audio/` folder, named in scientific pitch notation:

- `violin-c4.wav` for C4
- `violin-cs4.wav` for C#4

Currently covers G3 to B5. Second position additionally requires `violin-c6.wav` (4th finger on the E string); until it is added, C6 uses the synth fallback. New samples should match the recording character of the existing set, otherwise the odd one out becomes recognisable by timbre rather than pitch.

## Technical notes

- Single-page app: `index.html`, `script.js`, `style.css`. No build step, hosted on GitHub Pages.
- Audio via the Web Audio API (`AudioContext`, buffer sources, gain envelopes).
- All persistence in `localStorage`:
  - `violinPosition` — selected position
  - `violinHighScores-first` / `violinHighScores-second` — best three scores per position
  - `violinNoteStats-first` / `violinNoteStats-second` — per-note accuracy and confusions
