import fs from "fs";
import path from "path";
import { csvParse } from "d3";

const HARMONY_ROOT = process.cwd();
const DATA_ROOT = path.join(HARMONY_ROOT, "../harmony-data");
const OUTPUT_PATH = path.join(HARMONY_ROOT, "static/data/songs.json");
const TRACKER_PATH = path.join(DATA_ROOT, "data/tracker.csv");
const SONG_DIRS = [
	path.join(DATA_ROOT, "songs/hooktheory"),
	path.join(DATA_ROOT, "songs/ug")
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
	const intervals = SCALE_INTERVALS[scale] ?? SCALE_INTERVALS.major;
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

const qualityExtensionToSuffix = ({ quality, extension, suspensions }) => {
	const suspension = suspensions?.[0] ?? null;

	if (quality === "maj" && !extension && suspension === 2) return "sus2";
	if (quality === "maj" && !extension && suspension === 4) return "sus4";
	if (quality === "maj" && extension === "maj7") return "maj7";
	if (quality === "maj" && extension === "7") return "7";
	if (quality === "maj" && !extension) return "major";
	if (quality === "min" && extension === "7") return "minor7";
	if (quality === "min" && !extension) return "minor";
	if (quality === "dim" && extension === "hdim7") return "m7b5";
	if (quality === "dim" && extension === "dim7") return "dim7";
	if (quality === "dim" && !extension) return "diminished";
	if (quality === "aug" && !extension) return "augmented";

	if (extension === "9" || extension === "11" || extension === "13") {
		if (quality === "maj") return "major";
		if (quality === "min") return "minor";
		if (quality === "dim") return "diminished";
		if (quality === "aug") return "augmented";
	}

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

const sectionToSongInput = (section, trackerEntry, artistSlug, songSlug) => {
	const progression = (section.chords ?? [])
		.map((chord) => chordToProgressionInput(chord, section.key, section.scale))
		.filter(Boolean);

	if (progression.length === 0) return null;

	const artist = trackerEntry?.artist ?? humanizeSlug(artistSlug);
	const title = section.name
		? `${section.songTitle} (${section.name})`
		: section.songTitle;
	const abstractProgression = toPrecomputedAbstractProgression(progression);
	const sectionId = section.id ?? section.name ?? title;

	return {
		id: `${artistSlug}__${songSlug}__${sectionId}`,
		title,
		artist,
		...(trackerEntry
			? {
					inTop10: trackerEntry.inTop10 === "true",
					inTop40: trackerEntry.inTop40 === "true",
					inTop100: trackerEntry.inTop100 === "true"
				}
			: {}),
		progression,
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

const buildSongs = () => {
	const trackerIndex = loadTrackerIndex();
	const stats = {
		filesRead: 0,
		sectionsWritten: 0,
		sectionsSkipped: 0,
		chordsDropped: 0,
		unrecognizedSuffixes: new Map()
	};

	const songs = SONG_DIRS.flatMap((dirPath) => readSongFiles(dirPath)).flatMap((filePath) => {
		stats.filesRead += 1;
		const songData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
		const lookupKey = trackerKey(songData.artist, songData.song);
		const trackerEntry = trackerIndex.get(lookupKey);

		return (songData.sections ?? []).flatMap((section) => {
			const originalChordCount = section.chords?.length ?? 0;
			const songInput = sectionToSongInput(
				section,
				trackerEntry,
				songData.artist,
				songData.song
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

			stats.chordsDropped += originalChordCount - songInput.progression.length;
			stats.sectionsWritten += 1;
			return [songInput];
		});
	});

	return { songs, stats };
};

const ensureOutputDir = () => {
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
};

const logSummary = (stats) => {
	console.log(`Wrote ${stats.sectionsWritten} sections from ${stats.filesRead} song files`);
	console.log(`Skipped ${stats.sectionsSkipped} empty sections`);
	console.log(`Dropped ${stats.chordsDropped} unmapped chords`);

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
};

main();
