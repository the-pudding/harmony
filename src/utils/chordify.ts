import { mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";
import Chord from "$components/Chord.svelte";
import Motif from "$components/motifs/Motif.svelte";
import { isMotifName } from "$components/motifs/motifs";
import type { KeyTonality } from "$routes/demo/design/chord-viz/diatonicChords.js";

// roman numeral w/ optional accidental, quality, extension, or secondary (e.g. bVII, ii7, vii°, V/V)
export const romanRe =
	/^[b#♭♯]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:[°ø+]|maj|dim|aug|sus|add|\d|\/[^\s-]+)*$/;

// the svg chords allow line breaks beside them, so punctuation touching a
// chord span, like "(" and ")", gets wrapped w/ it in a span.chord-glue
const glue = (el: HTMLElement) => {
	const before = el.previousSibling;
	const after = el.nextSibling;
	const leading =
		before?.nodeType === Node.TEXT_NODE
			? (before.textContent?.match(/\S+$/)?.[0] ?? "")
			: "";
	const trailing =
		after?.nodeType === Node.TEXT_NODE
			? (after.textContent?.match(/^\S+/)?.[0] ?? "")
			: "";
	if (!leading && !trailing) return;

	const wrapper = document.createElement("span");
	wrapper.className = "chord-glue";
	el.replaceWith(wrapper);
	if (leading) {
		(before as Text).splitText(before!.textContent!.length - leading.length);
		wrapper.append(wrapper.previousSibling!);
	}
	wrapper.append(el);
	if (trailing) {
		(after as Text).splitText(trailing.length);
		wrapper.append(wrapper.nextSibling!);
	}
};

// replaces span.chord ("IV") and span.chords ("I-V-vi-IV") text w/ watercolor chords
// add data-tonality="minor" to a span for the minor palette (default major)
export const chordify: Attachment<HTMLElement> = (node) => {
	const instances: ReturnType<typeof mount>[] = [];

	const fill = (el: HTMLElement, romans: string[]) => {
		const tonality: KeyTonality =
			el.dataset.tonality === "minor" ? "minor" : "major";
		el.textContent = "";
		romans.forEach((roman) => {
			instances.push(
				mount(Chord, { target: el, props: { chord: roman, tonality } })
			);
		});
	};

	node
		.querySelectorAll<HTMLElement>("span.chord:not([data-chord])")
		.forEach((el) => {
			const roman = el.textContent?.trim() ?? "";
			if (!romanRe.test(roman)) return;
			el.dataset.chord = roman;
			fill(el, [roman]);
			glue(el);
		});

	node
		.querySelectorAll<HTMLElement>("span.chords:not([data-chords])")
		.forEach((el) => {
			const romans = (el.textContent ?? "").split("-").map((d) => d.trim());
			if (!romans.every((d) => romanRe.test(d))) return;
			el.dataset.chords = romans.join("-");
			fill(el, romans);
			glue(el);
		});

	// span.motif ("loop") becomes the matching animated icon (see motifs/)
	node
		.querySelectorAll<HTMLElement>("span.motif:not([data-motif])")
		.forEach((el) => {
			const name = el.textContent?.trim() ?? "";
			if (!isMotifName(name)) return;
			el.dataset.motif = name;
			el.textContent = "";
			instances.push(mount(Motif, { target: el, props: { name } }));
		});

	return () => instances.forEach((instance) => unmount(instance));
};
