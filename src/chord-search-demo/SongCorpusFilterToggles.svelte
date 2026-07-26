<script lang="ts">
	import ToggleSwitch from "./ToggleSwitch.svelte";

	const {
		showPopularOnly,
		onPopularChange,
		requireMultipleSections,
		onRequireMultipleSectionsChange
	}: {
		showPopularOnly: boolean;
		onPopularChange: (checked: boolean) => void;
		requireMultipleSections: boolean;
		onRequireMultipleSectionsChange: (checked: boolean) => void;
	} = $props();
</script>

<div class="corpus-filters">
	<ToggleSwitch
		checked={showPopularOnly}
		onchange={onPopularChange}
		label="popular recent songs only"
	/>
	<ToggleSwitch
		checked={requireMultipleSections}
		onchange={onRequireMultipleSectionsChange}
		label="2+ sections"
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
