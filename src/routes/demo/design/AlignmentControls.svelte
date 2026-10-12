<script lang="ts">
	import { BEATS_PER_CHORD } from "./beatGrid.js";
	import { SONG_START_SECONDS } from "./songTime.js";

	const START_STEP_SECONDS = 0.01;
	const BPM_STEP = 0.1;
	const MIN_BPM = 1;
	const FIRST_BEAT = 0;

	type Props = {
		startSeconds: number;
		beatsPerMinute: number;
		endSongAtBeat: number | null;
		hidesAfterSongEnd: boolean;
		onStartSecondsChange: (seconds: number) => void;
		onBeatsPerMinuteChange: (beatsPerMinute: number) => void;
		onStartAtPlayhead: () => void;
		onEndSongAtBeatChange: (beat: number | null) => void;
		onToggleHidesAfterSongEnd: () => void;
	};

	let {
		startSeconds,
		beatsPerMinute,
		endSongAtBeat,
		hidesAfterSongEnd,
		onStartSecondsChange,
		onBeatsPerMinuteChange,
		onStartAtPlayhead,
		onEndSongAtBeatChange,
		onToggleHidesAfterSongEnd
	}: Props = $props();
</script>

<div class="alignment">
	<span class="heading">Alignment</span>
	<label>
		song starts at
		<input
			autocomplete="off"
			type="number"
			min={SONG_START_SECONDS}
			step={START_STEP_SECONDS}
			value={startSeconds}
			onchange={(event) =>
				onStartSecondsChange(event.currentTarget.valueAsNumber)}
		/>
		s
	</label>
	<button type="button" onclick={onStartAtPlayhead}>set to playhead</button>
	<label>
		<input
			autocomplete="off"
			type="number"
			min={MIN_BPM}
			step={BPM_STEP}
			value={beatsPerMinute}
			onchange={(event) =>
				onBeatsPerMinuteChange(event.currentTarget.valueAsNumber)}
		/>
		BPM
	</label>
	<label>
		<input
			autocomplete="off"
			type="checkbox"
			class="toggle"
			checked={hidesAfterSongEnd}
			disabled={endSongAtBeat === null}
			onchange={onToggleHidesAfterSongEnd}
		/>
		end song at beat
		<input
			autocomplete="off"
			type="number"
			min={FIRST_BEAT}
			step="1"
			value={endSongAtBeat}
			placeholder="none"
			onchange={(event) =>
				onEndSongAtBeatChange(
					event.currentTarget.value === ""
						? null
						: event.currentTarget.valueAsNumber
				)}
		/>
	</label>
	<span class="note">new chords default to {BEATS_PER_CHORD} beats</span>
</div>

<style>
	.alignment {
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

	label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	input,
	button {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
	}

	input {
		width: 5rem;
	}

	input.toggle {
		width: auto;
		padding: 0;
		accent-color: #818cf8;
	}

	button {
		cursor: pointer;
	}

	.note {
		color: #71717a;
	}
</style>
