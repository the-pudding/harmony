export const PANEL_APPEARANCE_CARD = "card";
export const PANEL_APPEARANCE_FLUSH = "flush";

export type PanelAppearance =
	| typeof PANEL_APPEARANCE_CARD
	| typeof PANEL_APPEARANCE_FLUSH;

type PanelTheme = {
	background: string;
	foreground: string;
	muted: string;
	mutedSoft: string;
	link: string;
	controlBorder: string;
	controlBackground: string;
	controlForeground: string;
	controlActiveBackground: string;
	controlActiveForeground: string;
	controlActiveBorder: string;
	shadow: string;
};

const CARD_THEME: PanelTheme = {
	background: "#ffffff",
	foreground: "#18181b",
	muted: "#52525b",
	mutedSoft: "#71717a",
	link: "#0c96da",
	controlBorder: "#d4d4d8",
	controlBackground: "#ffffff",
	controlForeground: "#3f3f46",
	controlActiveBackground: "#18181b",
	controlActiveForeground: "#ffffff",
	controlActiveBorder: "#18181b",
	shadow: "0 0 6px rgb(0 0 0 / 0.12)"
};

const FLUSH_THEME: PanelTheme = {
	background: "transparent",
	foreground: "#f4f4f5",
	muted: "#a1a1aa",
	mutedSoft: "#a1a1aa",
	link: "#38bdf8",
	controlBorder: "#52525b",
	controlBackground: "transparent",
	controlForeground: "#d4d4d8",
	controlActiveBackground: "#f4f4f5",
	controlActiveForeground: "#18181b",
	controlActiveBorder: "#f4f4f5",
	shadow: "none"
};

export const CHORD_VIZ_PANEL_THEMES: Record<PanelAppearance, PanelTheme> = {
	[PANEL_APPEARANCE_CARD]: CARD_THEME,
	[PANEL_APPEARANCE_FLUSH]: FLUSH_THEME
};

export const chordVizThemeStyle = (appearance: PanelAppearance): string => {
	const theme = CHORD_VIZ_PANEL_THEMES[appearance];
	return [
		`--chord-viz-bg: ${theme.background}`,
		`--chord-viz-fg: ${theme.foreground}`,
		`--chord-viz-muted: ${theme.muted}`,
		`--chord-viz-muted-soft: ${theme.mutedSoft}`,
		`--chord-viz-link: ${theme.link}`,
		`--chord-viz-control-border: ${theme.controlBorder}`,
		`--chord-viz-control-bg: ${theme.controlBackground}`,
		`--chord-viz-control-fg: ${theme.controlForeground}`,
		`--chord-viz-control-active-bg: ${theme.controlActiveBackground}`,
		`--chord-viz-control-active-fg: ${theme.controlActiveForeground}`,
		`--chord-viz-control-active-border: ${theme.controlActiveBorder}`,
		`--chord-viz-shadow: ${theme.shadow}`
	].join("; ");
};
