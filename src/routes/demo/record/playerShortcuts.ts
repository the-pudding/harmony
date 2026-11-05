export const SEEK_STEP_SECONDS = 3;

export type PlayerAction =
	| { type: "togglePlayback" }
	| { type: "restart" }
	| { type: "undo" }
	| { type: "seekBy"; seconds: number };

type PlayerShortcut = {
	key: string;
	withCommand: boolean;
	label: string;
	description: string;
	action: PlayerAction;
};

export const PLAYER_SHORTCUTS: PlayerShortcut[] = [
	{
		key: " ",
		withCommand: false,
		label: "space",
		description: "play / pause",
		action: { type: "togglePlayback" }
	},
	{
		key: "z",
		withCommand: false,
		label: "z",
		description: "play from start",
		action: { type: "restart" }
	},
	{
		key: "arrowleft",
		withCommand: false,
		label: "←",
		description: `back ${SEEK_STEP_SECONDS}s`,
		action: { type: "seekBy", seconds: -SEEK_STEP_SECONDS }
	},
	{
		key: "arrowright",
		withCommand: false,
		label: "→",
		description: `forward ${SEEK_STEP_SECONDS}s`,
		action: { type: "seekBy", seconds: SEEK_STEP_SECONDS }
	},
	{
		key: "z",
		withCommand: true,
		label: "⌘z",
		description: "undo chord edit",
		action: { type: "undo" }
	}
];

type ShortcutKeyEvent = Pick<
	KeyboardEvent,
	"key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey" | "defaultPrevented"
>;

const hasCommandModifier = (event: ShortcutKeyEvent): boolean =>
	event.metaKey || event.ctrlKey;

export const playerActionFor = (
	event: ShortcutKeyEvent
): PlayerAction | undefined => {
	if (event.defaultPrevented || event.altKey) return undefined;
	if (hasCommandModifier(event) && event.shiftKey) return undefined;
	return PLAYER_SHORTCUTS.find(
		(shortcut) =>
			shortcut.key === event.key.toLowerCase() &&
			shortcut.withCommand === hasCommandModifier(event)
	)?.action;
};

const TYPING_TARGET_SELECTOR = "input, textarea, select";

export const isTypingTarget = (target: EventTarget | null): boolean =>
	target instanceof HTMLElement &&
	(target.isContentEditable || target.matches(TYPING_TARGET_SELECTOR));
