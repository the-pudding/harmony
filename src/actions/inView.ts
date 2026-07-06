import type { Action } from "svelte/action";

type InViewParams = {
	root?: Element | Document | null;
	top?: number;
	bottom?: number;
	progress?: boolean;
};

const inView: Action<HTMLElement, InViewParams> = (node, params = {}) => {
	let observer: IntersectionObserver | undefined;

	const handleIntersect = (e: IntersectionObserverEntry[]) => {
		const intersecting = e[0]?.isIntersecting ?? false;
		const v = intersecting ? "enter" : "exit";
		node.dispatchEvent(new CustomEvent(v));
		if (params.progress && intersecting) {
			const ratio = e[0].intersectionRatio;
			node.dispatchEvent(new CustomEvent("progress", { detail: { ratio } }));
		}
	};

	const setObserver = ({ root, top, bottom }: InViewParams) => {
		const marginTop = top ? top * -1 : 0;
		const marginBottom = bottom ? bottom * -1 : 0;
		const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
		observer?.disconnect();
		observer = new IntersectionObserver(handleIntersect, {
			root: root ?? null,
			rootMargin
		});
		observer.observe(node);
	};

	setObserver(params);

	return {
		update(p) {
			params = p;
			setObserver(params);
		},
		destroy() {
			observer?.disconnect();
		}
	};
};

export default inView;
