// Re-saves variable-bitrate (VBR) MP3s as constant-bitrate (CBR).
//
// Browsers can't seek accurately in a VBR MP3: the file only carries a rough
// 100-point index, so jumping to a clip's start (e.g. 66s into a song) can
// land a second or more away while currentTime still reports the asked-for
// time. Synced chords then drift from the audio. CBR files seek exactly.
//
//   npm run audio:cbr            fix every VBR MP3 in the synced-songs folder
//   npm run audio:cbr -- --check list them and exit 1 if any (changes nothing)
//   npm run audio:cbr -- a.mp3   fix just these files
//
// Originals are kept in .audio-backups/<time>/ (gitignored). Needs ffmpeg
// (brew install ffmpeg). After fixing a song that already has synced chords,
// re-check its chord times in /demo/record: they may have been tapped against
// the drifting position.
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const AUDIO_DIR = "static/assets/audio/synced-songs";
const BACKUP_ROOT = ".audio-backups";
const BITRATE = "160k";
// Bytes searched for a VBR tag after any ID3v2 tag (it's in the first frame).
const HEADER_SEARCH_BYTES = 8192;

// Size of a leading ID3v2 tag (cover art can make it large), or 0.
const id3v2Size = (buffer) => {
	if (buffer.toString("latin1", 0, 3) !== "ID3") return 0;
	const size =
		((buffer[6] & 0x7f) << 21) |
		((buffer[7] & 0x7f) << 14) |
		((buffer[8] & 0x7f) << 7) |
		(buffer[9] & 0x7f);
	const hasFooter = (buffer[5] & 0x10) !== 0;
	return 10 + size + (hasFooter ? 10 : 0);
};

// "vbr" (Xing or VBRI tag), "cbr" (LAME's Info tag) or "unknown" (no tag:
// most likely an untagged CBR file, which seeks fine).
export const bitrateModeOf = (file) => {
	const fd = fs.openSync(file, "r");
	try {
		const head = Buffer.alloc(10);
		fs.readSync(fd, head, 0, 10, 0);
		const start = id3v2Size(head);
		const frame = Buffer.alloc(HEADER_SEARCH_BYTES);
		const read = fs.readSync(fd, frame, 0, HEADER_SEARCH_BYTES, start);
		const text = frame.toString("latin1", 0, read);
		if (text.includes("Xing") || text.includes("VBRI")) return "vbr";
		if (text.includes("Info")) return "cbr";
		return "unknown";
	} finally {
		fs.closeSync(fd);
	}
};

const hasFfmpeg = () => {
	try {
		execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
};

const toCbr = (file, backupDir) => {
	const dir = path.dirname(file);
	// a leading dot keeps the temp file out of the synced-songs file list
	const temp = path.join(dir, `.cbr-${process.pid}-${path.basename(file)}`);
	try {
		execFileSync(
			"ffmpeg",
			[
				"-y",
				"-v",
				"error",
				"-i",
				file,
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
		if (bitrateModeOf(temp) === "vbr") {
			throw new Error("ffmpeg's output is still VBR");
		}
		fs.mkdirSync(backupDir, { recursive: true });
		fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
		fs.renameSync(temp, file);
	} finally {
		fs.rmSync(temp, { force: true });
	}
};

const main = () => {
	const args = process.argv.slice(2);
	const checkOnly = args.includes("--check");
	const named = args.filter((arg) => !arg.startsWith("--"));
	const files = (
		named.length > 0
			? named
			: fs
					.readdirSync(AUDIO_DIR)
					.filter((name) => !name.startsWith("."))
					.map((name) => path.join(AUDIO_DIR, name))
	).filter((file) => file.toLowerCase().endsWith(".mp3"));

	const vbr = files.filter((file) => bitrateModeOf(file) === "vbr");
	console.log(
		`${files.length} MP3s checked, ${vbr.length} variable-bitrate${vbr.length ? ":" : "."}`
	);
	for (const file of vbr) console.log(`  ${path.basename(file)}`);
	if (checkOnly || vbr.length === 0) {
		process.exitCode = checkOnly && vbr.length > 0 ? 1 : 0;
		return;
	}

	if (!hasFfmpeg()) {
		console.error("ffmpeg isn't installed: brew install ffmpeg");
		process.exitCode = 1;
		return;
	}

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupDir = path.join(BACKUP_ROOT, stamp);
	const failed = [];
	for (const file of vbr) {
		try {
			toCbr(file, backupDir);
			console.log(`fixed ${path.basename(file)}`);
		} catch (error) {
			failed.push(file);
			console.error(`failed ${path.basename(file)}: ${error.message}`);
		}
	}
	const fixed = vbr.length - failed.length;
	console.log(
		`\n${fixed} re-saved at a constant ${BITRATE}bps; originals in ${backupDir}/.`
	);
	if (fixed > 0) {
		console.log(
			"Re-check the chord times of any of these that already have synced chords, in /demo/record."
		);
	}
	if (failed.length > 0) process.exitCode = 1;
};

main();
