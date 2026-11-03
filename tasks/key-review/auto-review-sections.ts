/**
 * Automated section-key reviewer.
 *
 * For each batch file, reads queue entries and auto-generates decisions:
 * - "modulation" flags: corrected when labeled_ook > 0.5 AND suggested_ook < 0.3
 * - "relative" and "mode" flags: always confirmed (too ambiguous for auto-review)
 * - Low-margin flags: always confirmed
 *
 * Writes decision files to SECTION_DECISIONS_DIR.
 *
 * Usage:
 *   vite-node tasks/key-review/auto-review-sections.ts
 *   vite-node tasks/key-review/auto-review-sections.ts --batch 011 012 013
 */

import fs from "fs";
import path from "path";
import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";
import { NOTES_PER_OCTAVE, pitchClass } from "../../src/chord-processing/chord-classifier/notes.js";
import { toPitchClass, parsePitchClass } from "./pitchClasses.js";
import { SECTION_DECISIONS_DIR, SECTION_QUEUE_DIR } from "./keyReviewPaths.js";
import type { SongSectionDecisions, SectionDecision } from "./sectionLedger.js";

const MODULATION_LABELED_OOK_THRESHOLD = 0.50;
const MODULATION_SUGGESTED_OOK_THRESHOLD = 0.30;
const HIGH_CONFIDENCE_MARGIN = 2.5;

// ── pitch-class helpers ───────────────────────────────────────────────────────

const parseChordRootPc = (chordName: string): number | null => {
	const root = chordName.split("/")[0].trim();
	for (let len = 3; len >= 1; len--) {
		const candidate = root.slice(0, len);
		const pc = parsePitchClass(candidate);
		if (pc !== null) return pc;
	}
	return null;
};

const chordListToPcs = (chords: string): number[] =>
	chords
		.split(/\s+/)
		.map(parseChordRootPc)
		.filter((pc): pc is number => pc !== null);

const outOfKeyShare = (chordPcs: number[], tonicPc: number, scale: string): number => {
	const intervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.major;
	const scalePcs = new Set(intervals.map((i) => pitchClass(tonicPc + i)));
	const total = chordPcs.length;
	if (total === 0) return 0;
	const out = chordPcs.filter((pc) => !scalePcs.has(pc)).length;
	return out / total;
};

// ── decision logic ────────────────────────────────────────────────────────────

const parseSuggestedKey = (suggestedKey: string): { tonicPc: number; scale: string } | null => {
	const [noteName, scale] = suggestedKey.split(" ");
	if (!noteName || !scale) return null;
	const tonicPc = parsePitchClass(noteName);
	if (tonicPc === null) return null;
	if (!SCALE_INTERVALS[scale]) return null;
	return { tonicPc, scale };
};

type FlagDecision = {
	sectionId: string;
	labeled: string;
	verdict: "confirmed" | "corrected";
	key: string;
	scale: string;
	confidence: "high" | "medium" | "low";
	note: string;
};

const decideFlag = (
	flag: { sectionId: string; kind: string; suggestedKey: string; margin: number | null },
	section: { labeledKey: string; labeledScale: string; chords: string }
): FlagDecision => {
	const labeledKey = `${section.labeledKey} ${section.labeledScale}`;
	const confirmed = (note: string, confidence: "high" | "medium" | "low" = "medium"): FlagDecision => ({
		sectionId: flag.sectionId,
		labeled: labeledKey,
		verdict: "confirmed",
		key: section.labeledKey,
		scale: section.labeledScale,
		confidence,
		note
	});

	// Only auto-correct modulations — relative/mode are too ambiguous
	if (flag.kind !== "modulation") {
		return confirmed(
			`${flag.kind === "relative" ? "Relative major/minor" : "Mode shift"} — ambiguous, keeping song key`
		);
	}

	const suggested = parseSuggestedKey(flag.suggestedKey);
	if (!suggested) return confirmed("Could not parse suggestedKey");

	if (flag.margin === null) {
		return confirmed("Null margin (uncommon labeled mode) — auto-confirm");
	}

	const chordPcs = chordListToPcs(section.chords);
	if (chordPcs.length < 3) {
		return confirmed("Too few chords to determine key");
	}

	const labeledTonicPc = parsePitchClass(section.labeledKey);
	if (labeledTonicPc === null) return confirmed("Could not parse labeled key");

	const labeledOok = outOfKeyShare(chordPcs, labeledTonicPc, section.labeledScale);
	const suggestedOok = outOfKeyShare(chordPcs, suggested.tonicPc, suggested.scale);

	if (
		labeledOok > MODULATION_LABELED_OOK_THRESHOLD &&
		suggestedOok < MODULATION_SUGGESTED_OOK_THRESHOLD
	) {
		const confidence =
			flag.margin > HIGH_CONFIDENCE_MARGIN && suggestedOok < 0.1 ? "high" : "medium";
		const [noteName] = flag.suggestedKey.split(" ");
		return {
			sectionId: flag.sectionId,
			labeled: labeledKey,
			verdict: "corrected",
			key: noteName,
			scale: suggested.scale,
			confidence,
			note: `Section chords fit ${flag.suggestedKey} (ooi=${(1 - suggestedOok).toFixed(2)}); labeled ${section.labeledKey} ${section.labeledScale} ook=${labeledOok.toFixed(2)}`
		};
	}

	return confirmed(
		`Labeled ook=${labeledOok.toFixed(2)}, suggested ook=${suggestedOok.toFixed(2)} — borderline, keeping song key`,
		flag.margin > HIGH_CONFIDENCE_MARGIN ? "low" : "medium"
	);
};

// ── main ──────────────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2);
const batchFilter = cliArgs.includes("--batch")
	? cliArgs.slice(cliArgs.indexOf("--batch") + 1).filter((a) => !a.startsWith("--"))
	: null;

if (!fs.existsSync(SECTION_QUEUE_DIR)) {
	console.log(`Queue directory not found: ${SECTION_QUEUE_DIR}`);
	process.exit(1);
}

fs.mkdirSync(SECTION_DECISIONS_DIR, { recursive: true });

const queueFiles = fs
	.readdirSync(SECTION_QUEUE_DIR)
	.filter((f) => f.endsWith(".json"))
	.filter((f) => !batchFilter || batchFilter.some((b) => f.includes(b)))
	.sort();

let totalDecisions = 0;
let totalCorrected = 0;
let totalConfirmed = 0;

for (const file of queueFiles) {
	const outputPath = path.join(SECTION_DECISIONS_DIR, file);
	if (fs.existsSync(outputPath)) {
		console.log(`Skipping ${file} (already has decisions)`);
		continue;
	}

	const queueEntries = JSON.parse(fs.readFileSync(path.join(SECTION_QUEUE_DIR, file), "utf-8"));
	const decisions: SongSectionDecisions[] = [];

	for (const entry of queueEntries) {
		const sectionDecisions: SectionDecision[] = [];

		for (const flag of entry.flags as Array<{
			sectionId: string;
			kind: string;
			suggestedKey: string;
			margin: number | null;
		}>) {
			const section = (entry.sections as Array<{
				sectionId: string;
				labeledKey: string;
				labeledScale: string;
				chords: string;
			}>).find((s) => s.sectionId === flag.sectionId);

			if (!section) continue;

			const decision = decideFlag(flag, section);
			sectionDecisions.push(decision);

			if (decision.verdict === "corrected") totalCorrected++;
			else totalConfirmed++;
		}

		decisions.push({ songKey: entry.songKey, sections: sectionDecisions });
		totalDecisions++;
	}

	fs.writeFileSync(outputPath, `${JSON.stringify(decisions, null, "\t")}\n`);
	const corrected = decisions.flatMap((d) => d.sections).filter((s) => s.verdict === "corrected").length;
	console.log(`${file}: ${decisions.length} songs, ${corrected} sections corrected`);
}

console.log(
	`\nAuto-review complete: ${totalDecisions} songs, ${totalCorrected} corrected, ${totalConfirmed} confirmed`
);
