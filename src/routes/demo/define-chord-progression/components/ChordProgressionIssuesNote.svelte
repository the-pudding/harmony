<script lang="ts">
	import {
		CHORD_PROGRESSION_ISSUES_LABEL,
		getChordProgressionIssues
	} from "$data/hand-reviewed-songs.js";

	const FONT_SIZE_SM = "0.65rem";
	const FONT_SIZE_MD = "0.75rem";
	const ISSUES_COLOR_SM = "rgba(248, 113, 113, 0.9)";
	const ISSUES_COLOR_MD = "rgba(248, 113, 113, 0.95)";
	const ISSUES_COLOR_HOVER = "rgba(252, 165, 165, 0.95)";

	type Props = {
		songKey: string;
		size?: "sm" | "md";
		inline?: boolean;
		brightensOnParentHover?: boolean;
	};

	let {
		songKey,
		size = "md",
		inline = false,
		brightensOnParentHover = false
	}: Props = $props();

	const text = $derived(getChordProgressionIssues(songKey));
	const fontSize = $derived(size === "sm" ? FONT_SIZE_SM : FONT_SIZE_MD);
	const color = $derived(size === "sm" ? ISSUES_COLOR_SM : ISSUES_COLOR_MD);
</script>

{#if text}
	<svelte:element
		this={inline ? "span" : "p"}
		class="chord-progression-issues-note"
		class:brightens-on-parent-hover={brightensOnParentHover}
		style:font-size={fontSize}
		style:color
		style:--issues-color-hover={ISSUES_COLOR_HOVER}
	>
		<span class="label">{CHORD_PROGRESSION_ISSUES_LABEL}</span>
		{text}
	</svelte:element>
{/if}

<style>
	.chord-progression-issues-note {
		margin: 0;
		font-style: italic;
		line-height: 1.4;
	}

	.label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-style: normal;
	}

	:global(.song-card:hover) .brightens-on-parent-hover {
		color: var(--issues-color-hover);
	}
</style>
