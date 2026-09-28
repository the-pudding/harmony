<script lang="ts">
	import { onMount } from "svelte";
	import coreProgressionsData from "$data/core-progressions.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";
	import SongSelectDropdown from "../define-chord-progression/components/SongSelectDropdown.svelte";
	import { matchSongV2 } from "../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../match-algo-v2/match-algo-v2-logic/weights.js";
	import { findGroupedSongByKey } from "../../../data/songBrowserData.js";
	import { humanizeScale } from "../../../data/songBrowser.js";
	import { assignedReviewerIndex, computeReviewQueue, queueForReviewer } from "./reviewQueue.js";
	import type {
		ReviewStateResponse,
		ReviewStatusStore,
		ReviewedCorrectionsStore,
		ReviewedCorrectionEntry
	} from "./reviewTypes.js";

	const REVIEW_API_URL = "/demo/review/api";
	const REVIEWER_STORAGE_KEY = "harmony-review-reviewer-name";
	const REVIEWERS = ["Michelle", "David"];

	const coverage = createAllSongsCoverageState();
	const coreProgressions = coreProgressionsData;

	let reviewStatus = $state<ReviewStatusStore>({});
	let reviewedCorrections = $state<ReviewedCorrectionsStore>({});
	let splitSeed = $state(1);
	let stateLoaded = $state(false);
	let stateLoadError = $state("");

	let reviewerName = $state("");
	// Set when a song is picked from the dropdown, overriding the queue's
	// pick — cleared after any decision so the queue resumes driving.
	let manualSongKey = $state<string | null>(null);
	let noteDraft = $state("");
	let showCorrectionEditor = $state(false);
	type CorrectionSectionDraft = {
		name: string;
		key: string;
		scale: string;
		romanTokens: string;
	};
	let correctionDraft = $state<CorrectionSectionDraft[]>([]);
	let saving = $state(false);
	let saveError = $state("");

	onMount(() => {
		const storedReviewer = localStorage.getItem(REVIEWER_STORAGE_KEY);
		if (storedReviewer) reviewerName = storedReviewer;

		void fetch(REVIEW_API_URL)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data: ReviewStateResponse) => {
				reviewStatus = data.reviewStatus;
				reviewedCorrections = data.reviewedCorrections;
				splitSeed = data.splitSeed;
			})
			.catch((err) => {
				stateLoadError = err instanceof Error ? err.message : String(err);
			})
			.finally(() => {
				stateLoaded = true;
			});
	});

	function chooseReviewer(name: string) {
		reviewerName = name;
		localStorage.setItem(REVIEWER_STORAGE_KEY, name);
	}

	const reviewedSongKeys = $derived(new Set(Object.keys(reviewStatus)));

	const queue = $derived.by(() =>
		coverage.allSongsCoverageResult
			? computeReviewQueue(
					coverage.allSongsCoverageResult.songCoverages,
					reviewedSongKeys
				)
			: []
	);

	// Each unreviewed song is deterministically assigned to one reviewer (by
	// hash of songKey + the shared splitSeed), so two people working live at
	// once rarely land on the same song — a fixed ~50/50 split rather than
	// picking from opposite ends of one shared queue.
	const myReviewerIndex = $derived(REVIEWERS.indexOf(reviewerName));
	const personalQueue = $derived(
		queueForReviewer(queue, myReviewerIndex, splitSeed, REVIEWERS.length)
	);

	const totalSongs = $derived(coverage.baseList.length);
	const reviewedCount = $derived(Object.keys(reviewStatus).length);
	const verifiedCount = $derived(
		Object.values(reviewStatus).filter((e) => e.status === "verified").length
	);
	const flaggedCount = $derived(
		Object.values(reviewStatus).filter((e) => e.status === "flagged").length
	);
	const correctedCount = $derived(Object.keys(reviewedCorrections).length);
	const unreviewedCount = $derived(Math.max(0, totalSongs - reviewedCount));

	// Progress per reviewer's half of the whole corpus, not just the current
	// (unreviewed-only) queue — every song is bucketed by the same hash used
	// to build personalQueue, so a reviewer's bar reflects "how much of my
	// assigned half is done" even for songs reviewed under an earlier seed.
	const perReviewerProgress = $derived.by(() =>
		REVIEWERS.map((_, reviewerIndex) => {
			let total = 0;
			let done = 0;
			for (const song of coverage.baseList) {
				if (assignedReviewerIndex(song.songKey, splitSeed, REVIEWERS.length) !== reviewerIndex)
					continue;
				total++;
				if (reviewedSongKeys.has(song.songKey)) done++;
			}
			return { total, done };
		})
	);

	const currentSongKey = $derived(manualSongKey ?? personalQueue[0]?.songKey ?? null);
	const currentTier = $derived(
		queue.find((r) => r.songKey === currentSongKey)?.tier ?? null
	);

	const selectedSong = $derived(
		currentSongKey ? findGroupedSongByKey(coverage.songs, currentSongKey) : null
	);

	const v2Result = $derived(
		selectedSong ? matchSongV2(selectedSong, coreProgressions, DEFAULT_WEIGHTS) : null
	);
	const explainedPercent = $derived(v2Result?.explainedPercent ?? 0);
	const matches = $derived(v2Result?.matches ?? []);
	const annotations = $derived(v2Result?.annotations ?? []);

	const existingEntry = $derived(
		currentSongKey ? reviewStatus[currentSongKey] : undefined
	);

	// Best-effort raw tonic from a section's combined keyLabel ("C major" ->
	// "C") — left blank for multi-key songs ("[C major, G major]") rather
	// than guessing; the reviewer fills it in by hand in that case.
	const rawKeyFromSection = (section: {
		keyLabel: string | null;
		scale: string;
	}): string => {
		if (!section.keyLabel) return "";
		const suffix = ` ${humanizeScale(section.scale)}`;
		return section.keyLabel.endsWith(suffix)
			? section.keyLabel.slice(0, -suffix.length)
			: "";
	};

	$effect(() => {
		// Re-seed the drafts whenever the song being reviewed changes.
		const song = selectedSong;
		noteDraft = "";
		showCorrectionEditor = false;
		saveError = "";
		correctionDraft = song
			? song.sections.map((s) => ({
					name: s.label ?? "Section",
					key: rawKeyFromSection(s),
					scale: s.scale,
					romanTokens: s.romanTokens.join(" ")
				}))
			: [];
	});

	async function submitDecision(body: Record<string, unknown>) {
		saving = true;
		saveError = "";
		try {
			const res = await fetch(REVIEW_API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}) as { error?: string });
				throw new Error(err.error ?? `HTTP ${res.status}`);
			}
			const data: ReviewStateResponse = await res.json();
			reviewStatus = data.reviewStatus;
			reviewedCorrections = data.reviewedCorrections;
			splitSeed = data.splitSeed;
			manualSongKey = null;
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	function handleVerify() {
		if (!currentSongKey || !reviewerName) return;
		void submitDecision({
			songKey: currentSongKey,
			action: "verify",
			reviewedBy: reviewerName
		});
	}

	function handleFlag() {
		if (!currentSongKey || !reviewerName || !noteDraft.trim()) return;
		void submitDecision({
			songKey: currentSongKey,
			action: "flag",
			reviewedBy: reviewerName,
			note: noteDraft.trim()
		});
	}

	function handleSubmitCorrection() {
		if (!currentSongKey || !reviewerName) return;
		const correction: ReviewedCorrectionEntry = {
			correctedSongContents: {
				sections: correctionDraft.map((s) => ({
					name: s.name,
					key: s.key,
					scale: s.scale,
					romanTokens: s.romanTokens.split(/\s+/).filter(Boolean)
				}))
			},
			...(noteDraft.trim() ? { technicalNotes: noteDraft.trim() } : {})
		};
		void submitDecision({
			songKey: currentSongKey,
			action: "correct",
			reviewedBy: reviewerName,
			...(noteDraft.trim() ? { note: noteDraft.trim() } : {}),
			correction
		});
	}

	function handlePickSong(songKey: string) {
		manualSongKey = songKey;
	}

	function handleReshuffle() {
		void submitDecision({ action: "reshuffle" });
	}
</script>

{#snippet progressBar(label: string, done: number, total: number)}
	<div class="progress-row">
		<span class="progress-label">{label}</span>
		<div class="progress-track">
			<div
				class="progress-fill"
				style="width: {total > 0 ? (done / total) * 100 : 0}%"
			></div>
		</div>
		<span class="progress-count"
			>{done.toLocaleString()} / {total.toLocaleString()}</span
		>
	</div>
{/snippet}

<svelte:head>
	<title>harmony — review</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Review</h1>
			<p class="page-subtitle">
				Manually verify how the matching algorithm labeled each song — dev-only,
				decisions are written to local files under src/data/.
			</p>
		</div>

		{#if totalSongs > 0}
			<div class="progress-bars">
				{@render progressBar("overall", reviewedCount, totalSongs)}
				{#each REVIEWERS as name, i (name)}
					{@render progressBar(name, perReviewerProgress[i].done, perReviewerProgress[i].total)}
				{/each}
			</div>
		{/if}

		{#if !reviewerName}
			<div class="reviewer-picker">
				<span>Who's reviewing?</span>
				{#each REVIEWERS as name (name)}
					<button type="button" class="reviewer-button" onclick={() => chooseReviewer(name)}
						>{name}</button
					>
				{/each}
			</div>
		{:else}
			<div class="progress-header">
				<span class="reviewer-badge"
					>reviewing as <strong>{reviewerName}</strong>
					<button type="button" class="switch-reviewer" onclick={() => (reviewerName = "")}
						>switch</button
					></span
				>
				<span class="progress-stats"
					>{personalQueue.length.toLocaleString()} in your queue · {verifiedCount.toLocaleString()}
					verified · {flaggedCount.toLocaleString()} flagged ({correctedCount.toLocaleString()} corrected)
					· {unreviewedCount.toLocaleString()} of {totalSongs.toLocaleString()} unreviewed</span
				>
				<button
					type="button"
					class="reshuffle-button"
					disabled={saving}
					onclick={handleReshuffle}
					title="Reshuffle which reviewer each still-unreviewed song is assigned to"
					>🔀 re-shuffle split</button
				>
			</div>

			{#if coverage.loading}
				<p class="status-text">Loading song dataset…</p>
			{:else if coverage.loadError}
				<p class="status-text error">{coverage.loadError}</p>
			{:else if !coverage.allSongsCoverageResult}
				<p class="status-text">Computing coverage…</p>
			{:else if !stateLoaded}
				<p class="status-text">Loading review state…</p>
			{:else if stateLoadError}
				<p class="status-text error">{stateLoadError}</p>
			{:else if !currentSongKey || !selectedSong}
				{#if unreviewedCount === 0}
					<p class="status-text">🎉 Every song has been reviewed.</p>
				{:else}
					<p class="status-text">
						You've finished your half of the queue — {unreviewedCount.toLocaleString()} songs still
						need review overall. Re-shuffle to split the remainder fresh, or ask the other reviewer
						to check theirs.
					</p>
				{/if}
			{:else}
				<div class="review-toolbar">
					<SongSelectDropdown
						songs={coverage.baseList}
						{selectedSong}
						selectedKey={currentSongKey}
						onSelectedKeyChange={handlePickSong}
					/>
					{#if currentTier !== null}
						<span class="tier-badge">priority tier {currentTier}</span>
					{/if}
				</div>

				{#if existingEntry}
					<p class="already-reviewed-note">
						Already {existingEntry.status} by {existingEntry.reviewedBy} on {new Date(
							existingEntry.reviewedAt
						).toLocaleDateString()}{existingEntry.note ? ` — "${existingEntry.note}"` : ""}
					</p>
				{/if}

				<FinalAnnotatedSong
					song={selectedSong}
					{matches}
					{annotations}
					{explainedPercent}
					activeProgression={null}
					onselect={() => {}}
				/>

				<div class="review-actions">
					<div class="primary-actions">
						<button
							type="button"
							class="verify-button"
							disabled={saving}
							onclick={handleVerify}>✓ Verified correct</button
						>
					</div>

					<div class="flag-block">
						<textarea
							bind:value={noteDraft}
							class="note-input"
							placeholder="What's wrong? (required to flag)"
							rows="2"
						></textarea>
						<div class="flag-buttons">
							<button
								type="button"
								class="flag-button"
								disabled={saving || !noteDraft.trim()}
								onclick={handleFlag}>🚩 Flag with this note</button
							>
							<button
								type="button"
								class="fix-now-button"
								onclick={() => (showCorrectionEditor = !showCorrectionEditor)}
								>{showCorrectionEditor ? "Cancel fix" : "Fix it now →"}</button
							>
						</div>
					</div>

					{#if showCorrectionEditor}
						<div class="correction-editor">
							<p class="correction-editor-label"
								>Per-section correction — edit the roman tokens, key, and scale directly.</p
							>
							{#each correctionDraft as section, i (i)}
								<div class="correction-section">
									<input bind:value={section.name} class="correction-name" aria-label="section name" />
									<input
										bind:value={section.key}
										class="correction-key"
										placeholder="key, e.g. C"
										aria-label="key"
									/>
									<input
										bind:value={section.scale}
										class="correction-scale"
										placeholder="scale, e.g. major"
										aria-label="scale"
									/>
									<input
										bind:value={section.romanTokens}
										class="correction-tokens"
										placeholder="roman tokens, space-separated, e.g. I V vi IV"
										aria-label="roman tokens"
									/>
								</div>
							{/each}
							<button
								type="button"
								class="submit-correction-button"
								disabled={saving}
								onclick={handleSubmitCorrection}>Save correction</button
							>
						</div>
					{/if}

					{#if saveError}
						<p class="status-text error">{saveError}</p>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		max-width: 64rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.8rem;
		color: #a1a1aa;
	}

	.status-text {
		font-size: 0.8rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.progress-bars {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding-bottom: 0.25rem;
	}

	.progress-row {
		display: grid;
		grid-template-columns: 4.5rem 1fr 6rem;
		align-items: center;
		gap: 0.625rem;
	}

	.progress-label {
		font-size: 0.7rem;
		color: #a1a1aa;
		text-transform: lowercase;
	}

	.progress-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: rgba(63, 63, 70, 0.5);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #6366f1, #818cf8);
		border-radius: 9999px;
		transition: width 0.2s ease;
	}

	.progress-count {
		font-size: 0.7rem;
		color: #71717a;
		text-align: right;
		white-space: nowrap;
	}

	.reviewer-picker {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: #d4d4d8;
	}

	.reviewer-button {
		border: 1px solid rgba(99, 102, 241, 0.6);
		background: rgba(67, 56, 202, 0.2);
		color: #f4f4f5;
		border-radius: 0.375rem;
		padding: 0.4rem 0.875rem;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.reviewer-button:hover {
		background: rgba(67, 56, 202, 0.4);
	}

	.progress-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.reviewer-badge strong {
		color: #f4f4f5;
	}

	.switch-reviewer {
		margin-left: 0.5rem;
		border: none;
		background: transparent;
		color: #71717a;
		text-decoration: underline;
		font-family: inherit;
		font-size: 0.7rem;
		cursor: pointer;
		padding: 0;
	}

	.reshuffle-button {
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: transparent;
		color: #a1a1aa;
		border-radius: 0.375rem;
		padding: 0.3rem 0.625rem;
		font-family: inherit;
		font-size: 0.7rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.reshuffle-button:hover:not(:disabled) {
		background: rgba(63, 63, 70, 0.4);
	}

	.reshuffle-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.review-toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tier-badge {
		font-size: 0.65rem;
		color: #71717a;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 9999px;
		padding: 0.2rem 0.625rem;
		white-space: nowrap;
	}

	.already-reviewed-note {
		margin: 0;
		font-size: 0.75rem;
		color: #fbbf24;
	}

	.review-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(63, 63, 70, 0.7);
	}

	.primary-actions {
		display: flex;
		gap: 0.625rem;
	}

	.verify-button {
		border: 1px solid rgba(74, 222, 128, 0.5);
		background: rgba(22, 101, 52, 0.3);
		color: #86efac;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.verify-button:hover:not(:disabled) {
		background: rgba(22, 101, 52, 0.5);
	}

	.verify-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.flag-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.note-input {
		width: 100%;
		box-sizing: border-box;
		background: rgba(24, 24, 27, 0.6);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.8rem;
		padding: 0.5rem 0.625rem;
		resize: vertical;
	}

	.flag-buttons {
		display: flex;
		gap: 0.625rem;
	}

	.flag-button {
		border: 1px solid rgba(251, 191, 36, 0.5);
		background: rgba(120, 53, 15, 0.3);
		color: #fbbf24;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.flag-button:hover:not(:disabled) {
		background: rgba(120, 53, 15, 0.5);
	}

	.flag-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.fix-now-button {
		border: 1px solid rgba(99, 102, 241, 0.5);
		background: transparent;
		color: #a5b4fc;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.fix-now-button:hover {
		background: rgba(67, 56, 202, 0.2);
	}

	.correction-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border: 1px solid rgba(99, 102, 241, 0.4);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
	}

	.correction-editor-label {
		margin: 0;
		font-size: 0.7rem;
		color: #a1a1aa;
	}

	.correction-section {
		display: grid;
		grid-template-columns: 8rem 5rem 6rem 1fr;
		gap: 0.5rem;
	}

	.correction-section input {
		box-sizing: border-box;
		background: rgba(9, 9, 11, 0.8);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.35rem 0.5rem;
	}

	.submit-correction-button {
		align-self: flex-start;
		border: 1px solid rgba(99, 102, 241, 0.6);
		background: rgba(67, 56, 202, 0.3);
		color: #f4f4f5;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.submit-correction-button:hover:not(:disabled) {
		background: rgba(67, 56, 202, 0.5);
	}

	.submit-correction-button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
