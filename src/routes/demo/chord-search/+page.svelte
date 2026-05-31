<script lang="ts">
	import ChordSearchDemo from "../../../chord-search-demo/ChordSearchDemo.svelte";
</script>

<svelte:head>
	<title>harmony</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<ChordSearchDemo />

<style>
	:global(body > header) {
		display: none;
	}
</style>
