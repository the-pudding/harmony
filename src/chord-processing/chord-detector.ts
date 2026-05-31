import { createMidiInput } from "./midi-input/index.js";
import {
	createChordGater,
	DEFAULT_SPLIT_BASS_NOTE
} from "./chord-gater/index.js";
import {
	createChordClassifier,
	structuredChordFromClassification
} from "./chord-classifier/index.js";
import { formatChordName } from "./formatChordDisplay.js";
import { midiToNote, type MidiCoercible } from "./chord-classifier/notes.js";
import type { ChordEvent, ChordTemplate, MidiDeviceInfo } from "./types.js";

type ChordClassifierInstance = ReturnType<typeof createChordClassifier>;

const buildChordEvent = (
	bassMidi: number,
	trebleMidis: number[],
	classifier: ChordClassifierInstance,
	bassAsRoot: boolean
): ChordEvent => {
	const classification = classifier.classify({ bassMidi, trebleMidis, bassAsRoot });
	return {
		bassNote: midiToNote(bassMidi),
		trebleNotes: trebleMidis.map(midiToNote),
		chordName: formatChordName(classification),
		chord: structuredChordFromClassification(classification),
		_bassMidi: bassMidi,
		_trebleMidis: trebleMidis
	};
};

type ChordDetectorOptions = {
	splitBassAndTrebleOn?: MidiCoercible;
	settleMs?: number;
	onChordStart?: (event: ChordEvent) => void;
	onChordEnd?: (event: ChordEvent) => void;
	onStateChange?: (inputs: MidiDeviceInfo[]) => void;
	onNoteOn?: (midi: number) => void;
	onNoteOff?: (midi: number) => void;
	chordClassifierOptions?: { templates?: ChordTemplate[] };
	getBassAsRoot?: () => boolean;
};

export const createChordDetector = ({
	splitBassAndTrebleOn = DEFAULT_SPLIT_BASS_NOTE,
	settleMs,
	onChordStart,
	onChordEnd,
	onStateChange,
	onNoteOn,
	onNoteOff,
	chordClassifierOptions,
	getBassAsRoot
}: ChordDetectorOptions = {}) => {
	const classifier = createChordClassifier(chordClassifierOptions);

	let activeChordEvent: ChordEvent | null = null;
	let noteInterceptor: ((midi: number) => void) | null = null;

	const chordGater = createChordGater({
		splitBassAndTrebleOn,
		settleMs,
		onStableChordCandidate: ({ bassMidi, trebleMidis }) => {
			activeChordEvent = buildChordEvent(
				bassMidi,
				trebleMidis,
				classifier,
				getBassAsRoot?.() ?? false
			);
			onChordStart?.(activeChordEvent);
		},
		onStableChordRelease: () => {
			if (!activeChordEvent) return;
			const ended = activeChordEvent;
			activeChordEvent = null;
			onChordEnd?.(ended);
		}
	});

	const midiInput = createMidiInput({
		onNoteOn: ({ midi }) => {
			if (noteInterceptor) {
				const intercept = noteInterceptor;
				noteInterceptor = null;
				intercept(midi);
				onNoteOn?.(midi);
				return;
			}
			chordGater.handleNoteOn(midi);
			onNoteOn?.(midi);
		},
		onNoteOff: ({ midi }) => {
			chordGater.handleNoteOff(midi);
			onNoteOff?.(midi);
		},
		onStateChange
	});

	const reclassify = () => {
		if (!activeChordEvent) return;
		const { _bassMidi, _trebleMidis } = activeChordEvent;
		activeChordEvent = buildChordEvent(
			_bassMidi,
			_trebleMidis,
			classifier,
			getBassAsRoot?.() ?? false
		);
		onChordStart?.(activeChordEvent);
	};

	const setSplitBassAndTrebleOn = (next: MidiCoercible) =>
		chordGater.setSplitBassAndTrebleOn(next);

	const interceptNextNote = (handler: (midi: number) => void) => {
		noteInterceptor = handler;
	};

	const cancelNoteInterceptor = () => {
		noteInterceptor = null;
	};

	const connect = (options?: { inputName?: string }) =>
		midiInput.connect(options);
	const disconnect = () => {
		midiInput.disconnect();
		chordGater.dispose();
		activeChordEvent = null;
	};

	return {
		connect,
		disconnect,
		reclassify,
		setSplitBassAndTrebleOn,
		interceptNextNote,
		cancelNoteInterceptor,
		listInputs: midiInput.listInputs,
		getActiveInput: midiInput.getActiveInput
	};
};
