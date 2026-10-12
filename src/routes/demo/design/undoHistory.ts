export const MAX_UNDO_STEPS = 100;

export const pushUndoEntry = <T>(stack: T[], entry: T): T[] =>
	[...stack, entry].slice(-MAX_UNDO_STEPS);

export const popUndoEntry = <T>(
	stack: T[],
	current: T,
	isSame: (a: T, b: T) => boolean
): { entry: T; remaining: T[] } | null => {
	const index = stack.findLastIndex((entry) => !isSame(entry, current));
	return index === -1
		? null
		: { entry: stack[index], remaining: stack.slice(0, index) };
};
