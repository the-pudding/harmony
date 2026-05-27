<script lang="ts">
	import { onMount } from "svelte";
	import {
		chordsAreEqual,
		createChordDetector,
		createProgressionSearch
	} from "../chord-processing/index.js";
	import type {
		ChordEvent,
		MidiDeviceInfo,
		ParsedProgressionChord,
		SongSearchResult
	} from "../chord-processing/types.js";
	import generateId from "../utils/generateId.js";
	import Header from "./Header.svelte";
	import NoMidiBanner from "./NoMidiBanner.svelte";
	import CurrentChordCard from "./CurrentChordCard.svelte";
	import SearchSongsCard from "./SearchSongsCard.svelte";
	import EventLogCard from "./EventLogCard.svelte";
	import MidiConfigCard from "./MidiConfigCard.svelte";
	import MidiInputsCard from "./MidiInputsCard.svelte";
	import { SONGS } from "./songs.js";
	import {
		DEFAULT_SETTLE_MS,
		DEFAULT_SPLIT_NOTE,
		ESCAPE_KEY,
		LIVE_STATE_ACTIVE,
		LIVE_STATE_MUTED,
		MIDI_STATE_IDLE,
		MIDI_STATE_LINKED
	} from "./constants.js";
	import type { EventLogEntry, EventLogInput } from "./types.js";

	type ChordDetectorInstance = ReturnType<typeof createChordDetector>;

	let activeChord = $state<ChordEvent | null>(null);
	let bassAsRoot = $state(false);
	let splitNote = $state(DEFAULT_SPLIT_NOTE);
	let settleMs = $state(DEFAULT_SETTLE_MS);
	let isConnected = $state(false);
	let connectError = $state("");
	let midiBanner = $state("");
	let midiInputs = $state<MidiDeviceInfo[]>([]);
	let selectedInputName = $state("");
	let logEntries = $state<EventLogEntry[]>([]);

	const progressionSearch = createProgressionSearch({ songs: SONGS });

	let searchChords = $state<ParsedProgressionChord[]>([]);
	let searchResults = $state<SongSearchResult[]>([]);
	const hasSearch = $derived(searchChords.length > 0);

	const syncSearch = () => {
		searchChords = progressionSearch.getSearchProgression();
		searchResults = progressionSearch.getResults();
	};

	const liveState = $derived(isConnected ? LIVE_STATE_ACTIVE : LIVE_STATE_MUTED);
	const midiSetupState = $derived(isConnected ? MIDI_STATE_LINKED : MIDI_STATE_IDLE);

	let detector: ChordDetectorInstance | null = null;

	const prependLog = (entry: EventLogInput) => {
		logEntries = [{ ...entry, id: generateId() }, ...logEntries];
	};

	const appendChordIfNew = (chord: NonNullable<ChordEvent["chord"]>) => {
		const progression = progressionSearch.getSearchProgression();
		const lastChord = progression[progression.length - 1];
		if (lastChord && chordsAreEqual(chord, lastChord)) return;
		progressionSearch.append(chord);
		syncSearch();
	};

	const clearSearch = () => {
		progressionSearch.clear();
		syncSearch();
	};

	const buildDetector = (): ChordDetectorInstance =>
		createChordDetector({
			splitBassAndTrebleOn: splitNote.trim() || DEFAULT_SPLIT_NOTE,
			settleMs: settleMs || DEFAULT_SETTLE_MS,
			getBassAsRoot: () => bassAsRoot,
			onChordStart: (chord) => {
				activeChord = chord;
				if (chord.chord) appendChordIfNew(chord.chord);
				prependLog({ kind: "start", chordName: chord.chordName, chordEvent: chord });
			},
			onChordEnd: (chord) => {
				activeChord = null;
				prependLog({ kind: "end", chordName: chord.chordName });
			},
			onStateChange: (inputs) => {
				midiInputs = inputs;
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
		detector = buildDetector();

		try {
			await detector.connect(
				selectedInputName ? { inputName: selectedInputName } : undefined
			);
			midiInputs = detector.listInputs();
			const active = midiInputs.find((d) => d.isActive);
			if (active) selectedInputName = active.name;
			isConnected = true;
			prependLog({ kind: "connected" });
		} catch (err) {
			connectError = err instanceof Error ? err.message : String(err);
		}
	};

	const disconnect = () => {
		detector?.disconnect();
		detector = null;
		midiInputs = [];
		activeChord = null;
		isConnected = false;
		prependLog({ kind: "disconnected" });
	};

	const switchInput = async (inputName: string) => {
		if (!detector) return;
		selectedInputName = inputName;
		try {
			await detector.connect({ inputName });
			midiInputs = detector.listInputs();
			prependLog({ kind: "switched", inputName });
		} catch (err) {
			connectError = err instanceof Error ? err.message : String(err);
		}
	};

	const onBassAsRootChange = (checked: boolean) => {
		bassAsRoot = checked;
		detector?.reclassify();
	};

	const onKeydown = (event: KeyboardEvent) => {
		if (event.key === ESCAPE_KEY) clearSearch();
	};

	onMount(() => {
		syncSearch();
		if (window.isSecureContext && typeof navigator.requestMIDIAccess === "function") {
			attemptConnect();
		}
	});
</script>

<svelte:window onkeydown={onKeydown} />

<div class="demo">
	<Header />
	<NoMidiBanner message={midiBanner} />

	<div class="live-output" data-live-state={liveState}>
		<div class="search-group">
			<CurrentChordCard
				chord={activeChord}
				{bassAsRoot}
				onBassAsRootChange={onBassAsRootChange}
			/>
			<SearchSongsCard
				{searchChords}
				results={searchResults}
				{hasSearch}
				onClear={clearSearch}
			/>
		</div>
		<EventLogCard entries={logEntries} onClear={() => (logEntries = [])} />
	</div>

	<hr class="divider" />

	<div class="midi-setup" data-midi-state={midiSetupState}>
		<MidiConfigCard
			{splitNote}
			{settleMs}
			{isConnected}
			{connectError}
			onSplitNoteChange={(v) => (splitNote = v)}
			onSettleMsChange={(v) => (settleMs = v)}
			onConnect={attemptConnect}
			onDisconnect={disconnect}
		/>
		<MidiInputsCard
			inputs={midiInputs}
			{selectedInputName}
			onInputChange={switchInput}
		/>
	</div>
</div>

<style>
	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.demo {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		padding: 2rem;
		max-width: 48rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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

	.search-group {
		border-radius: 0.75rem;
		border: 1px solid rgba(67, 56, 202, 0.4);
		background: rgba(30, 27, 75, 0.1);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: inset 0 0 0 1px rgba(49, 46, 129, 0.25);
	}

	.divider {
		border: none;
		border-top: 1px solid rgba(63, 63, 70, 0.6);
		margin: 0;
	}

	.midi-setup {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		transition: opacity 0.3s ease-out;
	}

	.midi-setup[data-midi-state="idle"] {
		opacity: 1;
	}

	.midi-setup[data-midi-state="linked"] {
		opacity: 0.4;
	}
</style>
