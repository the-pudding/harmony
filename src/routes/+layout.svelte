<script>
	import "$styles/app.css";
	import { page } from "$app/state";

	let { children } = $props();
</script>

<main id="content">
	{@render children?.()}
</main>
