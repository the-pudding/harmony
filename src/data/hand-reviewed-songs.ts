export const CHORD_PROGRESSION_ISSUES_LABEL = "chordProgressionIssues:";

export type ProblematicSong = {
	id: string;
	chordProgressionIssues: string;
};

export const problematicSongs: ProblematicSong[] = [
	{
		id: "miley-cyrus__cant-be-tamed",
		chordProgressionIssues: "eg chrous is i-iv but it's actually i-vi-V, etc"
	},
	{
		id: "juice-wrld__wishing-wel",
		chordProgressionIssues:
			"Just has an intro, missing eg main progression: vi-IV-I"
	},
	{
		id: "maroon-5__daylight",
		chordProgressionIssues: "Chorus looks right, missing eg verse"
	},
	{
		id: "lady-gaga__dope",
		chordProgressionIssues: "Just has chorus, eg no verse (iv-iii-VI-V)"
	},
	{
		id: "radiohead__creep",
		chordProgressionIssues:
			"at least the chorus is totally wrong (missed entire harmonic concept)"
	},
	{
		id: "kelly-clarkson__walk-away",
		chordProgressionIssues:
			"at least verse is totally wrong (should be I-bVII-IV)"
	},
	{
		id: "extreme__hole-hearted",
		chordProgressionIssues: "at least chorus is totally wrong"
	},
	{
		id: "bobby-caldwell__what-you-wont-do-for-love",
		chordProgressionIssues:
			"whole song looks way off. should be a dorian-y tune"
	},
	{
		id: "carly-rae-jepsen__call-me-maybe",
		chordProgressionIssues: "whole thing looks wrong, should be IV-vi-V-ish"
	},
	{
		id: "psy__gangnam-style",
		chordProgressionIssues:
			"Nails chords. However, it lists the progression i-iv-v once for the intro and verse, when in fact its played thrice betwixt them. I updated our algo to catch that."
	},
	{
		id: "miley-cyrus__7-things",
		chordProgressionIssues:
			"looks good overall, except the 'chorus lead out' section matches HT website with the first 3 chords, but then adds a ton of extra chords after in our dataset"
	},
	// POST MICHELLE UPDATING TO JUST TOP 10 (and choosing most complete song from UG vs HT)
	{
		id: "whitney-houston__exhale-shoop-shoop-from-waiting-to-exhale",
		chordProgressionIssues:
			"blatantly wrong, the actual chords are more like iv-V-IV-I"
	},
	{
		id: "akon-featuring-eminem__smack-that",
		chordProgressionIssues:
			"blatantly wrong. it's actually in F minor, more like iv-i etc"
	},
	{
		id: "duran-duran__new-moon-on-monday",
		chordProgressionIssues:
			"only has chorus (also, I feels it's wrong, should be I-II-vi-IV)"
	},
	{
		id: "drake__hotline-bling",
		chordProgressionIssues:
			"blatantly wrong. pretty much all of it except for the bridge is just Gm-Am repeating"
	}
];

export const songLooksGoodAsIs: string[] = [
	"luke-combs__beer-never-broke-my-heart",
	"beyonce__if-i-were-a-boy",
	"katy-perry__roar",
	"billie-eilish__bad-guy"
];

export const LOOKS_GOOD_LABEL = "looks good as is";
export const LOOKS_GOOD_EMOJI = "🔵";

export type TrickySongToMatchCorrectly = {
	id: string;
	chordMatchingChallenges: string;
};

export const trickySongsToMatchCorrectly: TrickySongToMatchCorrectly[] = [
	{
		id: "justin-bieber__love-yourself",
		chordMatchingChallenges:
			"In the chorus, 'you should go and love yourself' progression ends on a chord (I) and then the next progression starts on that chord (I), but it's written just once and the algo isn't allowed to share a chord across multiple chord progression matches, even a musician would think about it as two (I) chords (ending and starting)."
	},
	{
		id: "bruno-mars__treasure",
		chordMatchingChallenges:
			"We're matching a lot, but largely hitting 3 chord core progressions and missing the actual 4 chord progressions that exist (but aren't core progressions)"
	},
	{
		id: "feist__1234",
		chordMatchingChallenges:
			"Here, we're trying to capture the essence of that iconic sort of 'tonic walks down in half-ish steps' feeling"
	}
];

export const CHORD_MATCHING_CHALLENGES_LABEL = "chordMatchingChallenges:";
export const TRICKY_TO_MATCH_EMOJI = "🟡";

const chordProgressionIssuesBySongId = new Map(
	problematicSongs.map((song) => [song.id, song.chordProgressionIssues])
);

export const getChordProgressionIssues = (
	songKey: string
): string | undefined => chordProgressionIssuesBySongId.get(songKey);

const looksGoodSongIds = new Set(songLooksGoodAsIs);

export const isSongLooksGoodAsIs = (songKey: string): boolean =>
	looksGoodSongIds.has(songKey);

const chordMatchingChallengesBySongId = new Map(
	trickySongsToMatchCorrectly.map((song) => [
		song.id,
		song.chordMatchingChallenges
	])
);

export const getChordMatchingChallenges = (
	songKey: string
): string | undefined => chordMatchingChallengesBySongId.get(songKey);
