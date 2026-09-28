import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

// No signal proves a song's matching is safe to skip (see plan notes: even
// 100% coverage can come entirely from non-core "gap fill" slices, or from a
// core progression matched on the wrong rotation). So every song eventually
// gets reviewed — this only decides the ORDER, front-loading the songs most
// likely to be silently wrong rather than visibly incomplete.
export type ReviewRiskTier = 1 | 2 | 3;

export type RankedReviewSong = {
	songKey: string;
	tier: ReviewRiskTier;
};

// A song with no core match at all but high overall coverage looks
// "finished" purely from non-core filler — the sneakiest failure mode, since
// nothing about it visibly signals "incomplete."
const HIGH_COVERAGE_THRESHOLD_PERCENT = 50;

const coverageByCoreness = (
	entry: SongCoverageEntry
): { core: number; nonCore: number } => {
	let core = 0;
	let nonCore = 0;
	for (const p of entry.progressionCounts) {
		if (p.isCore) core += p.coveragePercent;
		else nonCore += p.coveragePercent;
	}
	return { core, nonCore };
};

const classify = (entry: SongCoverageEntry): { tier: ReviewRiskTier; sortKey: number } => {
	const { core, nonCore } = coverageByCoreness(entry);
	const total = core + nonCore;

	if (core === 0 && total >= HIGH_COVERAGE_THRESHOLD_PERCENT) {
		// Higher "looks done but isn't really" coverage first.
		return { tier: 1, sortKey: -total };
	}
	if (core > 0 && nonCore > core) {
		// Higher non-core share first.
		return { tier: 2, sortKey: -nonCore };
	}
	// Everything else: visibly incomplete matches are lower priority — a
	// human doesn't need help noticing those. Ascending coverage.
	return { tier: 3, sortKey: total };
};

export const computeReviewQueue = (
	songCoverages: readonly SongCoverageEntry[],
	reviewedSongKeys: ReadonlySet<string>
): RankedReviewSong[] =>
	songCoverages
		.filter((entry) => !reviewedSongKeys.has(entry.songKey))
		.map((entry) => ({ songKey: entry.songKey, ...classify(entry) }))
		.sort((a, b) => a.tier - b.tier || a.sortKey - b.sortKey)
		.map(({ songKey, tier }) => ({ songKey, tier }));

// Deterministic hash (FNV-1a + a murmur-style avalanche finalizer) — used
// only to split the queue between reviewers so two people working live
// rarely land on the same song. Not cryptographic; just needs the low bits
// (what `% reviewerCount` reads) to depend on every input bit, seed
// included — a simpler mix here left the low bit independent of the seed
// for consecutive integers, silently breaking "re-shuffle."
const hashSongKey = (seed: number, songKey: string): number => {
	let h = (seed ^ 0x9e3779b9) >>> 0;
	for (let i = 0; i < songKey.length; i++) {
		h ^= songKey.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b) >>> 0;
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35) >>> 0;
	h ^= h >>> 16;
	return h >>> 0;
};

// Which of `reviewerCount` reviewers a song is assigned to, given a shared
// seed. Same seed + songKey always gives the same answer (so a reviewer's
// queue is stable across reloads); bumping the seed reshuffles assignment
// for whatever's still unreviewed, for "re-make the queues" once one
// reviewer's half runs low.
export const assignedReviewerIndex = (
	songKey: string,
	seed: number,
	reviewerCount: number
): number => hashSongKey(seed, songKey) % reviewerCount;

export const queueForReviewer = (
	queue: readonly RankedReviewSong[],
	reviewerIndex: number,
	seed: number,
	reviewerCount: number
): RankedReviewSong[] =>
	queue.filter(
		(r) => assignedReviewerIndex(r.songKey, seed, reviewerCount) === reviewerIndex
	);
