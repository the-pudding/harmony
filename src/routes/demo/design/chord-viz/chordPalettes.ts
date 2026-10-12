export type ChordColors = { fill: string; text: string };

export type MajorColorQuality = "home" | "nearHome" | "brightFar" | "shadowed" | "tense";
export type MinorColorQuality = "home" | "nearHome" | "dark" | "majorButDark" | "tense";

export type ChordPalette = {
	major: Record<MajorColorQuality, ChordColors>;
	minor: Record<MinorColorQuality, ChordColors>;
};

export const DEFAULT_PALETTE: ChordPalette = {
	major: {
		home: { fill: "#2563a8", text: "#f0f8ff" },
		nearHome: { fill: "#4a90c4", text: "#f0f8ff" },
		brightFar: { fill: "#38bdf8", text: "#0c1a2e" },
		shadowed: { fill: "#6b8fab", text: "#f0f8ff" },
		tense: { fill: "#7c8da6", text: "#f0f8ff" }
	},
	minor: {
		home: { fill: "#5b2a8a", text: "#f5f0ff" },
		nearHome: { fill: "#8b45c0", text: "#f5f0ff" },
		dark: { fill: "#2d1050", text: "#e0d0ff" },
		majorButDark: { fill: "#1e3a78", text: "#ddeeff" },
		tense: { fill: "#6b4f7c", text: "#f5f0ff" }
	}
};
