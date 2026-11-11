<script lang="ts">
	import type { SyncedSongRegion } from "$data/syncedSongs.js";
	import { onMount, untrack } from "svelte";
	import MidiConnectStatus from "../../../chord-search-demo/MidiConnectStatus.svelte";
	import {
		diatonicChordOnBass,
		romanTokenForChord,
		scaleDegreePitchClasses,
		type BassChordQualities,
		type BassChordQuality,
		type MusicalKey
	} from "../../../chord-processing/chordInKey.js";
	import { diatonicQualityForDegree } from "../../../chord-processing/diatonicQuality.js";
	import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
	import { createMidiNoteInput } from "../shared/midiNoteInput.svelte.js";
	import { createChordRecorder } from "./chordRecorder.svelte.js";
	import type { RecordedChord } from "./syncedTimings.js";

	type Props = {
		musicalKey: MusicalKey;
		region: SyncedSongRegion;
		paused: boolean;
		playheadSeconds: number;
		readPlaybackSeconds: () => number;
		onPassStart: (fromSeconds: number) => void;
		onChordChange: (change: RecordedChord, seconds: number) => void;
		onFollow: (seconds: number) => void;
		onPassEnd: (seconds: number) => void;
	};

	let {
		musicalKey,
		region,
		paused,
		playheadSeconds,
		readPlaybackSeconds,
		onPassStart,
		onChordChange,
		onFollow,
		onPassEnd
	}: Props = $props();

	// Qualities picked for chords on a lone bass note, by scale degree (a
	// major V in a minor key, say), so you can keep playing just bass notes.
	let bassQualities = $state.raw<BassChordQualities>({});

	const QUALITY_CYCLE: BassChordQuality[] = ["maj", "min", "dim"];

	const defaultQualityOf = (degree: number): BassChordQuality => {
		const quality = diatonicQualityForDegree(musicalKey.scale, degree);
		return QUALITY_CYCLE.includes(quality as BassChordQuality)
			? (quality as BassChordQuality)
			: "maj";
	};

	const bassDegrees = $derived(
		scaleDegreePitchClasses(musicalKey).map((pitchClass, i) => {
			const degree = i + 1;
			const chord = diatonicChordOnBass(pitchClass, musicalKey, bassQualities);
			return {
				degree,
				changed: bassQualities[degree] !== undefined,
				roman: romanTokenForChord(chord, musicalKey),
				name: formatChordName(chord)
			};
		})
	);

	// major → minor → diminished → major; landing back on the key's own
	// quality clears the pick.
	const cycleBassQuality = (degree: number) => {
		const current = bassQualities[degree] ?? defaultQualityOf(degree);
		const next =
			QUALITY_CYCLE[
				(QUALITY_CYCLE.indexOf(current) + 1) % QUALITY_CYCLE.length
			];
		const { [degree]: _, ...rest } = bassQualities;
		bassQualities =
			next === defaultQualityOf(degree) ? rest : { ...rest, [degree]: next };
	};

	const recorder = createChordRecorder({
		getKey: () => musicalKey,
		getBassQualities: () => bassQualities,
		getRegion: () => region,
		isPlaying: () => !paused,
		readPlaybackSeconds: () => readPlaybackSeconds(),
		onPassStart: (fromSeconds) => onPassStart(fromSeconds),
		onChordChange: (change, seconds) => onChordChange(change, seconds),
		onFollow: (seconds) => onFollow(seconds),
		onPassEnd: (seconds) => onPassEnd(seconds)
	});

	const midi = createMidiNoteInput(recorder.noteOn);

	$effect(() => {
		const seconds = playheadSeconds;
		untrack(() => recorder.follow(seconds));
	});

	const lastChordLabel = $derived(
		recorder.lastChord &&
			`${formatChordName(recorder.lastChord)} · ${romanTokenForChord(recorder.lastChord, musicalKey)}`
	);

	const status = $derived.by(() => {
		if (recorder.ignoredOutsideRegion)
			return "ignored a chord outside the region";
		if (!recorder.recording)
			return "play a chord, or just its bass note, to check it";
		if (paused) return "paused — press play to keep recording";
		return "recording — play each chord change";
	});

	onMount(() => void midi.connect());
</script>

<div class="recorder">
	<span class="heading">Record chords</span>
	<MidiConnectStatus
		isConnected={midi.isConnected}
		selectedInputName={midi.inputName}
		connectError={midi.connectError}
		onConnect={midi.connect}
	/>
	<button
		type="button"
		class="record"
		aria-pressed={recorder.recording}
		disabled={!midi.isConnected}
		onclick={recorder.toggle}
	>
		{recorder.recording ? "stop recording" : "record"}
	</button>
	{#if lastChordLabel}
		<span class="last-chord" title="Last chord played">{lastChordLabel}</span>
	{/if}
	<span class="status" aria-live="polite">{status}</span>
	<div class="bass-chords">
		<span
			class="heading"
			title="The chord a lone bass note on each degree records as. Click one to switch it between major, minor and diminished."
			>Bass notes play</span
		>
		{#each bassDegrees as { degree, changed, roman, name } (degree)}
			<button
				type="button"
				class="bass-chord"
				class:changed
				title={`${name}: click to switch major / minor / diminished`}
				onclick={() => cycleBassQuality(degree)}>{roman}</button
			>
		{/each}
		{#if Object.keys(bassQualities).length > 0}
			<button type="button" class="reset" onclick={() => (bassQualities = {})}
				>reset to key</button
			>
		{/if}
	</div>
</div>

<style>
	.recorder {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.6875rem;
		color: #a1a1aa;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.record {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
		cursor: pointer;
	}

	.record:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.record[aria-pressed="true"] {
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.15);
		color: #fca5a5;
	}

	.last-chord {
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
		background: rgba(129, 140, 248, 0.15);
		color: #c7d2fe;
		font-weight: 600;
	}

	.status {
		color: #d4d4d8;
	}

	.bass-chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		flex-basis: 100%;
	}

	.bass-chords .heading {
		margin-right: 0.25rem;
	}

	.bass-chord,
	.reset {
		min-width: 2rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #d4d4d8;
		font: inherit;
		cursor: pointer;
	}

	.bass-chord.changed {
		border-color: #fbbf24;
		background: rgba(251, 191, 36, 0.15);
		color: #fde68a;
		font-weight: 600;
	}

	.reset {
		border-color: transparent;
		background: none;
		color: #a1a1aa;
		text-decoration: underline;
	}
</style>
