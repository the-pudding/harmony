# Section-level key review — summary

High-level record of work completed after **song-level** key review (`key-review.csv`). Song-level review assigns one key per song; many tabs modulate or use different tonal centers per section. This pass detects those cases, records per-section decisions, and applies them at build time.

## What we built

| Area | What |
| --- | --- |
| **Detection** | Viterbi over ordered sections (switch penalties for modulation / relative / mode) plus independent per-section flags when one section clearly fits another key better than the song label. |
| **Calibration** | Grid search against HookTheory songs with known multi-section keys (`keys:calibrate-sections`). |
| **Queue** | `keys:flag-sections` → batch JSON under `harmony-data/data/key-review-section-queue/` (~913 songs, 37 batches; high-margin filter). |
| **Review** | Agent prompt (`section-review-prompt.md`), auto-reviewer (`auto-review-sections.ts`), merge via `keys:apply-sections`. |
| **Ledger** | `harmony-data/data/key-review-sections.csv` — one row per **section id** (verdict, key, scale, transpose, flag kind, method). |
| **Build** | `applySectionKeyLedger()` in `runKeyReview()` after song-level ledger; `rekeySectionTo()` transposes section chords and respells Roman numerals under the section’s key. |

npm scripts: `keys:flag-sections`, `keys:apply-sections`, `keys:calibrate-sections`.

## What changed (impact)

**Data & output**

- **3,507** section decisions in `key-review-sections.csv` (**563** corrected, **2,944** confirmed as “keep song key for this section”).
- **`npm run songs`** now applies section ledger rows when building `songs.json`: affected sections get updated `key` / `scale`, transposed chord roots where needed, and Romans analyzed from the **section** tonality instead of only the song-level label.
- Modulating or mis-labeled sections that were previously forced through a single song key (e.g. Jan & Dean Bb sections, We Five E-major verses, Diamonds D/E sections, partial Honeydrippers G-major sections) are corrected at section granularity where the ledger says so.

**Process & docs**

- **`hand-reviewed-songs.ts`**: `keyTonalityIssues` trimmed for cases fixed by the section ledger (e.g. Jan & Dean *Ride the Wild Surf*, Diamonds *Oom Dooby Doom*); a few songs remain flagged where song-level or auto-review still disagrees with the tab (El DeBarge chorus, Honeydrippers song-level F# mixolydian label).

**What did not change**

- Song-level ledger (`key-review.csv`) and its apply path are unchanged; section review **adds** on top.
- Songs with no section flags or only “confirmed” rows behave as before.
- Scrape/chord-matching issues in `problematicSongs` / `trickySongsToMatchCorrectly` are out of scope for this pass.

## Known follow-ups

- **El DeBarge** (*Who’s Johnny*): chorus in G major; auto-review kept Eb (borderline out-of-key share on shared pitch classes).
- **Honeydrippers** (*Sea of Love*): some sections corrected to G major; song-level row may still need a deliberate correction in `key-review.csv`.
- Regenerate **`KEY_REVIEW_REPORT.md`** (`npm run keys:report`) if you want headline stats to include section-ledger counts; the report today is centered on song-level CSV.

## Tests

- `harmony/tasks/key-review/segmentSectionKeys.test.ts` (detector + golden-style cases).
- Full suites: `npm test` in `harmony/` and `harmony-data/` (run after further ledger or detector changes).
