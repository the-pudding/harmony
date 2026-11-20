// Cuts each synced song's full MP3 down to the stretch the app plays.
//
//   npm run clean-mp3             re-save VBR songs as CBR, cut new or changed clips
//   npm run clean-mp3 -- --check  list what's out of date and exit 1 if anything is
//                                 (changes nothing)
//
// Full songs live in full-synced-songs (gitignored, kept on your machine):
// the Record tab of /demo/record plays them, and every chord and region time
// is in their seconds. This writes a clip of each song that has synced chords
// to static/assets/audio/synced-songs, from CLIP_PADDING_SECONDS before the
// earliest time the app can play it to that long after the latest (see
// neededClipRanges), and lists where each clip starts in
// src/data/syncedSongClips.json so the app can play it in song time.
//
// A clip is cut again when its full song changes or its region outgrows it,
// so run this after adding songs or saving new regions. Clips of songs that
// no longer have synced chords are removed.
//
// Clips and full songs are constant bitrate (CBR): browsers can't seek
// accurately in a variable-bitrate MP3 (it only carries a rough 100-point
// index), so a jump can land a second or more away while currentTime still
// reports the asked-for time, and synced chords drift. VBR full songs are
// re-saved as CBR, originals kept in .audio-backups/<time>/ (gitignored);
// re-check the chord times of any that already had synced chords, in
// /demo/record, since they may have been tapped against the drift.
//
// Needs ffmpeg (brew install ffmpeg).
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { csvParse } from "d3";
import fs from "fs";
import path from "path";
import { signatureSongs } from "../src/data/signatureSongs.js";
import {
	neededClipRanges,
	type SyncedSongClip
} from "../src/data/syncedSongClips.js";
import {
	isSyncedSongFile,
	parseSyncedSongAudioFile,
	type SyncedSongFile
} from "../src/data/syncedSongs.js";
import { parseReferenceRows } from "../src/data/syncedSongReference.js";

const FULL_SONG_DIR = "full-synced-songs";
const CLIP_DIR = "static/assets/audio/synced-songs";
const DATA_DIR = "src/data/synced-songs";
const MANIFEST_FILE = "src/data/syncedSongClips.json";
const BACKUP_ROOT = ".audio-backups";
const BITRATE = "160k";
// Slack around each clip, so a small region edit doesn't need a re-cut.
const CLIP_PADDING_SECONDS = 1;
// Bytes searched for a VBR tag after any ID3v2 tag (it's in the first frame).
const HEADER_SEARCH_BYTES = 8192;

// Size of a leading ID3v2 tag (cover art can make it large), or 0.
const id3v2Size = (buffer: Buffer): number => {
	if (buffer.toString("latin1", 0, 3) !== "ID3") return 0;
	const size =
		((buffer[6] & 0x7f) << 21) |
		((buffer[7] & 0x7f) << 14) |
		((buffer[8] & 0x7f) << 7) |
		(buffer[9] & 0x7f);
	const hasFooter = (buffer[5] & 0x10) !== 0;
	return 10 + size + (hasFooter ? 10 : 0);
};

// A Xing or VBRI tag marks a VBR file; LAME's Info tag or no tag, CBR.
const isVbr = (file: string): boolean => {
	const fd = fs.openSync(file, "r");
	try {
		const head = Buffer.alloc(10);
		fs.readSync(fd, head, 0, 10, 0);
		const frame = Buffer.alloc(HEADER_SEARCH_BYTES);
		const read = fs.readSync(fd, frame, 0, frame.length, id3v2Size(head));
		const text = frame.toString("latin1", 0, read);
		return text.includes("Xing") || text.includes("VBRI");
	} finally {
		fs.closeSync(fd);
	}
};

const hasFfmpeg = (): boolean => {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

const sha1Of = (file: string): string =>
	createHash("sha1").update(fs.readFileSync(file)).digest("hex");

const durationOf = (file: string): number =>
	Number(
		execFileSync(
			"ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration",
				"-of",
				"default=nw=1:nk=1",
				file
			],
			{ encoding: "utf8" }
		).trim()
	);

const round3 = (seconds: number): number => Math.round(seconds * 1000) / 1000;

// Encodes file (from startSeconds for durationSeconds, if given) to a CBR
// MP3 at output, via a temp file so a failure leaves output as it was.
const encode = (
	file: string,
	output: string,
	cut?: { startSeconds: number; durationSeconds: number }
) => {
	// a leading dot keeps the temp file out of the folder's song list
	const temp = path.join(
		path.dirname(output),
		`.clean-${process.pid}-${path.basename(output)}`
	);
	try {
		execFileSync(
			"ffmpeg",
			[
				"-y",
				"-v",
				"error",
				"-i",
				file,
				// after -i, so the cut is sample-accurate rather than snapped to
				// the nearest frame
				...(cut
					? ["-ss", `${cut.startSeconds}`, "-t", `${cut.durationSeconds}`]
					: []),
				// audio only: drops cover art, which isn't needed
				"-map",
				"0:a",
				"-codec:a",
				"libmp3lame",
				"-b:a",
				BITRATE,
				temp
			],
			{ stdio: ["ignore", "ignore", "inherit"] }
		);
		if (isVbr(temp)) throw new Error("ffmpeg's output is still VBR");
		fs.renameSync(temp, output);
	} finally {
		fs.rmSync(temp, { force: true });
	}
};

const listMp3s = (dir: string): string[] =>
	fs.existsSync(dir)
		? fs
				.readdirSync(dir)
				.filter((name) => !name.startsWith(".") && /\.mp3$/i.test(name))
				.sort()
		: [];

const loadSyncedSongFiles = (): SyncedSongFile[] =>
	fs
		.readdirSync(DATA_DIR)
		.filter((name) => name.endsWith(".json"))
		.map((name) =>
			JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"))
		)
		.filter(isSyncedSongFile);

const loadManifest = (): Record<string, SyncedSongClip> =>
	fs.existsSync(MANIFEST_FILE)
		? JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"))
		: {};

const main = () => {
	const checkOnly = process.argv.includes("--check");
	if (!hasFfmpeg()) {
		console.error("ffmpeg isn't installed: brew install ffmpeg");
		process.exitCode = 1;
		return;
	}

	const files = loadSyncedSongFiles();
	const ranges = neededClipRanges({
		files,
		rows: parseReferenceRows(
			csvParse(fs.readFileSync(path.join(DATA_DIR, "reference.csv"), "utf8"))
		),
		signatures: signatureSongs
	});
	const fileBySongKey = new Map(files.map((file) => [file.songKey, file]));
	const fullSongs = listMp3s(FULL_SONG_DIR);
	const fullSongBySongKey = new Map(
		fullSongs.flatMap((name) => {
			const audio = parseSyncedSongAudioFile(name);
			return audio ? [[audio.songKey, name] as const] : [];
		})
	);

	const vbrFullSongs = fullSongs.filter((name) =>
		isVbr(path.join(FULL_SONG_DIR, name))
	);
	const manifest = loadManifest();
	const nextManifest: Record<string, SyncedSongClip> = {};
	const toCut: { songKey: string; reason: string }[] = [];
	const missingFullSongs: string[] = [];
	for (const [songKey, range] of ranges) {
		const audioFile = fileBySongKey.get(songKey)!.audioFile;
		const fullSong = fullSongBySongKey.get(songKey);
		if (!fullSong) {
			missingFullSongs.push(audioFile);
			continue;
		}
		const entry = manifest[songKey];
		const reason = !entry
			? "new"
			: !fs.existsSync(path.join(CLIP_DIR, audioFile))
				? "clip file missing"
				: vbrFullSongs.includes(fullSong) ||
					  entry.fullSongSha1 !== sha1Of(path.join(FULL_SONG_DIR, fullSong))
					? "full song changed"
					: entry.bitrate !== BITRATE
						? "bitrate changed"
						: range.startSeconds < entry.offsetSeconds ||
							  range.endSeconds > entry.endSeconds
							? "region outgrew the clip"
							: null;
		if (reason) toCut.push({ songKey, reason });
		else nextManifest[songKey] = entry;
	}
	const wanted = new Set(
		[...ranges.keys()].map((songKey) => fileBySongKey.get(songKey)!.audioFile)
	);
	const strayClips = listMp3s(CLIP_DIR).filter((name) => !wanted.has(name));
	const unsynced = [...fullSongBySongKey.keys()].filter(
		(songKey) => !ranges.has(songKey)
	);

	console.log(
		`${fullSongs.length} full songs, ${ranges.size} with synced chords, ` +
			`${ranges.size - toCut.length - missingFullSongs.length} clips up to date.`
	);
	if (unsynced.length > 0) {
		console.log(`${unsynced.length} without synced chords yet (no clip):`);
		for (const songKey of unsynced) console.log(`  ${songKey}`);
	}
	if (missingFullSongs.length > 0) {
		console.error(
			`${missingFullSongs.length} with synced chords but no full song in ${FULL_SONG_DIR}:`
		);
		for (const name of missingFullSongs) console.error(`  ${name}`);
	}
	const report = (label: string, items: string[]) => {
		if (items.length === 0) return;
		console.log(`${label}:`);
		for (const item of items) console.log(`  ${item}`);
	};
	report("variable-bitrate full songs", vbrFullSongs);
	report(
		"clips to cut",
		toCut.map(({ songKey, reason }) => `${songKey} (${reason})`)
	);
	report("clips to remove", strayClips);

	if (checkOnly) {
		const outOfDate =
			vbrFullSongs.length + toCut.length + strayClips.length > 0 ||
			missingFullSongs.length > 0;
		if (outOfDate) console.log("\nRun npm run clean-mp3 to fix.");
		process.exitCode = outOfDate ? 1 : 0;
		return;
	}

	const failed: string[] = [];
	if (vbrFullSongs.length > 0) {
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupDir = path.join(BACKUP_ROOT, stamp);
		fs.mkdirSync(backupDir, { recursive: true });
		for (const name of vbrFullSongs) {
			const file = path.join(FULL_SONG_DIR, name);
			try {
				fs.copyFileSync(file, path.join(backupDir, name));
				encode(file, file);
				console.log(`re-saved ${name} as CBR`);
			} catch (error) {
				failed.push(name);
				console.error(`failed ${name}: ${(error as Error).message}`);
			}
		}
		console.log(
			`Originals in ${backupDir}/. Re-check the chord times of any of these ` +
				"that already have synced chords, in /demo/record."
		);
	}

	fs.mkdirSync(CLIP_DIR, { recursive: true });
	for (const { songKey } of toCut) {
		const fullSong = path.join(FULL_SONG_DIR, fullSongBySongKey.get(songKey)!);
		const { audioFile } = fileBySongKey.get(songKey)!;
		const range = ranges.get(songKey)!;
		try {
			const offsetSeconds = round3(
				Math.max(0, range.startSeconds - CLIP_PADDING_SECONDS)
			);
			const endSeconds = round3(
				Math.min(durationOf(fullSong), range.endSeconds + CLIP_PADDING_SECONDS)
			);
			encode(fullSong, path.join(CLIP_DIR, audioFile), {
				startSeconds: offsetSeconds,
				durationSeconds: round3(endSeconds - offsetSeconds)
			});
			nextManifest[songKey] = {
				offsetSeconds,
				endSeconds,
				fullSongSha1: sha1Of(fullSong),
				bitrate: BITRATE
			};
			console.log(`cut ${audioFile} (${offsetSeconds}s to ${endSeconds}s)`);
		} catch (error) {
			failed.push(audioFile);
			// keep the old clip's entry, if it still has one
			if (manifest[songKey]) nextManifest[songKey] = manifest[songKey];
			console.error(`failed ${audioFile}: ${(error as Error).message}`);
		}
	}

	for (const name of strayClips) {
		fs.rmSync(path.join(CLIP_DIR, name));
		console.log(`removed ${name}`);
	}

	const sorted = Object.fromEntries(
		Object.entries(nextManifest).sort(([a], [b]) => a.localeCompare(b))
	);
	fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(sorted, null, "\t")}\n`);
	if (failed.length > 0 || missingFullSongs.length > 0) process.exitCode = 1;
};

main();
