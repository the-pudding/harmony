import debounce from "lodash.debounce";
import type { Action } from "svelte/action";

type ResizeParams = {
	debounce?: number;
	exclude?: "width" | "height";
};

const resize: Action<HTMLElement, ResizeParams> = (node, params = {}) => {
	let observer: ResizeObserver | undefined;
	let w: number | undefined;
	let h: number | undefined;

	const handleResize = (entries: ResizeObserverEntry[]) => {
		const firstTime = w === undefined;

		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			const widthTrigger = params.exclude !== "width" && width !== w;
			const heightTrigger = params.exclude !== "height" && height !== h;
			if (widthTrigger || heightTrigger) {
				w = width;
				h = height;
				if (!firstTime) node.dispatchEvent(new CustomEvent("resize"));
			}
		}
	};

	const setObserver = () => {
		observer?.disconnect();
		const cb = params.debounce ? debounce(handleResize, params.debounce) : handleResize;
		observer = new ResizeObserver(cb);
		observer.observe(node);
	};

	setObserver();

	return {
		update(p) {
			params = p;
			setObserver();
		},
		destroy() {
			observer?.disconnect();
		}
	};
};

export default resize;
