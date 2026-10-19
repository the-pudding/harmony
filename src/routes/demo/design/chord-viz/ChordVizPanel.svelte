<script lang="ts">
	import type { Snippet } from "svelte";
	import {
		PANEL_APPEARANCE_CARD,
		chordVizThemeStyle,
		type PanelAppearance
	} from "./chordVizTheme.js";

	type Props = {
		title: string;
		creditLabel: string;
		creditUrl: string;
		appearance?: PanelAppearance;
		children: Snippet;
	};

	let {
		title,
		creditLabel,
		creditUrl,
		appearance = PANEL_APPEARANCE_CARD,
		children
	}: Props = $props();

	const themeStyle = $derived(chordVizThemeStyle(appearance));
</script>

<div class="panel" style={themeStyle}>
	<div class="header">
		<h3 class="title">{title}</h3>
		<p class="credit">
			Adapted from
			<a href={creditUrl} target="_blank" rel="noopener noreferrer"
				>{creditLabel}</a
			>
		</p>
	</div>
	{@render children()}
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		border-radius: 0.5rem;
		background: var(--chord-viz-bg);
		color: var(--chord-viz-fg);
		isolation: isolate;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.credit {
		margin: 0;
		font-size: 0.75rem;
		color: var(--chord-viz-muted);
	}

	.credit a {
		color: var(--chord-viz-link);
	}
</style>
