// The recorded songs Signatures.svelte plays for each decade's signature
// progression, keyed by decade label as in src/data/charts
// ({decade}_{slug}_by_year.csv). Each song needs synced chords in
// src/data/synced-songs/{songKey}.json; its clip is its reference.csv
// region unless startSeconds/endSeconds are given here.
//
// `progression` is the signature these were picked for. If build-charts
// picks a different signature for that decade, the songs no longer apply
// and the play button does nothing until this list is updated.
//
// A decade with no songs (or no entry) has a play button that does nothing.
// Songs play in order.

export type SignatureSong = {
	songKey: string;
	startSeconds?: number;
	endSeconds?: number;
};

export type SignatureSongs = {
	progression: string;
	songs: SignatureSong[];
};

export const signatureSongs: Record<string, SignatureSongs> = {
	"1950s-60s": {
		progression: "doo wop",
		songs: [{ songKey: "ben-e-king__stand-by-me" }]
	},
	// No recorded song is built on it yet.
	"1970s": { progression: "ii-V vamp", songs: [] },
	"1980s": { progression: "royal road", songs: [] },
	"1990s": { progression: "dorian build up", songs: [] },
	"2000s": {
		progression: "axis of awesome",
		songs: [{ songKey: "alicia-keys__no-one" }]
	},
	// The recorded "we found love" songs (i VI III VII) contain this, but
	// none is built on it.
	"2010s": { progression: "stay with me", songs: [] },
	"2020s": {
		progression: "halo",
		songs: [{ songKey: "taylor-swift__my-tears-ricochet" }]
	}
};
