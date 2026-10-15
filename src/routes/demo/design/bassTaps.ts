export const MIN_SECONDS_BETWEEN_TAPS = 0.2;

export type BassTap = {
	chordIndex: number;
	seconds: number;
};

export const nearestChordIndex = (
	chordStartSeconds: number[],
	seconds: number
): number =>
	chordStartSeconds.reduce(
		(nearest, startSeconds, index) =>
			Math.abs(startSeconds - seconds) <
			Math.abs(chordStartSeconds[nearest] - seconds)
				? index
				: nearest,
		0
	);

export const bassTapStatus = (
	recording: boolean,
	lastTap: BassTap | null,
	chordNames: string[]
): string => {
	if (!recording) return "each bass note you play sets the next chord's start";
	if (!lastTap) return "play the bass note of the next chord change…";
	const tappedChord = `${chordNames[lastTap.chordIndex]} (${lastTap.chordIndex + 1}/${chordNames.length})`;
	const nextChordName = chordNames[lastTap.chordIndex + 1];
	return nextChordName
		? `set ${tappedChord} · next ${nextChordName}`
		: `set ${tappedChord} · last chord`;
};

const continuesFrom = (
	previous: BassTap | null,
	seconds: number
): previous is BassTap => previous !== null && seconds >= previous.seconds;

export const nextBassTap = (
	previous: BassTap | null,
	seconds: number,
	chordStartSeconds: number[]
): BassTap | null => {
	if (chordStartSeconds.length === 0) return null;
	if (!continuesFrom(previous, seconds))
		return {
			chordIndex: nearestChordIndex(chordStartSeconds, seconds),
			seconds
		};
	if (seconds - previous.seconds < MIN_SECONDS_BETWEEN_TAPS) return null;
	const chordIndex = previous.chordIndex + 1;
	return chordIndex < chordStartSeconds.length ? { chordIndex, seconds } : null;
};
