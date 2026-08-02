<script lang="ts">
	import ToggleSwitch from "./ToggleSwitch.svelte";

	const {
		showRecentOnly,
		onRecentChange
	}: {
		showRecentOnly: boolean;
		onRecentChange: (checked: boolean) => void;
	} = $props();
</script>

<div class="corpus-filters">
	<ToggleSwitch
		checked={showRecentOnly}
		onchange={onRecentChange}
		label="recent songs only"
	/>
</div>

<style>
	.corpus-filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.25rem;
	}
</style>
