<script lang="ts">
	import type { PianoKeyData } from "./pianoKeys.js";
	import { SPLIT_KEY_BORDER_COLOR, SPLIT_KEY_BORDER_WIDTH_PX } from "./pianoKeys.js";

	type Props = {
		keyData: PianoKeyData;
		isActive: boolean;
		isSplit: boolean;
		totalWhiteKeys: number;
		blackKeyWidthRatio: number;
		onSelect?: () => void;
	};

	const { keyData, isActive, isSplit, totalWhiteKeys, blackKeyWidthRatio, onSelect }: Props =
		$props();

	type KeyState = "idle" | "active";

	let keyState = $state<KeyState>("idle");
	let wasActive = false;

	$effect(() => {
		if (isActive) {
			wasActive = true;
			keyState = "active";
		} else if (wasActive) {
			wasActive = false;
			keyState = "idle";
		}
	});

	const inlineStyle = $derived(
		[
			`--white-pos: ${keyData.whitePosition}`,
			`--total-white-keys: ${totalWhiteKeys}`,
			`--black-key-ratio: ${blackKeyWidthRatio}`,
			`--is-black: ${keyData.isBlack ? 1 : 0}`,
			isSplit
				? `--split-border-width: ${SPLIT_KEY_BORDER_WIDTH_PX}px; --split-border-color: ${SPLIT_KEY_BORDER_COLOR}`
				: null
		]
			.filter(Boolean)
			.join("; ")
	);
</script>

<div
	class="piano-key"
	class:black={keyData.isBlack}
	class:white={!keyData.isBlack}
	class:split={isSplit}
	class:selectable={Boolean(onSelect)}
	data-state={keyState}
	style={inlineStyle}
	onclick={() => onSelect?.()}
	role={onSelect ? "button" : undefined}
>
	<span class="label">{keyData.label}</span>
</div>

<style>
	.piano-key {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		cursor: default;
		user-select: none;
	}

	.piano-key.selectable {
		cursor: pointer;
	}

	/* ── White keys ── */
	.white {
		left: calc(var(--white-pos) / var(--total-white-keys) * 100%);
		width: calc(100% / var(--total-white-keys));
		height: 100%;
		background: #f0f0f0;
		border: 1px solid #555;
		border-top: none;
		border-radius: 0 0 3px 3px;
		z-index: 1;
		transition: background 50ms ease-in;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 4px;
	}

	.white[data-state="active"] {
		background: #3b82f6;
		transition: background 50ms ease-in;
	}

	.white[data-state="idle"] {
		background: #f0f0f0;
		transition: none;
	}

	/* ── Black keys ── */
	.black {
		left: calc(
			(var(--white-pos) + 0.5) / var(--total-white-keys) * 100% -
				calc(var(--black-key-ratio) / var(--total-white-keys) * 100% / 2)
		);
		width: calc(var(--black-key-ratio) / var(--total-white-keys) * 100%);
		height: 62%;
		background: #1a1a1a;
		border: 1px solid #000;
		border-top: none;
		border-radius: 0 0 3px 3px;
		z-index: 2;
		transition: background 50ms ease-in;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-bottom: 3px;
	}

	.black[data-state="active"] {
		background: #60a5fa;
		transition: background 50ms ease-in;
	}

	.black[data-state="idle"] {
		background: #1a1a1a;
		transition: none;
	}

	/* ── Split marker ── */
	.split {
		border-right: var(--split-border-width) solid var(--split-border-color);
		border-bottom: var(--split-border-width) solid var(--split-border-color);
	}

	/* ── Labels ── */
	.label {
		display: block;
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		color: #aaa;
		pointer-events: none;
		line-height: 1;
	}

	.white .label {
		font-size: 7px;
	}

	.black .label {
		font-size: 6px;
	}

	.piano-key[data-state="active"] .label {
		color: #fff;
	}
</style>
