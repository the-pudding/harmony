export const RECORD_TAB_AUDIO = "record-audio";
export const RECORD_TAB_VIDEO = "record-video";
export const RECORD_TAB_FEATURED = "featured";
export const RECORD_TAB_IDEAS = "ideas";

export const RECORD_TABS = [
	RECORD_TAB_AUDIO,
	RECORD_TAB_VIDEO,
	RECORD_TAB_FEATURED,
	RECORD_TAB_IDEAS
] as const;

export type RecordTab = (typeof RECORD_TABS)[number];

export const DEFAULT_RECORD_TAB: RecordTab = RECORD_TAB_AUDIO;

export const RECORD_TAB_LABELS: Record<RecordTab, string> = {
	[RECORD_TAB_AUDIO]: "Record audio",
	[RECORD_TAB_VIDEO]: "Record video",
	[RECORD_TAB_FEATURED]: "Featured songs",
	[RECORD_TAB_IDEAS]: "Ideas by cluster"
};

export const isRecordTab = (value: string): value is RecordTab =>
	(RECORD_TABS as readonly string[]).includes(value);
