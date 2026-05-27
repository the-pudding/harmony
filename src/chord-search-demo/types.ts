import type { ChordEvent } from "../chord-processing/types.js";

export type EventLogInput =
	| { kind: "start"; chordName: string; chordEvent: ChordEvent }
	| { kind: "end"; chordName: string }
	| { kind: "connected" }
	| { kind: "disconnected" }
	| { kind: "switched"; inputName: string };

export type EventLogEntry = EventLogInput & { id: string };
