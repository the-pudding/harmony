<script lang="ts">
	import SongProgressionsDemo from "../../../chord-search-demo/SongProgressionsDemo.svelte";
</script>

<svelte:head>
	<title>harmony — progressions</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<SongProgressionsDemo />

<style>
	:global(body > header) {
		display: none;
	}
</style>
