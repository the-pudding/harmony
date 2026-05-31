<script lang="ts">
	import { onMount } from "svelte";
	import { chordsAreEqual, createChordDetector } from "../chord-processing/index.js";
	import type { ChordEvent } from "../chord-processing/types.js";
	import { midiToNote } from "../chord-processing/chord-classifier/notes.js";
	import Piano from "$components/piano/Piano.svelte";
	import NoMidiBanner from "./NoMidiBanner.svelte";
	import ChordProgressionCriteria from "./ChordProgressionCriteria.svelte";
	import ChordProgressionSearchResults from "./ChordProgressionSearchResults.svelte";
	import MostCommonSequencesChart from "./MostCommonSequencesChart.svelte";
	import TopNavBar from "./top-nav-bar/TopNavBar.svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		CHORD_SEARCH_DEMO_HORIZONTAL_MARGIN_PX,
		CLEAR_SENTINEL_LABEL,
		CLEAR_SENTINEL_MIDIS,
		DEFAULT_SETTLE_MS,
		DEFAULT_SPLIT_NOTE,
		ESCAPE_KEY,
		LIVE_STATE_ACTIVE,
		LIVE_STATE_MUTED,
		PAUSE_SENTINEL_LABEL,
		PAUSE_SENTINEL_MIDIS,
		SPLIT_NOTE_EDIT_TOOLTIP,
		SONGS_DATA_URL,
		SONGS_LOAD_ERROR_PREFIX,
		SONGS_LOADING_MESSAGE
	} from "./constants.js";
	type ChordDetectorInstance = ReturnType<typeof createChordDetector>;

	let splitNote = $state(DEFAULT_SPLIT_NOTE);
	let splitNoteEditing = $state(false);
	let isConnected = $state(false);
	let connectError = $state("");
	let midiBanner = $state("");
	let selectedInputName = $state("");
	let songsLoading = $state(true);
	let songsError = $state("");

	const liveState = $derived(isConnected ? LIVE_STATE_ACTIVE : LIVE_STATE_MUTED);

	let heldMidiNotes = $state(new Set<number>());
	const heldNotes = $derived([...heldMidiNotes].map(midiToNote));

	let detector: ChordDetectorInstance | null = null;

	const appendChordIfNew = (chord: NonNullable<ChordEvent["chord"]>) => {
		const progressionSearch = chordSearchDemoStore.getProgressionSearch();
		const progression = progressionSearch.getSearchProgression();
		const lastChord = progression[progression.length - 1];
		if (lastChord && chordsAreEqual(chord, lastChord)) return;
		progressionSearch.append(chord);
		chordSearchDemoStore.syncSearch();
	};

	const matchesSentinel = (held: Set<number>, sentinel: Set<number>) =>
		held.size === sentinel.size && [...sentinel].every((midi) => held.has(midi));

	const pianoSentinels = [
		{ midis: CLEAR_SENTINEL_MIDIS, label: CLEAR_SENTINEL_LABEL },
		{ midis: PAUSE_SENTINEL_MIDIS, label: PAUSE_SENTINEL_LABEL }
	];

	const formatSplitNote = (midi: number) => {
		const { noteName, octave } = midiToNote(midi);
		return `${noteName}${octave}`;
	};

	const cancelSplitNoteEdit = () => {
		splitNoteEditing = false;
		detector?.cancelNoteInterceptor();
	};

	const applySplitNote = (midi: number) => {
		splitNote = formatSplitNote(midi);
		detector?.setSplitBassAndTrebleOn(splitNote);
		cancelSplitNoteEdit();
	};

	const toggleSplitNoteEdit = () => {
		if (splitNoteEditing) {
			cancelSplitNoteEdit();
			return;
		}

		splitNoteEditing = true;
		detector?.interceptNextNote(applySplitNote);
	};

	const buildDetector = (): ChordDetectorInstance =>
		createChordDetector({
			splitBassAndTrebleOn: splitNote.trim() || DEFAULT_SPLIT_NOTE,
			settleMs: DEFAULT_SETTLE_MS,
			getBassAsRoot: () => chordSearchDemoStore.bassAsRoot,
			onNoteOn: (midi) => {
				const nextHeld = new Set([...heldMidiNotes, midi]);
				heldMidiNotes = nextHeld;
				if (matchesSentinel(nextHeld, CLEAR_SENTINEL_MIDIS)) chordSearchDemoStore.clearSearch();
				else if (matchesSentinel(nextHeld, PAUSE_SENTINEL_MIDIS))
					chordSearchDemoStore.setSearchInputActive(!chordSearchDemoStore.searchInputActive);
			},
			onNoteOff: (midi) => {
				heldMidiNotes = new Set([...heldMidiNotes].filter((m) => m !== midi));
			},
			onChordStart: (chord) => {
				if (!chordSearchDemoStore.searchInputActive) return;
				if (chord.chord) appendChordIfNew(chord.chord);
			},
			onStateChange: (inputs) => {
				const active = inputs.find((d) => d.isActive);
				if (active) selectedInputName = active.name;
			}
		});

	const attemptConnect = async () => {
		connectError = "";

		if (!window.isSecureContext) {
			midiBanner =
				"Web MIDI requires a secure context. Open this page via http://localhost (not file:// or a remote http:// URL).";
			return;
		}

		if (typeof navigator.requestMIDIAccess !== "function") {
			midiBanner = "Web MIDI API is not supported in this browser. Try Chrome or Edge.";
			return;
		}

		detector?.disconnect();
		cancelSplitNoteEdit();
		detector = buildDetector();

		try {
			await detector.connect(
				selectedInputName ? { inputName: selectedInputName } : undefined
			);
			const active = detector.listInputs().find((d) => d.isActive);
			if (active) selectedInputName = active.name;
			isConnected = true;
		} catch (err) {
			connectError = err instanceof Error ? err.message : String(err);
		}
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key !== ESCAPE_KEY) return;
		if (splitNoteEditing) {
			cancelSplitNoteEdit();
			return;
		}
		chordSearchDemoStore.clearSearch();
	};

	$effect(() => {
		chordSearchDemoStore.bassAsRoot;
		detector?.reclassify();
	});

	onMount(() => {
		const loadSongs = async () => {
			try {
				const response = await fetch(SONGS_DATA_URL);
				if (!response.ok) {
					throw new Error(`${SONGS_LOAD_ERROR_PREFIX} HTTP ${response.status}`);
				}
				await chordSearchDemoStore.setSongs(await response.json());
			} catch (err) {
				songsError = err instanceof Error ? err.message : String(err);
			} finally {
				songsLoading = false;
			}
		};

		void loadSongs();

		if (window.isSecureContext && typeof navigator.requestMIDIAccess === "function") {
			void attemptConnect();
		}

		return () => {
			chordSearchDemoStore.disposeSequenceChartWorkers();
			detector?.disconnect();
		};
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="page">
	<TopNavBar />
	<div class="midi-status">
		{#if isConnected}
			<span class="connected" title={selectedInputName}>connected</span>
		{:else}
			<button type="button" class="connect" onclick={attemptConnect}>connect</button>
		{/if}
		{#if connectError}
			<span class="connect-error">{connectError}</span>
		{/if}
	</div>

	<div class="piano-strip">
		<Piano
			activeNotes={heldNotes}
			{splitNote}
			{splitNoteEditing}
			splitNoteEditTooltip={SPLIT_NOTE_EDIT_TOOLTIP}
			sentinels={pianoSentinels}
			onSplitEditToggle={toggleSplitNoteEdit}
			onSplitNotePick={applySplitNote}
		/>
	</div>

	<div
		class="demo"
		style="--demo-horizontal-margin: {CHORD_SEARCH_DEMO_HORIZONTAL_MARGIN_PX}px;"
	>
		{#if songsLoading}
			<p class="dataset-status">{SONGS_LOADING_MESSAGE}</p>
		{:else if songsError}
			<p class="dataset-status error">{songsError}</p>
		{/if}
		<NoMidiBanner message={midiBanner} />

		<div class="live-output" data-live-state={liveState}>
			<div class="demo-columns">
				<div class="column">
					<h1 class="column-title">Define... 'chord progression'</h1>
					<ChordProgressionCriteria />
					<MostCommonSequencesChart />
				</div>
				<div class="column">
					<h1 class="column-title">Song results</h1>
					<ChordProgressionSearchResults />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		padding-top: 3.25rem;
	}

	.midi-status {
		position: fixed;
		top: 3.75rem;
		right: 1.5rem;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
	}

	.connected {
		font-size: 0.75rem;
		font-weight: 500;
		color: #4ade80;
		text-transform: lowercase;
		cursor: default;
	}

	.connect {
		font-size: 0.75rem;
		font-weight: 500;
		color: #a1a1aa;
		background: transparent;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		font-family: inherit;
		text-transform: lowercase;
	}

	.connect:hover {
		color: #e4e4e7;
		border-color: #52525b;
	}

	.connect-error {
		font-size: 0.625rem;
		color: #f87171;
		max-width: 12rem;
		text-align: right;
	}

	.piano-strip {
		width: 100%;
		padding: 1rem 0 0.5rem;
		background: #09090b;
	}

	.demo {
		color: #f4f4f5;
		padding: 1.5rem var(--demo-horizontal-margin) 2rem;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.dataset-status {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}

	.dataset-status.error {
		color: #fca5a5;
	}

	.live-output {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		transition: opacity 0.3s ease-out;
	}

	.live-output[data-live-state="muted"] {
		opacity: 0.4;
	}

	.live-output[data-live-state="active"] {
		opacity: 1;
	}

	.demo-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.column-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

</style>
