import type { Action } from "svelte/action";

type FocusTrapParams = { disable?: boolean } | undefined;

const focusTrap: Action<HTMLElement, FocusTrapParams> = (node, params) => {
	const elements = [
		"a",
		"button",
		"input",
		"textarea",
		"select",
		"details",
		"[tabindex]:not([tabindex='-1'])"
	];
	let firstFocusable: HTMLElement | undefined;
	let lastFocusable: HTMLElement | undefined;
	let active = false;

	const moveFocusToTop = (e: KeyboardEvent) => {
		if (e.key === "Tab" && !e.shiftKey) {
			e.preventDefault();
			firstFocusable?.focus();
		}
	};

	const moveFocusToBottom = (e: KeyboardEvent) => {
		if (e.key === "Tab" && e.shiftKey) {
			e.preventDefault();
			lastFocusable?.focus();
		}
	};

	const add = () => {
		firstFocusable?.addEventListener("keydown", moveFocusToBottom);
		lastFocusable?.addEventListener("keydown", moveFocusToTop);
		active = true;
	};

	const remove = () => {
		firstFocusable?.removeEventListener("keydown", moveFocusToBottom);
		lastFocusable?.removeEventListener("keydown", moveFocusToTop);
		active = false;
	};

	const setup = (p: FocusTrapParams) => {
		if (active && p?.disable) remove();
		else if (!active && (!p || !p.disable)) add();
	};

	const query = elements.join(", ");
	const focusableElements = [...node.querySelectorAll<HTMLElement>(query)];
	firstFocusable = focusableElements.shift();
	lastFocusable = focusableElements.pop();

	setup(params);

	return {
		update(p) {
			setup(p);
		},
		destroy() {
			remove();
		}
	};
};

export default focusTrap;
