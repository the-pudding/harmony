import { linear } from "svelte/easing";
import { interpolateTransformSvg } from "d3";
import type { EasingFunction, TransitionConfig } from "svelte/transition";

type TransformSvgParams = {
	relative?: boolean;
	target: string;
	delay?: number;
	duration?: number;
	easing?: EasingFunction;
	opacity?: boolean;
};

export default function transformSvg(
	node: SVGElement,
	params: TransformSvgParams
): TransitionConfig {
	const a = node.getAttribute("transform") ?? "";
	const b = `${params.relative ? a : ""} ${params.target}`;
	const interpolator = interpolateTransformSvg(a, b);

	return {
		delay: params.delay ?? 0,
		duration: params.duration ?? 250,
		easing: params.easing ?? linear,
		tick: (_t, u) => {
			node.setAttribute("transform", interpolator(u));
		},
		css: (t) => (params.opacity ? `opacity: ${t}` : "")
	};
}
