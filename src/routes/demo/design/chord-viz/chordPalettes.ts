export type ChordColors = { fill: string; text: string };

export type MajorColorQuality = "home" | "nearHome" | "brightFar";
export type MinorColorQuality =
	| "home"
	| "nearHome"
	| "dark"
	| "majorButDark"
	| "tense";

export type ChordPalette = {
	major: Record<MajorColorQuality, ChordColors>;
	minor: Record<MinorColorQuality, ChordColors>;
};

export type PaletteColorRef =
	| { family: "major"; quality: MajorColorQuality }
	| { family: "minor"; quality: MinorColorQuality };

export type NamedChordPalette = {
	id: string;
	label: string;
	palette: ChordPalette;
};

export const majorColor = (quality: MajorColorQuality): PaletteColorRef => ({
	family: "major",
	quality
});

export const minorColor = (quality: MinorColorQuality): PaletteColorRef => ({
	family: "minor",
	quality
});

export const colorOf = (
	palette: ChordPalette,
	ref: PaletteColorRef
): ChordColors =>
	ref.family === "major"
		? palette.major[ref.quality]
		: palette.minor[ref.quality];

export const paletteSwatches = (palette: ChordPalette): string[] =>
	[...Object.values(palette.major), ...Object.values(palette.minor)].map(
		(colors) => colors.fill
	);

export const DEFAULT_PALETTE: ChordPalette = {
	major: {
		home: { fill: "#2563a8", text: "#f0f8ff" },
		nearHome: { fill: "#4a90c4", text: "#f0f8ff" },
		brightFar: { fill: "#38bdf8", text: "#0c1a2e" }
	},
	minor: {
		home: { fill: "#5b2a8a", text: "#f5f0ff" },
		nearHome: { fill: "#8b45c0", text: "#f5f0ff" },
		dark: { fill: "#2d1050", text: "#e0d0ff" },
		majorButDark: { fill: "#1e3a78", text: "#ddeeff" },
		tense: { fill: "#6b4f7c", text: "#f5f0ff" }
	}
};

export const CHORD_PALETTES: NamedChordPalette[] = [
	{ id: "default", label: "Default", palette: DEFAULT_PALETTE }
];

export const DEFAULT_PALETTE_ID = CHORD_PALETTES[0].id;

export const paletteById = (id: string): ChordPalette =>
	(CHORD_PALETTES.find((entry) => entry.id === id) ?? CHORD_PALETTES[0])
		.palette;
