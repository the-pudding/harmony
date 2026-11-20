export type SongLabelRole = "title" | "detail";

export type SongLabelSegment = { role: SongLabelRole; text: string };

export type SongLabelLine = SongLabelSegment[];

// The story's sans (--font-sans).
export const SONG_LABEL_FONT_FAMILY =
	"'Atlas Grotesk', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";

export const SONG_LABEL_LINE_HEIGHT_PX = 14;

export const SONG_LABEL_STYLE: Record<
	SongLabelRole,
	{ fontWeight: number; fontSizePx: number; opacity: number }
> = {
	title: { fontWeight: 600, fontSizePx: 12, opacity: 1 },
	detail: { fontWeight: 400, fontSizePx: 10, opacity: 0.6 }
};

export const canvasFontFor = (role: SongLabelRole, scale = 1): string => {
	const { fontWeight, fontSizePx } = SONG_LABEL_STYLE[role];
	return `${fontWeight} ${fontSizePx * scale}px ${SONG_LABEL_FONT_FAMILY}`;
};

// The title, then "Artist, Artist (year)" beneath it.
export const songLabelLines = ({
	title,
	year,
	artists
}: {
	title: string;
	year: number | undefined;
	artists: readonly string[];
}): SongLabelLine[] => {
	const detail = [artists.join(", "), year ? `(${year})` : ""]
		.filter(Boolean)
		.join(" ");
	const lines: SongLabelLine[] = [[{ role: "title", text: title }]];
	if (detail) lines.push([{ role: "detail", text: detail }]);
	return lines;
};
