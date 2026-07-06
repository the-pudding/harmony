import { readable } from "svelte/store";

const getWidth = () =>
	window?.visualViewport?.width ?? document.documentElement.clientWidth;

const getHeight = () =>
	window?.visualViewport?.height ?? document.documentElement.clientHeight;

export default readable({ width: 0, height: 0 }, (set) => {
	const update = () => set({ width: getWidth(), height: getHeight() });
	update();
	window.addEventListener("resize", update);
	window.visualViewport?.addEventListener("resize", update);
	return () => {
		window.removeEventListener("resize", update);
		window.visualViewport?.removeEventListener("resize", update);
	};
});
