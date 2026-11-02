# Song key review

You are reviewing songs whose labeled key looks statistically suspicious. For every song in your queue batch, decide its true key and mode.

## Input

A queue batch, `harmony-data/data/key-review-queue/batch-NNN.json`, is a JSON array of entries with:

- `songKey`, `title`, `artist`, `source` (`UG` = Ultimate Guitar, `HT` = HookTheory), `url`
- `labeled`: the key and mode the data currently claims, e.g. `"C major"`
- `labeledCapo`: semitones the scraper shifted every chord by to match Ultimate Guitar's "tonality" field (0 = no shift)
- `reasons`: why it was flagged: `better-fit` (another key fits the chords clearly better), `uncommon-mode`, `out-of-key` (many chords outside the labeled scale), `capo-shift` (suspicious shift; see below)
- `candidates`: the detector's three best guesses with scores. These are hints, not answers.
- `sections`: each section's `chords` (current absolute chord names), `romans` (relative to that section's `key`/`scale`), and `repeats` (how many identical sections were collapsed)
- `needsWebLookup`: true for `capo-shift` songs

## Output

Write `harmony-data/data/key-review-decisions/<same file name as your queue batch>` containing one decision per queue entry, in the same order:

```json
[
	{
		"songKey": "artist__song",
		"labeled": "C major",
		"verdict": "corrected",
		"key": "A",
		"scale": "minor",
		"confidence": "high",
		"note": "Am is home: every section starts and ends on it, E major acts as V."
	}
]
```

- `labeled`: copy it verbatim from the queue entry.
- `verdict`: `confirmed` if the labeled key is right, otherwise `corrected`. A confirmed decision keeps the labeled key and scale and has no `recordedKey`.
- `key`: the tonic note name (`C`, `C#`, `D`, `Eb`, `E`, `F`, `F#`, `G`, `Ab`, `A`, `Bb`, `B`) of the chords **exactly as listed**. It must be the home chord you see in the `chords` strings.
- `scale`: one of `major`, `minor`, `mixolydian`, `dorian`. Rare modes (`phrygian`, `lydian`, `harmonicMinor`, `phrygianDominant`, `locrian`) are allowed only with a reason in `note`.
- `recordedKey` (optional, capo-shift songs only): the tonic note of the actual recording, from the web, when it differs from `key`. The pipeline transposes the chords from `key` to `recordedKey` for you; don't compute any intervals yourself.
- `confidence`: `high`, `medium` or `low`. Use `low` when you are unsure, so the song can be revisited.
- `note`: one short sentence of evidence.

## Choosing the tonal center

The key is the chord the song treats as home, not just a chord that fits the scale. Evidence, roughly strongest first:

1. Where the song and its sections end, and where phrases resolve.
2. Cadences: a major chord a fifth above (V to I, or V to i in minor) resolving to it, or `bVII` to `I` in rock and mixolydian songs.
3. How often the chord appears and how long the song sits on it.
4. Where sections start. This is weak: looped progressions often start away from the tonic, e.g. `vi IV I V`.

Relative major and minor (C major vs A minor) use the same chords; decide by which chord is home. A minor key usually shows a major V (E in A minor) or a strong i at the ends of sections. For pure 4-chord loops with no clear home, prefer the major reading and confirm the label if it already is one reasonable reading (`confidence: "medium"`).

Picking the mode, given the tonic:

- **major**: I with V and/or IV, diatonic.
- **minor**: i with bVI, bVII, iv and/or V. Harmonic minor is just `minor`.
- **mixolydian**: major I is home, `bVII` is prominent, and major V is rare or absent (e.g. `I bVII IV I`, `I bVII`).
- **dorian**: minor i is home and major IV is prominent (e.g. `i IV` vamps).

Don't correct for a marginal ambiguity. Only correct when the chords clearly center somewhere else. For example, a song labeled C major that revolves around C# and F# chords is wrong.

## Capo shifts (`needsWebLookup: true`)

For these songs the scraper detected the tab's written key, then transposed every chord by `labeledCapo` semitones to match Ultimate Guitar's "tonality" field. That field is often wrong; it frequently names the song's IV or V instead of its tonic. So for these songs, the chord _pitches_ may be wrong, not just the label.

1. Decide `key` and `scale` from the chords exactly as listed, the same way as for any other song.
2. Look up the recording's actual key on the web (song key databases such as tunebat, songbpm, musicnotes or HookTheory, or the UG tab page at `url`, which shows any capo instruction).
3. If the recorded tonic differs from your `key`, add `"recordedKey": "<recorded tonic>"`. The mode must be the same; only the pitch differs. Don't compute intervals; the pipeline does that.
4. If the web sources disagree or you can't find any, leave out `recordedKey` and use `confidence: "low"`.

Never add a `recordedKey` without web evidence.

## Self-check before writing each decision

Your `key` must be the home chord of the `chords` strings exactly as listed. Never confirm a label whose chords center on a different note, even when the web agrees with the label. If the web says the recording is in E but the listed chords revolve around Eb, write `"key": "Eb"` with `"recordedKey": "E"`.

## Rules

- Review every entry in your batch; don't skip any.
- Only write your own decisions file. Don't edit anything else.
- Check that your output is valid JSON matching the schema above.
