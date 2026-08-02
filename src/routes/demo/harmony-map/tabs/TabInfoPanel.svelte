<script lang="ts">
	import CollapsiblePanel from "../../define-chord-progression/components/CollapsiblePanel.svelte";
	import type { ViewDescription } from "./tabDescriptions.js";

	type Props = { description: ViewDescription };

	const { description }: Props = $props();

	const sections = $derived([
		{ label: "Why", body: description.rationale },
		{ label: "How", body: description.approach },
		{ label: "Tradeoffs", body: description.tradeoffs }
	]);
</script>

<CollapsiblePanel
	expandLabel="{description.title} — {description.summary}"
	collapseLabel="{description.title} — hide details"
>
	{#each sections as section (section.label)}
		<div class="section">
			<h3 class="section-label">{section.label}</h3>
			<p class="section-body">{section.body}</p>
		</div>
	{/each}
</CollapsiblePanel>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.section-label {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.section-body {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.6;
		color: #a1a1aa;
	}
</style>
