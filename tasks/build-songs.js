import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { csvParse } from "d3";
import { SCALE_INTERVALS } from "../src/chord-processing/scale-intervals.js";

const HARMONY_ROOT = process.cwd();
const DATA_ROOT = path.join(HARMONY_ROOT, "../harmony-data");
const OUTPUT_PATH = path.join(HARMONY_ROOT, "static/data/songs.json");
const TRACKER_PATH = path.join(DATA_ROOT, "data/tracker.csv");
const BILLBOARD_PATH = path.join(DATA_ROOT, "data/billboard.csv");
const BILLBOARD_TOP_RANK = 100;
const MISSING_POPULARITY_SCORE = 0;
const SONG_SOURCE_DIRS = [{ dirPath: path.join(DATA_ROOT, "songs/corrected") }];
const ARTIST_SONGS_ROOT = path.join(DATA_ROOT, "songs/artist");
const ARTIST_OUTPUT_DIR = path.join(HARMONY_ROOT, "static/data/artists");
const ARTIST_MANIFEST_PATH = path.join(ARTIST_OUTPUT_DIR, "index.json");
const ARTIST_FILE_NAME_PATTERN = /^(.+)__(.+)\.json$/;
const POPULAR_UG_SOURCE_DIRS = [
	{ dirPath: path.join(DATA_ROOT, "songs/popular-ug") }
];
const POPULAR_UG_OUTPUT_PATH = path.join(
	HARMONY_ROOT,
	"static/data/popular-ug.json"
);

const NOTES_PER_OCTAVE = 12;
const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"Eb",
	"E",
	"F",
	"F#",
	"G",
	"Ab",
	"A",
	"Bb",
	"B"
];
const NOTE_LETTER_PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const parseNoteToPitchClass = (noteName) => {
	const match = noteName.trim().match(/^([A-Ga-g])([b#]*)$/);
	if (!match) return null;

	const letterPitchClass = NOTE_LETTER_PITCH_CLASSES[match[1].toUpperCase()];
	if (letterPitchClass === undefined) return null;

	const accidentalOffset = [...match[2]].reduce(
		(offset, accidental) => offset + (accidental === "#" ? 1 : -1),
		0
	);

	return (
		(((letterPitchClass + accidentalOffset) % NOTES_PER_OCTAVE) +
			NOTES_PER_OCTAVE) %
		NOTES_PER_OCTAVE
	);
};

const tonicToPitchClass = (key) => {
	const pitchClass = parseNoteToPitchClass(key);
	if (pitchClass === null) throw new Error(`Invalid key: "${key}"`);
	return pitchClass;
};

const KEBAB_SEPARATORS = /[\s_]+/g;

const kebabCase = (value) =>
	value
		.replace(/\./g, "")
		.replace(/[^\w\s-]/g, "")
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.trim()
		.toLowerCase()
		.replace(KEBAB_SEPARATORS, "-");

const pitchClassToNoteName = (pitchClass) =>
	NOTE_NAMES[
		((pitchClass % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
	];

const degreeToPitchClass = (degree, key, scale, accidental = 0) => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) {
		throw new Error(
			`Unknown scale "${scale}"; add it to SCALE_INTERVALS instead of silently defaulting to major`
		);
	}
	const offset = intervals[degree - 1];
	if (offset === undefined) return null;
	return (
		(tonicToPitchClass(key) + offset + accidental + NOTES_PER_OCTAVE * 2) %
		NOTES_PER_OCTAVE
	);
};

const humanizeSlug = (slug) =>
	slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

// Slugs collapse apostrophes into "-s-" (e.g. "taylor-s-version" for
// "Taylor's Version"); this heuristic reconstructs the common contraction.
// It's not a general slug-humanizer, but it's good enough for the small,
// spot-checkable set of album slugs in songs/artist/.
const humanizeAlbumSlug = (slug) => humanizeSlug(slug).replace(/ S\b/g, "'s");

const trackerKey = (artist, song) => `${kebabCase(artist)}__${kebabCase(song)}`;

const ARTIST_COLLAB_SPLIT_PATTERN =
	/\s*(?:,\s*|\s+(?:feat\.?|ft\.?|featuring|duet with|presents|meets|vs\.?|introducing)\s+|\s+with\s+|\s*&\s*|\s+[xX]\s+|\s+\/\s+|\s+\+\s+|\s+or\s+|\s+and\s+(?!the\b|i\b))/gi;

const COLLAB_PREFIX_PATTERN =
	/^(?:feat\.?|ft\.?|featuring|with|duet with|introducing)\s+/i;

const NESTED_ARTIST_PATTERN = /[\[(]([^\])]+)[\])]/g;

const SLUG_COLLAB_SPLIT_PATTERN = /-(?:featuring|feat|ft|with|introducing)-/i;

const SLUG_AND_SPLIT_PATTERN = /-and-/i;

const trimArtistPart = (part) =>
	part.replace(COLLAB_PREFIX_PATTERN, "").replace(/\s+/g, " ").trim();

const splitOnCollabMarkers = (value) =>
	value.split(ARTIST_COLLAB_SPLIT_PATTERN).map(trimArtistPart).filter(Boolean);

const parseArtists = (artistString) => {
	const nestedArtists = [];
	const withoutBrackets = artistString.replace(
		NESTED_ARTIST_PATTERN,
		(_, inner) => {
			if (/[&,\/]|feat|ft\.|with| x | X /i.test(inner)) {
				parseArtists(inner).forEach((artist) => nestedArtists.push(artist));
			}
			return " ";
		}
	);

	const colonParts = withoutBrackets.includes(":")
		? withoutBrackets.split(/\s*:\s*/).flatMap(splitOnCollabMarkers)
		: splitOnCollabMarkers(withoutBrackets);

	return [...colonParts, ...nestedArtists].map(trimArtistPart).filter(Boolean);
};

const parseArtistsFromSlug = (artistSlug) => {
	const slugParenArtists = [];
	const withoutSlugParens = artistSlug.replace(/\(([^)]+)\)/g, (_, inner) => {
		parseArtistsFromSlug(inner).forEach((artist) =>
			slugParenArtists.push(artist)
		);
		return "-";
	});
	const segments = withoutSlugParens
		.split(SLUG_COLLAB_SPLIT_PATTERN)
		.filter(Boolean);

	const artists = segments.flatMap((segment, index) => {
		const slugParts =
			index === 0 ? [segment] : segment.split(SLUG_AND_SPLIT_PATTERN);
		return slugParts.map((slugPart) => humanizeSlug(slugPart));
	});

	return [...artists, ...slugParenArtists]
		.flatMap((artist) => parseArtists(artist))
		.filter(Boolean);
};

const resolveArtists = (trackerEntry, artistSlug) =>
	trackerEntry?.artist
		? parseArtists(trackerEntry.artist)
		: parseArtistsFromSlug(artistSlug);

const billboardPopularityPoints = (rank) => BILLBOARD_TOP_RANK + 1 - rank;

const compareSongsByPopularity = (a, b) => {
	const scoreDelta =
		(b.popularityScore ?? MISSING_POPULARITY_SCORE) -
		(a.popularityScore ?? MISSING_POPULARITY_SCORE);
	if (scoreDelta !== 0) return scoreDelta;
	return a.title.localeCompare(b.title);
};

const ROMAN_BASE = ["I", "II", "III", "IV", "V", "VI", "VII"];

const PARALLEL_HOME_SCALE = {
	major: "minor",
	minor: "major"
};

const degreeQualityToRoman = (degree, quality, accidental = 0) => {
	if (degree < 1 || degree > ROMAN_BASE.length) return null;

	const base = ROMAN_BASE[degree - 1];
	let roman = null;

	if (quality === "maj") roman = base;
	else if (quality === "min") roman = base.toLowerCase();
	else if (quality === "dim") roman = `${base.toLowerCase()}°`;
	else if (quality === "aug") roman = `${base}+`;

	if (!roman) return null;

	if (accidental === -1) return `b${roman}`;
	if (accidental === 1) return `#${roman}`;
	return roman;
};

const resolveAccidental = (chord, key, scale) => {
	if (chord.accidental !== undefined && chord.accidental !== 0) {
		return chord.accidental;
	}

	if (!chord.borrowed) return 0;

	const parallelScale = PARALLEL_HOME_SCALE[scale];
	if (!parallelScale) return 0;

	const homeIntervals = SCALE_INTERVALS[scale];
	const parallelIntervals = SCALE_INTERVALS[parallelScale];
	if (!homeIntervals || !parallelIntervals) return 0;

	const homeOffset = homeIntervals[chord.degree - 1];
	const parallelOffset = parallelIntervals[chord.degree - 1];
	if (homeOffset === undefined || parallelOffset === undefined) return 0;

	const tonic = tonicToPitchClass(key);
	const homePc = (tonic + homeOffset) % NOTES_PER_OCTAVE;
	const parallelPc = (tonic + parallelOffset) % NOTES_PER_OCTAVE;
	if (homePc === parallelPc) return 0;

	const diff = (parallelPc - homePc + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;
	if (diff === 11) return -1;
	if (diff === 1) return 1;
	return 0;
};

const progressionChordInputsAreEqual = (a, b) =>
	a.noteName === b.noteName &&
	a.suffix === b.suffix &&
	(a.bassNoteName ?? undefined) === (b.bassNoteName ?? undefined);

const chordsToRomanTokens = (chords, key, scale) =>
	(chords ?? [])
		.map((chord) =>
			degreeQualityToRoman(
				chord.degree,
				chord.quality,
				resolveAccidental(chord, key, scale)
			)
		)
		.filter(Boolean);

const qualityExtensionToSuffix = ({ quality, extension, suspensions }) => {
	const suspension = suspensions?.[0] ?? null;

	if (!extension && suspension === 2) return "sus2";
	if (!extension && suspension === 4) return "sus4";
	if (quality === "maj" && extension === "7" && suspension === 4)
		return "7sus4";

	if (quality === "maj" && extension === "maj7") return "maj7";
	if (quality === "maj" && extension === "7") return "7";
	if (quality === "maj" && extension === "9") return "9";
	if (quality === "maj" && !extension) return "major";

	if (quality === "min" && extension === "7") return "minor7";
	if (quality === "min" && extension === "9") return "minor9";
	if (quality === "min" && !extension) return "minor";

	if (quality === "dim" && extension === "hdim7") return "m7b5";
	if (quality === "dim" && extension === "dim7") return "dim7";
	if (quality === "dim" && !extension) return "diminished";

	if (quality === "aug" && !extension) return "augmented";

	if (quality === "maj") return "major";
	if (quality === "min") return "minor";
	if (quality === "dim") return "diminished";
	if (quality === "aug") return "augmented";

	return null;
};

const parseSlashBassNoteName = (chordName) => {
	if (!chordName?.includes("/")) return null;
	const bassPart = chordName.slice(chordName.indexOf("/") + 1).trim();
	const match = bassPart.match(/^([A-G][#b]?)/);
	if (!match) return null;
	return match[1];
};

const chordToProgressionInput = (chord, key, scale) => {
	const suffix = qualityExtensionToSuffix(chord);
	if (!suffix) return null;

	const accidental = resolveAccidental(chord, key, scale);
	const rootPitchClass = degreeToPitchClass(
		chord.degree,
		key,
		scale,
		accidental
	);
	const slashBassNoteName = parseSlashBassNoteName(chord.name);
	const bassPitchClass = slashBassNoteName
		? parseNoteToPitchClass(slashBassNoteName)
		: degreeToPitchClass(
				chord.bass_degree,
				key,
				scale,
				chord.bass_accidental ?? accidental
			);
	if (rootPitchClass === null || bassPitchClass === null) return null;

	const noteName = pitchClassToNoteName(rootPitchClass);
	const bassNoteName =
		bassPitchClass !== rootPitchClass
			? pitchClassToNoteName(bassPitchClass)
			: undefined;

	return bassNoteName
		? { noteName, suffix, bassNoteName }
		: { noteName, suffix };
};

const intervalBetweenRoots = (fromPitchClass, toPitchClass) =>
	(toPitchClass - fromPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

const toPrecomputedAbstractProgression = (progression) => {
	const rootPitchClasses = progression.map(({ noteName }) =>
		parseNoteToPitchClass(noteName)
	);
	const suffixes = progression.map(({ suffix }) => suffix);
	const bassIntervals = progression.map(({ noteName, bassNoteName }) => {
		const rootPitchClass = parseNoteToPitchClass(noteName);
		if (!bassNoteName) return null;

		const bassPitchClass = parseNoteToPitchClass(bassNoteName);
		return bassPitchClass === rootPitchClass
			? null
			: intervalBetweenRoots(rootPitchClass, bassPitchClass);
	});
	const deltas = rootPitchClasses
		.slice(1)
		.map((toPitchClass, index) =>
			intervalBetweenRoots(rootPitchClasses[index], toPitchClass)
		);
	const wrapDelta =
		rootPitchClasses.length > 1
			? intervalBetweenRoots(
					rootPitchClasses[rootPitchClasses.length - 1],
					rootPitchClasses[0]
				)
			: 0;

	return { suffixes, deltas, bassIntervals, wrapDelta };
};

const sectionToSongInputCore = (
	section,
	trackerEntry,
	artistSlug,
	billboardEntry,
	source,
	songKey,
	idPrefix,
	baseTitle
) => {
	const keptChords = (section.chords ?? []).filter(
		(chord) =>
			chordToProgressionInput(chord, section.key, section.scale) !== null
	);
	const progressionWithChords = keptChords.flatMap((chord) => {
		const input = chordToProgressionInput(chord, section.key, section.scale);
		return input ? [{ input, chord }] : [];
	});
	const normalizedPairs = progressionWithChords.filter(
		({ input }, index) =>
			index === 0 ||
			!progressionChordInputsAreEqual(
				input,
				progressionWithChords[index - 1].input
			)
	);
	const progression = normalizedPairs.map(({ input }) => input);
	const normalizedChords = normalizedPairs.map(({ chord }) => chord);
	const romanTokens = chordsToRomanTokens(
		normalizedChords,
		section.key,
		section.scale
	);

	if (progression.length === 0) return null;

	const artists = resolveArtists(trackerEntry, artistSlug);
	const title = section.name ? `${baseTitle} (${section.name})` : baseTitle;
	const abstractProgression = toPrecomputedAbstractProgression(progression);
	const sectionId = section.id ?? section.name ?? title;
	const popularityScore = billboardEntry?.popularityScore;
	const year = billboardEntry?.year;

	return {
		id: `${idPrefix}__${sectionId}`,
		songKey,
		source,
		title,
		artists,
		...(popularityScore !== undefined ? { popularityScore } : {}),
		...(year !== undefined ? { year } : {}),
		...(trackerEntry
			? {
					inTop10: trackerEntry.inTop10 === "true",
					inTop40: trackerEntry.inTop40 === "true",
					inTop100: trackerEntry.inTop100 === "true"
				}
			: {}),
		progression,
		romanTokens,
		key: section.key,
		scale: section.scale,
		...abstractProgression
	};
};

const sectionToSongInput = (
	section,
	trackerEntry,
	artistSlug,
	songSlug,
	billboardEntry,
	source
) =>
	sectionToSongInputCore(
		section,
		trackerEntry,
		artistSlug,
		billboardEntry,
		source,
		trackerKey(artistSlug, songSlug),
		`${artistSlug}__${songSlug}`,
		section.songTitle
	);

const sectionToArtistSongInput = (
	section,
	trackerEntry,
	artistSlug,
	songSlug,
	albumSlug,
	billboardEntry,
	source
) => {
	const versionKey = `${trackerKey(artistSlug, songSlug)}__${kebabCase(albumSlug)}`;
	return sectionToSongInputCore(
		section,
		trackerEntry,
		artistSlug,
		billboardEntry,
		source,
		versionKey,
		versionKey,
		`${section.songTitle} (${humanizeAlbumSlug(albumSlug)})`
	);
};

const readSongFiles = (dirPath) => {
	if (!fs.existsSync(dirPath)) return [];
	return fs
		.readdirSync(dirPath)
		.filter((fileName) => fileName.endsWith(".json"))
		.map((fileName) => path.join(dirPath, fileName));
};

const loadTrackerIndex = () => {
	if (!fs.existsSync(TRACKER_PATH)) {
		console.warn(
			`Tracker not found at ${TRACKER_PATH}; skipping Billboard flags`
		);
		return new Map();
	}

	return csvParse(fs.readFileSync(TRACKER_PATH, "utf-8")).reduce(
		(index, row) => {
			const key = trackerKey(row.artist, row.song);
			return index.set(key, row);
		},
		new Map()
	);
};

const DECIMAL_YEAR_PRECISION = 1e6;

const parseBillboardChartYear = (date) => {
	const isoDate = String(date).slice(0, 10);
	const parsed = new Date(`${isoDate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return undefined;

	const year = parsed.getUTCFullYear();
	const yearStartMs = Date.UTC(year, 0, 1);
	const yearEndMs = Date.UTC(year + 1, 0, 1);
	const yearLengthMs = yearEndMs - yearStartMs;
	if (yearLengthMs <= 0) return undefined;

	const fraction = (parsed.getTime() - yearStartMs) / yearLengthMs;
	return (
		Math.round((year + fraction) * DECIMAL_YEAR_PRECISION) /
		DECIMAL_YEAR_PRECISION
	);
};

const loadBillboardIndex = () => {
	if (!fs.existsSync(BILLBOARD_PATH)) {
		console.warn(
			`Billboard not found at ${BILLBOARD_PATH}; skipping popularity scores`
		);
		return new Map();
	}

	return csvParse(fs.readFileSync(BILLBOARD_PATH, "utf-8")).reduce(
		(index, row) => {
			const key = trackerKey(row.artist, row.song);
			const rank = Number(row.rank);
			const chartYear = parseBillboardChartYear(row.date);
			if (!Number.isFinite(rank) || rank < 1 || rank > BILLBOARD_TOP_RANK)
				return index;

			const points = billboardPopularityPoints(rank);
			const prev = index.get(key) ?? {
				popularityScore: 0,
				bestRank: Infinity,
				year: undefined
			};
			const isBestRank = rank < prev.bestRank;

			return index.set(key, {
				popularityScore: prev.popularityScore + points,
				bestRank: isBestRank ? rank : prev.bestRank,
				year: isBestRank && chartYear !== undefined ? chartYear : prev.year
			});
		},
		new Map()
	);
};

const buildSongs = (sourceDirs, trackerIndex, billboardIndex) => {
	const stats = {
		filesRead: 0,
		sectionsWritten: 0,
		sectionsSkipped: 0,
		chordsDropped: 0,
		songsDeduped: 0,
		unrecognizedSuffixes: new Map()
	};

	const seenSongKeys = new Set();

	const songs = sourceDirs.flatMap(({ dirPath }) =>
		readSongFiles(dirPath).flatMap((filePath) => {
			stats.filesRead += 1;
			const songData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
			const lookupKey = trackerKey(songData.artist, songData.song);

			if (seenSongKeys.has(lookupKey)) {
				stats.songsDeduped += 1;
				return [];
			}
			seenSongKeys.add(lookupKey);

			const trackerEntry = trackerIndex.get(lookupKey);
			const billboardEntry = billboardIndex.get(lookupKey);
			const resolvedSource = songData.source === "ug" ? "UG" : "HT";

			return (songData.sections ?? []).flatMap((section) => {
				const originalChordCount = section.chords?.length ?? 0;
				const songInput = sectionToSongInput(
					section,
					trackerEntry,
					songData.artist,
					songData.song,
					billboardEntry,
					resolvedSource
				);

				if (!songInput) {
					stats.sectionsSkipped += 1;
					trackUnrecognizedSuffixes(stats, section.chords);
					return [];
				}

				stats.chordsDropped +=
					originalChordCount - songInput.progression.length;
				stats.sectionsWritten += 1;
				return [songInput];
			});
		})
	);

	songs.sort(compareSongsByPopularity);

	return { songs, stats };
};

const listArtistSlugs = () => {
	if (!fs.existsSync(ARTIST_SONGS_ROOT)) return [];
	return fs
		.readdirSync(ARTIST_SONGS_ROOT, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
};

const trackUnrecognizedSuffixes = (stats, chords) => {
	(chords ?? []).forEach((chord) => {
		if (qualityExtensionToSuffix(chord)) return;
		const combo = `${chord.quality}|${chord.extension ?? "null"}|${(chord.suspensions ?? []).join(",")}`;
		stats.unrecognizedSuffixes.set(
			combo,
			(stats.unrecognizedSuffixes.get(combo) ?? 0) + 1
		);
	});
};

// Every file under songs/artist/<slug>/ is already uniquely named
// ("<song>__<album>.json"), so unlike buildSongs() there's no cross-file
// dedup to do here — each file becomes its own distinct song version.
const buildArtistSongs = (artistSlug, trackerIndex, billboardIndex) => {
	const dirPath = path.join(ARTIST_SONGS_ROOT, artistSlug);
	const stats = {
		filesRead: 0,
		sectionsWritten: 0,
		sectionsSkipped: 0,
		chordsDropped: 0,
		unrecognizedSuffixes: new Map()
	};

	const songs = readSongFiles(dirPath).flatMap((filePath) => {
		const fileName = path.basename(filePath);
		const match = fileName.match(ARTIST_FILE_NAME_PATTERN);
		if (!match) {
			console.warn(
				`[${artistSlug}] skipping "${fileName}": expected "<song>__<album>.json"`
			);
			return [];
		}
		stats.filesRead += 1;
		const [, songSlug, albumSlug] = match;
		const songData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
		const lookupKey = trackerKey(songData.artist, songData.song);
		const trackerEntry = trackerIndex.get(lookupKey);
		const billboardEntry = billboardIndex.get(lookupKey);
		const resolvedSource = songData.source === "ug" ? "UG" : "HT";

		return (songData.sections ?? []).flatMap((section) => {
			const originalChordCount = section.chords?.length ?? 0;
			const songInput = sectionToArtistSongInput(
				section,
				trackerEntry,
				artistSlug,
				songSlug,
				albumSlug,
				billboardEntry,
				resolvedSource
			);

			if (!songInput) {
				stats.sectionsSkipped += 1;
				trackUnrecognizedSuffixes(stats, section.chords);
				return [];
			}

			stats.chordsDropped += originalChordCount - songInput.progression.length;
			stats.sectionsWritten += 1;
			return [songInput];
		});
	});

	songs.sort(compareSongsByPopularity);

	return { songs, stats };
};

const buildAndWriteArtistDatasets = (trackerIndex, billboardIndex) => {
	const artistSlugs = listArtistSlugs();
	if (artistSlugs.length === 0) return;

	fs.mkdirSync(ARTIST_OUTPUT_DIR, { recursive: true });

	const manifestEntries = artistSlugs.map((artistSlug) => {
		const { songs, stats } = buildArtistSongs(
			artistSlug,
			trackerIndex,
			billboardIndex
		);
		const outputPath = path.join(ARTIST_OUTPUT_DIR, `${artistSlug}.json`);
		fs.writeFileSync(outputPath, JSON.stringify(songs));
		console.log(
			`[${artistSlug}] wrote ${stats.sectionsWritten} sections from ${stats.filesRead} files ` +
				`(${stats.sectionsSkipped} skipped, ${stats.chordsDropped} chords dropped) -> ${outputPath}`
		);
		return {
			slug: artistSlug,
			artistName: humanizeSlug(artistSlug),
			songCount: new Set(songs.map((song) => song.songKey)).size
		};
	});

	fs.writeFileSync(ARTIST_MANIFEST_PATH, JSON.stringify(manifestEntries));
	console.log(
		`Wrote artist manifest (${manifestEntries.length} artists) -> ${ARTIST_MANIFEST_PATH}`
	);
};

const ensureOutputDir = () => {
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
};

const logSummary = (stats) => {
	console.log(
		`Wrote ${stats.sectionsWritten} sections from ${stats.filesRead} song files`
	);
	console.log(`Skipped ${stats.sectionsSkipped} empty sections`);
	console.log(`Dropped ${stats.chordsDropped} unmapped chords`);
	console.log(`Deduped ${stats.songsDeduped} duplicate songs`);

	if (stats.unrecognizedSuffixes.size > 0) {
		const topUnrecognized = [...stats.unrecognizedSuffixes.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
		console.log("Top unrecognized suffix combos:");
		topUnrecognized.forEach(([combo, count]) =>
			console.log(`  ${combo}: ${count}`)
		);
	}
};

const main = () => {
	if (!fs.existsSync(DATA_ROOT)) {
		throw new Error(`harmony-data not found at ${DATA_ROOT}`);
	}

	const trackerIndex = loadTrackerIndex();
	const billboardIndex = loadBillboardIndex();

	const { songs, stats } = buildSongs(SONG_SOURCE_DIRS, trackerIndex, billboardIndex);
	ensureOutputDir();
	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(songs));
	logSummary(stats);
	console.log(`Output: ${OUTPUT_PATH}`);

	buildAndWriteArtistDatasets(trackerIndex, billboardIndex);

	const { songs: popularUgSongs, stats: popularUgStats } = buildSongs(
		POPULAR_UG_SOURCE_DIRS,
		trackerIndex,
		billboardIndex
	);
	fs.writeFileSync(POPULAR_UG_OUTPUT_PATH, JSON.stringify(popularUgSongs));
	logSummary(popularUgStats);
	console.log(`Output: ${POPULAR_UG_OUTPUT_PATH}`);
};

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
	main();
}

export {
	chordToProgressionInput,
	chordsToRomanTokens,
	degreeQualityToRoman,
	degreeToPitchClass,
	resolveAccidental
};
