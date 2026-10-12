export const SEEK_STEP_SECONDS = 3;

export type PlayerAction =
	| { type: "togglePlayback" }
	| { type: "restart" }
	| { type: "seekBy"; seconds: number };

type PlayerShortcut = {
	key: string;
	label: string;
	description: string;
	action: PlayerAction;
};

export const PLAYER_SHORTCUTS: PlayerShortcut[] = [
	{
		key: " ",
		label: "space",
		description: "play / pause",
		action: { type: "togglePlayback" }
	},
	{
		key: "z",
		label: "z",
		description: "play from start",
		action: { type: "restart" }
	},
	{
		key: "arrowleft",
		label: "←",
		description: `back ${SEEK_STEP_SECONDS}s`,
		action: { type: "seekBy", seconds: -SEEK_STEP_SECONDS }
	},
	{
		key: "arrowright",
		label: "→",
		description: `forward ${SEEK_STEP_SECONDS}s`,
		action: { type: "seekBy", seconds: SEEK_STEP_SECONDS }
	}
];

type ShortcutKeyEvent = Pick<
	KeyboardEvent,
	"key" | "metaKey" | "ctrlKey" | "altKey" | "defaultPrevented"
>;

export const playerActionFor = (
	event: ShortcutKeyEvent
): PlayerAction | undefined => {
	if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
		return undefined;
	return PLAYER_SHORTCUTS.find(
		(shortcut) => shortcut.key === event.key.toLowerCase()
	)?.action;
};

const TYPING_TARGET_SELECTOR = "input, textarea, select";

export const isTypingTarget = (target: EventTarget | null): boolean =>
	target instanceof HTMLElement &&
	(target.isContentEditable || target.matches(TYPING_TARGET_SELECTOR));
