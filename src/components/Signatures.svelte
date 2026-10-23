<script>
	import ClusterPercentOverTime from "$components/ClusterPercentOverTime.svelte";
</script>

<div class="signatures">
	<div class="chart-title">The 1970s-1990s lacked signature progressions</div>
	{#each ["1990s", "1980s", "1970s"] as decade}
		<ClusterPercentOverTime cluster={decade} small={true} />
	{/each}
</div>

<style>
	.signatures {
		max-width: 700px;
		margin: 2rem auto;
	}
</style>
