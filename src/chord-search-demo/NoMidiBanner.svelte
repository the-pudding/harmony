<script lang="ts">
	let { message }: { message: string } = $props();
</script>

{#if message}
	<div class="banner" role="alert">{message}</div>
{/if}

<style>
	.banner {
		background: #450a0a;
		border: 1px solid #b91c1c;
		color: #fca5a5;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
	}
</style>
