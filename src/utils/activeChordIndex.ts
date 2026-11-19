// Which chord of a progression's loop is playing at `currentTime`, given a
// song's timed chord changes, or null when the song is off the loop (or
// hasn't reached it yet). Shared by SyncedChords and Signatures.
export const activeChordIndex = (
	chords: readonly { seconds: number; roman: string }[] | undefined | null,
	loop: readonly string[],
	currentTime: number
): number | null => {
	if (!chords || !loop.length) return null;
	let pos = 0;
	let index: number | null = null;
	for (const { seconds, roman } of chords) {
		if (seconds > currentTime) break;
		if (roman === loop[pos]) index = pos;
		else if (roman === loop[0]) index = 0;
		else {
			index = null;
			continue;
		}
		pos = (index + 1) % loop.length;
	}
	return index;
};
