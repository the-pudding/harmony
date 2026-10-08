<script lang="ts">
	import "$styles/app.css";
	import Header from "$components/Header.svelte";
	import { page } from "$app/state";

	let { children } = $props();
</script>

<!-- Only the root page gets the site header; /demo pages have their own TopNavBar. -->
{#if page.route.id === "/"}
	<Header />
{/if}
<main id="content">
	{@render children?.()}
</main>
