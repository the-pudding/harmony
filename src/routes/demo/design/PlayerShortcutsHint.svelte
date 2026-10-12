<script lang="ts">
	import { PLAYER_SHORTCUTS } from "./playerShortcuts.js";
</script>

<aside class="shortcuts-box" aria-label="Keyboard shortcuts">
	<span class="heading">Shortcuts</span>
	<ul class="shortcuts">
		{#each PLAYER_SHORTCUTS as shortcut (shortcut.label)}
			<li><kbd>{shortcut.label}</kbd> {shortcut.description}</li>
		{/each}
	</ul>
</aside>

<style>
	.shortcuts-box {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.6875rem;
		color: #a1a1aa;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.shortcuts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	kbd {
		padding: 0 0.3125rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.25rem;
		background: rgba(24, 24, 27, 0.6);
		color: #d4d4d8;
		font: inherit;
	}
</style>
