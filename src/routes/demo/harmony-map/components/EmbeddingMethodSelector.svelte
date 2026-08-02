<script lang="ts">
	import {
		EMBEDDING_METHODS,
		type EmbeddingMethod
	} from "../embedding/reducers/types.js";
	import {
		METHOD_DESCRIPTION_SECTIONS,
		embeddingMethodDescriptions,
		embeddingMethodLabels
	} from "../methodDescriptions.js";

	type Props = {
		method: EmbeddingMethod;
		onChange: (method: EmbeddingMethod) => void;
	};

	const { method, onChange }: Props = $props();
</script>

<div class="method-selector" role="radiogroup" aria-label="Embedding method">
	{#each EMBEDDING_METHODS as option (option)}
		{@const description = embeddingMethodDescriptions[option]}
		<button
			class="method-button"
			class:method-button-active={option === method}
			role="radio"
			aria-checked={option === method}
			aria-describedby="method-tooltip-{option}"
			onclick={() => onChange(option)}
		>
			{embeddingMethodLabels[option]}
			<span
				id="method-tooltip-{option}"
				class="method-tooltip"
				role="tooltip"
			>
				<span class="method-tooltip-summary">{description.summary}</span>
				{#each METHOD_DESCRIPTION_SECTIONS as section (section.key)}
					<span class="method-tooltip-section">
						<span class="method-tooltip-label">{section.label}</span>
						{description[section.key]}
					</span>
				{/each}
			</span>
		</button>
	{/each}
</div>

<style>
	.method-selector {
		display: flex;
		gap: 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.125rem;
	}

	.method-button {
		position: relative;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.7rem;
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.method-button:hover {
		color: #e4e4e7;
	}

	.method-button-active {
		background: rgba(99, 102, 241, 0.3);
		color: #f4f4f5;
	}

	.method-tooltip {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 18rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.98);
		color: #d4d4d8;
		font-size: 0.65rem;
		font-weight: 400;
		line-height: 1.5;
		text-align: left;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			visibility 0.15s ease;
	}

	.method-button:hover .method-tooltip,
	.method-button:focus-visible .method-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.method-tooltip-summary {
		color: #f4f4f5;
	}

	.method-tooltip-section {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		color: #a1a1aa;
	}

	.method-tooltip-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}
</style>
