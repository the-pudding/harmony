<script lang="ts">
	import type { SongBiasOverride } from "../compute-coverage-of-all-songs/index.js";

	type Props = {
		biasOverrides: SongBiasOverride[];
		onclose: () => void;
	};

	let { biasOverrides, onclose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		dialogEl?.showModal();
	});

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialogEl) onclose();
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="modal"
	{onclose}
	onclick={handleBackdropClick}
>
	<div class="modal-inner">
		<div class="modal-header">
			<h2 class="modal-title">
				Songs where section-start bias was applied ({biasOverrides.length})
			</h2>
			<button class="close-btn" onclick={onclose} aria-label="Close">✕</button>
		</div>
		<p class="modal-description">
			Each row is a greedy-selection round where a progression that starts more
			sections was chosen over the raw coverage leader, within the 5% tolerance.
		</p>
		{#if biasOverrides.length === 0}
			<p class="empty">No overrides yet — corpus still loading.</p>
		{:else}
			<div class="table-scroll">
				<table class="bias-table">
					<thead>
						<tr>
							<th>Song</th>
							<th>Chosen (starts section)</th>
							<th>Passed over</th>
							<th>Coverage sacrificed</th>
						</tr>
					</thead>
					<tbody>
						{#each biasOverrides as row (row.songKey + row.winnerProgression + row.leaderProgression)}
							<tr>
								<td>
									<a
										class="song-link"
										href="/demo/define-chord-progression/?song={row.songKey}"
										target="_blank"
										rel="noreferrer">{row.title}</a
									>
								</td>
								<td class="prog winner-prog">{row.winnerProgression}</td>
								<td class="prog leader-prog">{row.leaderProgression}</td>
								<td class="sacrifice">{row.sacrificedPercent}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.modal {
		position: fixed;
		inset: 0;
		margin: auto;
		width: min(56rem, calc(100vw - 2rem));
		max-height: min(36rem, calc(100vh - 4rem));
		background: #111113;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		padding: 0;
		color: #d4d4d8;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal::backdrop {
		background: rgba(0, 0, 0, 0.6);
	}

	.modal-inner {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid #27272a;
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 0.875rem;
		font-weight: 700;
		margin: 0;
		color: #f4f4f5;
	}

	.close-btn {
		background: none;
		border: none;
		color: #71717a;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.close-btn:hover {
		color: #f4f4f5;
	}

	.modal-description {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
		padding: 0.625rem 1.25rem;
		border-bottom: 1px solid #27272a;
		flex-shrink: 0;
		line-height: 1.5;
	}

	.empty {
		font-size: 0.8125rem;
		color: #52525b;
		padding: 1.5rem 1.25rem;
		margin: 0;
	}

	.table-scroll {
		overflow-y: auto;
		flex: 1;
	}

	.bias-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.bias-table thead {
		position: sticky;
		top: 0;
		background: #111113;
		z-index: 1;
	}

	.bias-table th {
		text-align: left;
		padding: 0.5rem 1.25rem;
		color: #52525b;
		font-weight: 600;
		border-bottom: 1px solid #27272a;
		white-space: nowrap;
	}

	.bias-table td {
		padding: 0.45rem 1.25rem;
		border-bottom: 1px solid #1c1c1f;
		vertical-align: middle;
	}

	.bias-table tbody tr:hover td {
		background: rgba(255, 255, 255, 0.02);
	}

	.song-link {
		color: #a1a1aa;
		text-decoration: none;
	}

	.song-link:hover {
		color: #f4f4f5;
		text-decoration: underline;
	}

	.prog {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		white-space: nowrap;
	}

	.winner-prog {
		color: rgba(251, 191, 36, 0.8);
	}

	.leader-prog {
		color: #52525b;
	}

	.sacrifice {
		color: #52525b;
		text-align: right;
	}
</style>
