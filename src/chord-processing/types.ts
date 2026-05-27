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

export type SongInput = {
	title: string;
	artist: string;
	progression: ProgressionChordInput[];
};

export type ParsedProgressionChord = StructuredChord & { display: string };

export type PreparedSong = SongInput & {
	parsedProgression: ParsedProgressionChord[];
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
