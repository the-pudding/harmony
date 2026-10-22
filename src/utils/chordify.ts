import { mount, unmount } from "svelte";
import type { Attachment } from "svelte/attachments";
import Chord from "$components/Chord.svelte";

// roman numeral w/ optional accidental, quality, extension, or secondary (e.g. bVII, ii7, vii°, V/V)
const romanRe =
	/^[b#♭♯]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:[°ø+]|maj|dim|aug|sus|add|\d|\/[^\s-]+)*$/;

// replaces span.chord ("IV") and span.chords ("I-V-vi-IV") text w/ watercolor chords
export const chordify: Attachment<HTMLElement> = (node) => {
	const instances: ReturnType<typeof mount>[] = [];

	const fill = (el: HTMLElement, romans: string[]) => {
		el.textContent = "";
		romans.forEach((roman) => {
			instances.push(mount(Chord, { target: el, props: { chord: roman } }));
		});
	};

	node
		.querySelectorAll<HTMLElement>("span.chord:not([data-chord])")
		.forEach((el) => {
			const roman = el.textContent?.trim() ?? "";
			if (!romanRe.test(roman)) return;
			el.dataset.chord = roman;
			fill(el, [roman]);
		});

	node
		.querySelectorAll<HTMLElement>("span.chords:not([data-chords])")
		.forEach((el) => {
			const romans = (el.textContent ?? "").split("-").map((d) => d.trim());
			if (!romans.every((d) => romanRe.test(d))) return;
			el.dataset.chords = romans.join("-");
			fill(el, romans);
		});

	return () => instances.forEach((instance) => unmount(instance));
};
