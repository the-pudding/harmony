import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../../src/chord-processing/songIdentity.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import {
	assessSongKey,
	MISLABEL_MARGIN,
	type KeyAssessment
} from "./assessSongKey.js";
import {
	isLedgerRowFresh,
	ledgerRowChangesSong,
	REVIEW_METHODS,
	type Ledger,
	type LedgerRow,
	type SongKeySnapshot
} from "./ledger.js";
import { rekeySection } from "./rekeySong.js";
import {
	sectionChords,
	tonalityOf,
	trainTonalityModel,
	type TonalityModel,
	type TrustedSong
} from "./tonalityModel.js";

export type SongSourceMeta = { capo: number; url: string };
export type ReviewStatus = "fresh" | "stale" | "unreviewed";
export type AssessedSong = {
	snapshot: SongKeySnapshot;
	status: ReviewStatus;
	assessment: KeyAssessment;
	sections: SongInput[];
};

const HOOKTHEORY_SOURCE = "HT";

export const groupSectionsBySongKey = (
	songs: SongInput[]
): Map<string, SongInput[]> =>
	songs.reduce((groups, section) => {
		const songKey = resolveSongKey(section);
		return groups.set(songKey, [...(groups.get(songKey) ?? []), section]);
	}, new Map<string, SongInput[]>());

const primaryTonality = (
	sections: SongInput[]
): { key: string; scale: string } => {
	const chordCounts = sections.reduce((counts, section) => {
		const id = `${section.key}|${section.scale}`;
		return counts.set(id, (counts.get(id) ?? 0) + section.progression.length);
	}, new Map<string, number>());
	const [topId] = [...chordCounts.entries()].sort((a, b) => b[1] - a[1])[0];
	const [key, scale] = topId.split("|");
	return { key, scale };
};

export const buildSongSnapshots = (
	songs: SongInput[],
	metaBySongKey: Map<string, SongSourceMeta>
): Map<string, SongKeySnapshot> =>
	new Map(
		[...groupSectionsBySongKey(songs)].map(([songKey, sections]) => {
			const { key, scale } = primaryTonality(sections);
			const meta = metaBySongKey.get(songKey);
			return [
				songKey,
				{
					songKey,
					labeledKey: key,
					labeledScale: scale,
					labeledCapo: meta?.capo ?? 0,
					source: sections[0].source ?? "",
					url: meta?.url ?? "",
					title: parseSongTitleAndSectionLabel(sections[0].title).baseTitle,
					artist: sections[0].artists.join(", ")
				}
			];
		})
	);

export const reviewStatusOf = (
	snapshot: SongKeySnapshot,
	ledger: Ledger
): ReviewStatus => {
	const row = ledger.get(snapshot.songKey);
	if (!row) return "unreviewed";
	return isLedgerRowFresh(row, snapshot) ? "fresh" : "stale";
};

const freshRowFor = (
	songKey: string,
	snapshots: Map<string, SongKeySnapshot>,
	ledger: Ledger
): { row: LedgerRow; snapshot: SongKeySnapshot } | null => {
	const snapshot = snapshots.get(songKey);
	const row = ledger.get(songKey);
	if (!snapshot || !row || !isLedgerRowFresh(row, snapshot)) return null;
	return { row, snapshot };
};

export const applyKeyReviewLedger = (
	songs: SongInput[],
	snapshots: Map<string, SongKeySnapshot>,
	ledger: Ledger
): SongInput[] =>
	songs.map((section) => {
		const review = freshRowFor(resolveSongKey(section), snapshots, ledger);
		return review
			? rekeySection(section, review.row, review.snapshot)
			: section;
	});

export const countCorrectedSongs = (
	snapshots: Map<string, SongKeySnapshot>,
	ledger: Ledger
): number =>
	[...snapshots.keys()].filter((songKey) => {
		const review = freshRowFor(songKey, snapshots, ledger);
		return review !== null && ledgerRowChangesSong(review.row);
	}).length;

const isTrustedSong = (
	sections: SongInput[],
	snapshot: SongKeySnapshot,
	ledger: Ledger
): boolean => {
	const row = ledger.get(snapshot.songKey);
	const agentReviewed =
		row !== undefined &&
		row.method === REVIEW_METHODS.agent &&
		isLedgerRowFresh(row, snapshot);
	return agentReviewed || sections[0].source === HOOKTHEORY_SOURCE;
};

const toTrustedSong = (sections: SongInput[]): TrustedSong => {
	const { key, scale } = primaryTonality(sections);
	return {
		primary: tonalityOf(key, scale),
		sections: sections.map((section) => ({
			chords: sectionChords(section),
			tonality: tonalityOf(section.key ?? key, section.scale ?? scale)
		}))
	};
};

export const trainModelFromCorpus = (
	correctedSongs: SongInput[],
	snapshots: Map<string, SongKeySnapshot>,
	ledger: Ledger
): TonalityModel =>
	trainTonalityModel(
		[...groupSectionsBySongKey(correctedSongs)]
			.filter(([songKey, sections]) => {
				const snapshot = snapshots.get(songKey);
				return (
					snapshot !== undefined && isTrustedSong(sections, snapshot, ledger)
				);
			})
			.map(([, sections]) => toTrustedSong(sections))
	);

export const assessSongs = (
	rawSongs: SongInput[],
	snapshots: Map<string, SongKeySnapshot>,
	ledger: Ledger,
	model: TonalityModel,
	includeStatus: (status: ReviewStatus) => boolean
): AssessedSong[] =>
	[...groupSectionsBySongKey(rawSongs)].flatMap(([songKey, sections]) => {
		const snapshot = snapshots.get(songKey);
		if (!snapshot) return [];
		const status = reviewStatusOf(snapshot, ledger);
		if (!includeStatus(status)) return [];
		return [
			{
				snapshot,
				status,
				sections,
				assessment: assessSongKey(
					model,
					sections.map(sectionChords),
					tonalityOf(snapshot.labeledKey, snapshot.labeledScale),
					snapshot.labeledCapo
				)
			}
		];
	});

export const isUnreviewedOrStale = (status: ReviewStatus): boolean =>
	status !== "fresh";

const NO_CAPO = 0;
const REVIEWED_FIT_MARGIN_MULTIPLE = 4;
export const MAX_REVIEWED_FIT_MARGIN =
	MISLABEL_MARGIN * REVIEWED_FIT_MARGIN_MULTIPLE;

export type ReviewMisfit = { row: LedgerRow; margin: number };

const reviewedFitMargin = (
	rawSections: SongInput[],
	row: LedgerRow,
	snapshot: SongKeySnapshot,
	model: TonalityModel
): number =>
	assessSongKey(
		model,
		rawSections
			.map((section) => rekeySection(section, row, snapshot))
			.map(sectionChords),
		tonalityOf(row.key, row.scale),
		NO_CAPO
	).margin;

export const findReviewMisfits = (
	rawSongs: SongInput[],
	rows: LedgerRow[],
	snapshots: Map<string, SongKeySnapshot>,
	model: TonalityModel
): ReviewMisfit[] => {
	const sectionsBySongKey = groupSectionsBySongKey(rawSongs);
	return rows.flatMap((row) => {
		const snapshot = snapshots.get(row.songKey);
		const sections = sectionsBySongKey.get(row.songKey);
		if (!snapshot || !sections) return [];
		const margin = reviewedFitMargin(sections, row, snapshot, model);
		return Number.isFinite(margin) && margin > MAX_REVIEWED_FIT_MARGIN
			? [{ row, margin }]
			: [];
	});
};
