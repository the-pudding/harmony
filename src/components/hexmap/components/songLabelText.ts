export type SongLabelRole = "title" | "year" | "artist";

export type SongLabelSegment = { role: SongLabelRole; text: string };

export type SongLabelLine = SongLabelSegment[];

export const SONG_LABEL_FONT_FAMILY =
	"'JetBrains Mono', ui-monospace, monospace";

export const SONG_LABEL_LINE_HEIGHT_PX = 13;

export const SONG_LABEL_STYLE: Record<
	SongLabelRole,
	{ fontWeight: number; fontSizePx: number; opacity: number }
> = {
	title: { fontWeight: 700, fontSizePx: 11, opacity: 1 },
	year: { fontWeight: 400, fontSizePx: 11, opacity: 0.6 },
	artist: { fontWeight: 500, fontSizePx: 10, opacity: 1 }
};

export const canvasFontFor = (role: SongLabelRole): string => {
	const { fontWeight, fontSizePx } = SONG_LABEL_STYLE[role];
	return `${fontWeight} ${fontSizePx}px ${SONG_LABEL_FONT_FAMILY}`;
};

export const songLabelLines = ({
	title,
	year,
	artists
}: {
	title: string;
	year: number | undefined;
	artists: readonly string[];
}): SongLabelLine[] => {
	const titleLine: SongLabelLine = [{ role: "title", text: title }];
	if (year) titleLine.push({ role: "year", text: ` ${year}` });
	const lines = [titleLine];
	if (artists.length > 0) {
		lines.push([{ role: "artist", text: artists.join(", ") }]);
	}
	return lines;
};
