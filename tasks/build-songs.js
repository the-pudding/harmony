import fs from "fs";
import path from "path";
import { csvParse } from "d3";

const HARMONY_ROOT = process.cwd();
const DATA_ROOT = path.join(HARMONY_ROOT, "../harmony-data");
const OUTPUT_PATH = path.join(HARMONY_ROOT, "static/data/songs.json");
const POPULAR_OUTPUT_PATH = path.join(
	HARMONY_ROOT,
	"static/data/popular-songs.json"
);
const TOP10_CSV_PATH = path.join(HARMONY_ROOT, "static/top10-songs.csv");
const SECTION_LABEL_SUFFIX_PATTERN = /^(.+) \(([^)]+)\)$/;
const TRACKER_PATH = path.join(DATA_ROOT, "data/tracker.csv");
const BILLBOARD_PATH = path.join(DATA_ROOT, "data/billboard.csv");
const BILLBOARD_TOP_RANK = 100;
const MISSING_POPULARITY_SCORE = 0;
const SONG_SOURCE_DIRS = [
	{ dirPath: path.join(DATA_ROOT, "songs/hooktheory"), source: "HT" },
	{ dirPath: path.join(DATA_ROOT, "songs/ug"), source: "UG" }
];

const NOTES_PER_OCTAVE = 12;
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
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
		((letterPitchClass + accidentalOffset) % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE
	) % NOTES_PER_OCTAVE;
};

const tonicToPitchClass = (key) => {
	const pitchClass = parseNoteToPitchClass(key);
	if (pitchClass === null) throw new Error(`Invalid key: "${key}"`);
	return pitchClass;
};

const SCALE_INTERVALS = {
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	phrygian: [0, 1, 3, 5, 7, 8, 10],
	lydian: [0, 2, 4, 6, 7, 9, 11],
	mixolydian: [0, 2, 4, 5, 7, 9, 10],
	locrian: [0, 1, 3, 5, 6, 8, 10],
	harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
	phrygianDominant: [0, 1, 4, 5, 7, 8, 10]
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
	NOTE_NAMES[((pitchClass % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE];

const degreeToPitchClass = (degree, key, scale) => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) {
		throw new Error(
			`Unknown scale "${scale}"; add it to SCALE_INTERVALS instead of silently defaulting to major`
		);
	}
	const offset = intervals[degree - 1];
	if (offset === undefined) return null;
	return (tonicToPitchClass(key) + offset) % NOTES_PER_OCTAVE;
};

const humanizeSlug = (slug) =>
	slug
		.split("-")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

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

const degreeQualityToRoman = (degree, quality) => {
	if (degree < 1 || degree > ROMAN_BASE.length) return null;

	const base = ROMAN_BASE[degree - 1];

	if (quality === "maj") return base;
	if (quality === "min") return base.toLowerCase();
	if (quality === "dim") return `${base.toLowerCase()}°`;
	if (quality === "aug") return `${base}+`;

	return null;
};

const progressionChordInputsAreEqual = (a, b) =>
	a.noteName === b.noteName &&
	a.suffix === b.suffix &&
	(a.bassNoteName ?? undefined) === (b.bassNoteName ?? undefined);

const chordsToRomanTokens = (chords) =>
	(chords ?? [])
		.map(({ degree, quality }) => degreeQualityToRoman(degree, quality))
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

const chordToProgressionInput = (chord, key, scale) => {
	const suffix = qualityExtensionToSuffix(chord);
	if (!suffix) return null;

	const rootPitchClass = degreeToPitchClass(chord.degree, key, scale);
	const bassPitchClass = degreeToPitchClass(chord.bass_degree, key, scale);
	if (rootPitchClass === null || bassPitchClass === null) return null;

	const noteName = pitchClassToNoteName(rootPitchClass);
	const bassNoteName =
		bassPitchClass !== rootPitchClass ? pitchClassToNoteName(bassPitchClass) : undefined;

	return bassNoteName ? { noteName, suffix, bassNoteName } : { noteName, suffix };
};

const intervalBetweenRoots = (fromPitchClass, toPitchClass) =>
	(toPitchClass - fromPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

const toPrecomputedAbstractProgression = (progression) => {
	const rootPitchClasses = progression.map(({ noteName }) => parseNoteToPitchClass(noteName));
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

const sectionToSongInput = (
	section,
	trackerEntry,
	artistSlug,
	songSlug,
	billboardEntry,
	source
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
	const romanTokens = chordsToRomanTokens(normalizedChords);

	if (progression.length === 0) return null;

	const artists = resolveArtists(trackerEntry, artistSlug);
	const title = section.name
		? `${section.songTitle} (${section.name})`
		: section.songTitle;
	const abstractProgression = toPrecomputedAbstractProgression(progression);
	const sectionId = section.id ?? section.name ?? title;
	const popularityScore = billboardEntry?.popularityScore;
	const year = billboardEntry?.year;

	return {
		id: `${artistSlug}__${songSlug}__${sectionId}`,
		songKey: trackerKey(artistSlug, songSlug),
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

const readSongFiles = (dirPath) => {
	if (!fs.existsSync(dirPath)) return [];
	return fs
		.readdirSync(dirPath)
		.filter((fileName) => fileName.endsWith(".json"))
		.map((fileName) => path.join(dirPath, fileName));
};

const loadTrackerIndex = () => {
	if (!fs.existsSync(TRACKER_PATH)) {
		console.warn(`Tracker not found at ${TRACKER_PATH}; skipping Billboard flags`);
		return new Map();
	}

	return csvParse(fs.readFileSync(TRACKER_PATH, "utf-8")).reduce((index, row) => {
		const key = trackerKey(row.artist, row.song);
		return index.set(key, row);
	}, new Map());
};

const parseBillboardChartYear = (date) => {
	const year = Number(String(date).slice(0, 4));
	return Number.isFinite(year) ? year : undefined;
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

const buildSongs = () => {
	const trackerIndex = loadTrackerIndex();
	const billboardIndex = loadBillboardIndex();
	const stats = {
		filesRead: 0,
		sectionsWritten: 0,
		sectionsSkipped: 0,
		chordsDropped: 0,
		songsDeduped: 0,
		unrecognizedSuffixes: new Map()
	};

	// Track which song keys have already been emitted. Since SONG_SOURCE_DIRS
	// lists HookTheory first, any song present in both sources will use the HT
	// transcription (more accurate) and the UG version will be skipped.
	const seenSongKeys = new Set();

	const songs = SONG_SOURCE_DIRS.flatMap(({ dirPath, source }) =>
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

			return (songData.sections ?? []).flatMap((section) => {
				const originalChordCount = section.chords?.length ?? 0;
				const songInput = sectionToSongInput(
					section,
					trackerEntry,
					songData.artist,
					songData.song,
					billboardEntry,
					source
				);

				if (!songInput) {
					stats.sectionsSkipped += 1;
					(section.chords ?? []).forEach((chord) => {
						if (!qualityExtensionToSuffix(chord)) {
							const combo = `${chord.quality}|${chord.extension ?? "null"}|${(chord.suspensions ?? []).join(",")}`;
							stats.unrecognizedSuffixes.set(
								combo,
								(stats.unrecognizedSuffixes.get(combo) ?? 0) + 1
							);
						}
					});
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
};;

const parseSongTitleAndSectionLabel = (title) => {
	const match = title.match(SECTION_LABEL_SUFFIX_PATTERN);
	if (!match) return { baseTitle: title, sectionLabel: null };
	return { baseTitle: match[1], sectionLabel: match[2] };
};

const parseCsvLine = (line) => {
	const fields = [];
	let current = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (inQuotes) {
			if (char === '"') inQuotes = false;
			else current += char;
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			fields.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	fields.push(current);
	return fields;
};

const matchKey = (title, artists) =>
	`${title.trim().toLowerCase()}::${artists
		.map((artist) => artist.trim().toLowerCase())
		.join(",")}`;

const loadTop10MatchKeys = () => {
	if (!fs.existsSync(TOP10_CSV_PATH)) {
		console.warn(
			`Top 10 CSV not found at ${TOP10_CSV_PATH}; skipping popular songs output`
		);
		return new Set();
	}

	const top10Songs = fs
		.readFileSync(TOP10_CSV_PATH, "utf-8")
		.trim()
		.split("\n")
		.slice(1)
		.map((line) => {
			const [title, artists] = parseCsvLine(line);
			return {
				title: title.trim(),
				artists: artists.split(",").map((artist) => artist.trim())
			};
		});

	return new Set(top10Songs.map((song) => matchKey(song.title, song.artists)));
};

const filterPopularSongs = (songs, top10Keys) => {
	if (top10Keys.size === 0) return [];

	return songs.filter((song) => {
		const { baseTitle } = parseSongTitleAndSectionLabel(song.title);
		return top10Keys.has(matchKey(baseTitle, song.artists));
	});
};

const ensureOutputDir = () => {
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
};

const logSummary = (stats) => {
	console.log(`Wrote ${stats.sectionsWritten} sections from ${stats.filesRead} song files`);
	console.log(`Skipped ${stats.sectionsSkipped} empty sections`);
	console.log(`Dropped ${stats.chordsDropped} unmapped chords`);
	console.log(
		`Deduped ${stats.songsDeduped} UG songs already covered by HookTheory`
	);

	if (stats.unrecognizedSuffixes.size > 0) {
		const topUnrecognized = [...stats.unrecognizedSuffixes.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
		console.log("Top unrecognized suffix combos:");
		topUnrecognized.forEach(([combo, count]) => console.log(`  ${combo}: ${count}`));
	}
};

const main = () => {
	if (!fs.existsSync(DATA_ROOT)) {
		throw new Error(`harmony-data not found at ${DATA_ROOT}`);
	}

	const { songs, stats } = buildSongs();
	ensureOutputDir();
	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(songs));
	logSummary(stats);
	console.log(`Output: ${OUTPUT_PATH}`);

	const top10Keys = loadTop10MatchKeys();
	const popularSongs = filterPopularSongs(songs, top10Keys);
	fs.writeFileSync(POPULAR_OUTPUT_PATH, JSON.stringify(popularSongs));
	const popularSongKeys = new Set(popularSongs.map((song) => song.songKey));
	console.log(
		`Wrote ${popularSongs.length} popular sections (${popularSongKeys.size} songs) to ${POPULAR_OUTPUT_PATH}`
	);
};

main();
