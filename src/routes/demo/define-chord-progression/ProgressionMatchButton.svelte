<script lang="ts">
	import type { CoreProgressionWithStats } from "./progressionMatchAnalysis.js";

	type Props = {
		match: CoreProgressionWithStats;
		active: boolean;
		onselect: (chordProgression: string) => void;
	};

	let { match, active, onselect }: Props = $props();
</script>

<button
	class="prog-btn"
	class:active
	onclick={() => onselect(match.chordProgression)}
	title={match.chordProgression}
>
	<span class="prog-name">{match.name}</span>
	<span class="prog-chords">{match.chordProgression}</span>
	<span class="prog-stats">{match.matchCount}× · {Math.round(match.coveragePercent)}%</span>
</button>

<style>
	.prog-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		color: #a1a1aa;
		padding: 0.375rem 0.625rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		text-align: left;
		overflow-wrap: anywhere;
	}

	.prog-btn:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e4e4e7;
	}

	.prog-btn.active {
		background: rgba(137, 180, 250, 0.15);
		border-color: rgba(137, 180, 250, 0.4);
		color: #89b4fa;
	}

	.prog-name {
		font-size: 0.75rem;
		color: inherit;
	}

	.prog-chords {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.7);
	}

	.prog-btn.active .prog-chords {
		color: rgba(137, 180, 250, 0.7);
	}

	.prog-btn:hover .prog-chords {
		color: rgba(228, 228, 231, 0.7);
	}

	.prog-stats {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.5);
	}

	.prog-btn.active .prog-stats {
		color: rgba(137, 180, 250, 0.5);
	}

	.prog-btn:hover .prog-stats {
		color: rgba(228, 228, 231, 0.5);
	}
</style>
