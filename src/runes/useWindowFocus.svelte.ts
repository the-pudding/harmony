import { onMount } from "svelte";

export const useWindowFocus = () => {
	let value = $state(true);

	const checkFocus = () => {
		value = document.visibilityState === "visible";
	};

	onMount(() => {
		document.addEventListener("visibilitychange", checkFocus);
		checkFocus();
		return () => document.removeEventListener("visibilitychange", checkFocus);
	});

	return {
		get value() {
			return value;
		}
	};
};
