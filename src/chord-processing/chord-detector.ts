import { createMidiInput } from "./midi-input/index.js";
import { createChordGater } from "./chord-gater/index.js";
import {
	createChordClassifier,
	formatChordName,
	structuredChordFromClassification
} from "./chord-classifier/index.js";
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
	splitBassAndTrebleOn = "C4",
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
		listInputs: midiInput.listInputs,
		getActiveInput: midiInput.getActiveInput
	};
};
