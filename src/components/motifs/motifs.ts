import { MediaQuery } from "svelte/reactivity";

export const MOTIF_NAMES = ["progression", "progression-names", "loop", "timeline"] as const;
export type MotifName = (typeof MOTIF_NAMES)[number];

export const isMotifName = (name: string): name is MotifName =>
	(MOTIF_NAMES as readonly string[]).includes(name);

// In the Google Doc, a motif is written <span class=motif>loop</span>.
// "progression-names" is the progression w/ letter names (C G Am F) instead
// of roman numerals, for before numerals are introduced.
export const MOTIF_SPAN_RE =
	/<span class=["']?motif["']?>\s*([\w-]+)\s*<\/span>/g;

export const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
