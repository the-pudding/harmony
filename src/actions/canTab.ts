import type { Action } from "svelte/action";

type CanTabParams = { disable?: boolean } | undefined;

const canTab: Action<HTMLElement, CanTabParams> = (node, params) => {
	const elements = [
		"a",
		"button",
		"input",
		"textarea",
		"select",
		"details",
		"[tabindex]:not([tabindex='-1'])"
	];
	const query = elements.join(", ");
	const focusableElements = [...node.querySelectorAll<HTMLElement>(query)];

	const setup = (p: CanTabParams) => {
		focusableElements.forEach((el) => {
			if (p?.disable) el.setAttribute("tabindex", "-1");
			else el.removeAttribute("tabindex");
		});
	};

	setup(params);

	return {
		update(p) {
			setup(p);
		},
		destroy() {
			focusableElements.forEach((el) => el.removeAttribute("tabindex"));
		}
	};
};

export default canTab;
