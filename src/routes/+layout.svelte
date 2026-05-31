<script lang="ts">
	import "$styles/app.css";
	import Header from "$components/Header.svelte";

	let { children } = $props();
</script>

<main id="content">
	{@render children?.()}
</main>
