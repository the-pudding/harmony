<script lang="ts">
	import ToggleSwitch from "./ToggleSwitch.svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";

	let {
		bassAsRoot,
		onBassAsRootChange
	}: {
		bassAsRoot: boolean;
		onBassAsRootChange: (checked: boolean) => void;
	} = $props();
</script>

<ToggleSwitch
	checked={bassAsRoot}
	onchange={onBassAsRootChange}
	label="When classifying, try first to treat the bass note as the root (before assuming it's a slash chord)"
/>
