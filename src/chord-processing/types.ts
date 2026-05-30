export type NoteName =
	| "C"
	| "C#"
	| "D"
	| "Eb"
	| "E"
	| "F"
	| "F#"
	| "G"
	| "Ab"
	| "A"
	| "Bb"
	| "B";

export type Note = {
	noteName: NoteName;
	octave: number;
};

export type StructuredChord = {
	rootPitchClass: number;
	suffix: string;
	bassPitchClass?: number;
};

export type ChordClassification = {
	rootPitchClass: number;
	suffix: string;
	bassPitchClass?: number;
};

export type ChordTemplate = {
	suffix: string;
	intervals: number[];
	priority?: number;
};

export type StableChordCandidate = {
	bassMidi: number;
	trebleMidis: number[];
};

export type ChordEvent = {
	bassNote: Note;
	trebleNotes: Note[];
	chordName: string;
	chord: StructuredChord | null;
	_bassMidi: number;
	_trebleMidis: number[];
};

export type MidiDeviceInfo = {
	id: string;
	name: string;
	manufacturer: string;
	state: MIDIPortDeviceState;
	connection: MIDIPortConnectionState;
	type: MIDIPortType;
	version: string;
	isActive: boolean;
};

export type NoteOnPayload = { midi: number; velocity: number };
export type NoteOffPayload = { midi: number; velocity: number };

export type ProgressionChordInput = {
	noteName: string;
	suffix: string;
	bassNoteName?: string;
};

export type PrecomputedAbstractProgression = {
	suffixes: string[];
	deltas: number[];
	bassIntervals: (number | null)[];
	wrapDelta: number;
};

export type SongInput = {
	id?: string;
	title: string;
	artist: string;
	year?: number;
	inTop10?: boolean;
	inTop40?: boolean;
	inTop100?: boolean;
	progression: ProgressionChordInput[];
	suffixes?: string[];
	deltas?: number[];
	bassIntervals?: (number | null)[];
	wrapDelta?: number;
};

export type ParsedProgressionChord = StructuredChord & { display: string };

export type PreparedSong = SongInput & {
	parsedProgression: ParsedProgressionChord[];
	abstractProgression: PrecomputedAbstractProgression;
};

export type SubProgressionMatch = { start: number; length: number };

export type SongSearchResult = {
	song: PreparedSong;
	matches: SubProgressionMatch[];
};

export type AbstractProgression = {
	suffixes: string[];
	deltas: number[];
	bassIntervals: (number | null)[];
};
