<script lang="ts">
	import WatercolorChord from "$routes/demo/design/chord-viz/WatercolorChord.svelte";
	import {
		CHORD_VIZ_ROWS,
		toneOfRomanToken,
		type KeyTonality,
		type VizChord
	} from "$routes/demo/design/chord-viz/diatonicChords.js";
	import {
		paletteById,
		type ChordPalette
	} from "$routes/demo/design/chord-viz/chordPalettes.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		type WatercolorSettings
	} from "$routes/demo/design/chord-viz/watercolor.js";

	type Props = {
		// roman numeral ("IV", "vii°") or scale degree (1-7)
		chord: string | number;
		tonality?: KeyTonality;
		palette?: ChordPalette;
		settings?: WatercolorSettings;
	};

	let {
		chord,
		tonality = "major",
		palette = paletteById("journey-from-home"),
		settings = DEFAULT_WATERCOLOR_SETTINGS
	}: Props = $props();

	const rowChords = $derived(
		CHORD_VIZ_ROWS.find((row) => row.tonality === tonality)?.chords ?? []
	);

	const vizChord = $derived.by((): VizChord => {
		const diatonic =
			typeof chord === "number"
				? rowChords[chord - 1]
				: rowChords.find((rowChord) => rowChord.roman === chord);
		if (diatonic) return diatonic;
		const roman = String(chord);
		return {
			degree: 0,
			roman,
			tone: toneOfRomanToken(roman),
			tonality,
			seed: 0
		};
	});
</script>

<WatercolorChord chord={vizChord} {settings} {palette} />
