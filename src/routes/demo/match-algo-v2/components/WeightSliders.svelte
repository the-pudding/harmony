<script lang="ts">
  import { DEFAULT_WEIGHTS, type MatchWeights } from "../match-algo-v2-logic/weights.js";

  type Props = {
    weights: MatchWeights;
    onchange: (weights: MatchWeights) => void;
  };

  const { weights, onchange }: Props = $props();

  const SLIDERS = [
    { key: "core" as const,            label: "core",   description: "Bonus for matching a named core progression. Higher = prefer known patterns." },
    { key: "length" as const,          label: "length", description: "Weight for the length prior curve (3≈0.95, 4=1.0, 5≈0.35, 6≈0.2). Higher = strongly prefer 3–4 chord loops." },
    { key: "sectionStart" as const,    label: "start",  description: "Prize for a tile that begins at position 0 of the section. Higher = strongly prefer progressions that start sections." },
    { key: "sectionEnd" as const,      label: "end",    description: "Reward for a tile whose run reaches the section boundary. Higher = prefer clean endings (weigh less since last cycle often varies)." },
    { key: "contiguousRepeat" as const, label: "repeat", description: "Reward for contiguous back-to-back repeats (1=0.25, 2=0.75, 3+=1.0). Higher = strongly prefer looping patterns." },
  ] as const;

  let local = $state({ ...weights });

  $effect(() => {
    local = { ...weights };
  });

  const handleInput = (key: keyof MatchWeights, value: number) => {
    local = { ...local, [key]: value };
    onchange({ ...local });
  };

  const reset = () => {
    local = { ...DEFAULT_WEIGHTS };
    onchange({ ...DEFAULT_WEIGHTS });
  };
</script>

<div class="weight-sliders" role="group" aria-label="Algorithm weights">
  {#each SLIDERS as slider (slider.key)}
    <label class="slider-chip">
      <span class="label-wrap">
        <span class="label">{slider.label}</span>
        <span class="info" role="img" aria-label="info">ⓘ</span>
        <span class="tooltip">{slider.description}</span>
      </span>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={local[slider.key]}
        oninput={(e) => handleInput(slider.key, parseFloat(e.currentTarget.value))}
      />
      <span class="value">{local[slider.key].toFixed(1)}</span>
    </label>
  {/each}
  <button class="reset-btn" onclick={reset} type="button">reset</button>
</div>

<style>
  .weight-sliders {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
    padding: 0.25rem 0.5rem;
    border: 1px solid #3f3f46;
    border-radius: 0.375rem;
    background: #111113;
  }

  .slider-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
  }

  .label-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }

  .label {
    font-size: 0.7rem;
    color: #a1a1aa;
  }

  .info {
    font-size: 0.6rem;
    cursor: help;
    color: rgba(165, 180, 252, 0.5);
  }

  .tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1c1c1e;
    color: #d4d4d8;
    border: 1px solid #3f3f46;
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.65rem;
    width: 13rem;
    z-index: 20;
    white-space: normal;
    text-align: center;
    line-height: 1.4;
    pointer-events: none;
  }

  .label-wrap:hover .tooltip {
    display: block;
  }

  .value {
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: rgba(165, 180, 252, 0.95);
  }

  input[type="range"] {
    width: 4rem;
    accent-color: rgba(99, 102, 241, 0.8);
    cursor: pointer;
  }

  .reset-btn {
    margin-left: 0.5rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.6rem;
    font-family: inherit;
    color: #71717a;
    background: transparent;
    border: 1px solid #3f3f46;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .reset-btn:hover {
    color: #e4e4e7;
    border-color: #52525b;
  }
</style>
