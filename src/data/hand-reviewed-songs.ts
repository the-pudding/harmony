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
		id: "bobby-caldwell__what-you-wont-do-for-love",
		chordProgressionIssues:
			"whole song looks way off. should be a dorian-y tune"
	},
	{
		id: "carly-rae-jepsen__call-me-maybe",
		chordProgressionIssues: "not happy with the chorus, should be IV-vi-V-ish"
	},
	{
		id: "psy__gangnam-style",
		chordProgressionIssues:
			"Nails chords. However, it lists the progression i-iv-v once for the intro and verse, when in fact its played thrice betwixt them. I updated our algo to catch that."
		// so... just wrong-ish? fine?
	},
	{
		id: "miley-cyrus__7-things",
		chordProgressionIssues:
			"looks good overall, except the 'chorus lead out' section matches HT website with the first 3 chords, but then adds a ton of extra chords after in our dataset"
	},
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
	},
	{
		id: "billy-joel__a-matter-of-trust",
		chordProgressionIssues:
			"First, it's all one giant (wrong) section. Next, the main chord progression should be I-vi-I-vi-iii-V"
	},
	{
		id: "connie-francis__many-tears-ago",
		chordProgressionIssues:
			"Chords are correct, but since the original UG webpage didn't list a key, it somehow ended up with 'D major' when it should say 'G major'."
	}
];

export type TrickySongToMatchCorrectly = {
	id: string;
	chordMatchingChallenges: string;
};

export const trickySongsToMatchCorrectly: TrickySongToMatchCorrectly[] = [
	// PRE V2 ALGO (all issues were flagged based on v1, I've yet to fully review and update it now that we use v2, TODO: do so)
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
	},
	{
		id: "passenger__let-her-go",
		chordMatchingChallenges:
			"Overall, great matching. However, this is the classic 'chose a 3 chord match when a 4 chord match is available' challenge. This is extra tricky because the song genuinely DOES use a 3 chord progression, as well as the 4 chord superset of it: vi-IV-V(-iii). This fails because the algorithm has no notion of 'sharing' some chords with one progression and the rest with others, it greedily takes all or none. The conflict here is about choosing chords to maximize within a section vs globally across the song"
	},
	{
		id: "the-main-ingredient__just-don-t-want-to-be-lonely",
		chordMatchingChallenges:
			"The real progression of this song is I-vi-ii-V repeating, but the algo can find slightly more instances of vi-ii-V-I (conveniently, those are both variants of the same single core progression currently)"
	},
	{
		id: "paper-lace__the-night-chicago-died",
		chordMatchingChallenges:
			"The chord progression is really 'I-ii-V-I' repeating, but it's notated (and then the algo finds) 'ii-V-I'. Which is probably acceptable, if not exactly how a musician would think about it."
	},
	{
		id: "sia__chandelier",
		chordMatchingChallenges:
			"Is really (in a major key) IV-V-I/3rd-IV ie Gb-Ab-Db/F-Gb. But is notated as just IV-V-I repeating, which is technically correct but not how a musician would think about it."
	},
	{
		id: "natasha-bedingfield__pocketful-of-sunshine",
		chordMatchingChallenges:
			"Tricky because there are genuinely occurances of 'i-VII-VI' in the outro, but that gets applied to the intro and verses, too, which are in fact the fuller 'i-VII-VI-iv'. The aglo isn't sophisticated to intelligently match both, so it goes with the shorter one (i-VII-VI) which technically covers more chords in total. All that said, practically speaking, i-VII-VI is actually a decent match for i-VII-VI-iv, given the longer one really just adds a bit of dark color turnaround chord at the end, but otherwise feels the same."
	},
	{
		id: "stevie-wonder__superstition",
		chordMatchingChallenges:
			"The chords are basically right, the whole song is really just a vamp on Ebm7, or just Eb funk, and after a long time it hits the V7 as a turnaround. So, you could say there's not real 'progression', just a funk vamp."
	},
	// POST V2 ALGO:
	{
		id: "plain-white-t-s__hey-there-delilah",
		chordMatchingChallenges:
			"Several issues, all stemming from it over eagerly trying to fill every gap, and matching on passing chords and missing the actual progression. Verse: gets I-iii-I-iii the first time it appears (opens section, easy to match), but misses it the second time it appears cuz it's tripped up trying to neatly pack away section in between. Chorus: gets I-vi-I-vi the first time, tips up on the lone passing V chord, misses the second I-vi-I-vi."
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

const chordMatchingChallengesBySongId = new Map(
	trickySongsToMatchCorrectly.map((song) => [
		song.id,
		song.chordMatchingChallenges
	])
);

export const getChordMatchingChallenges = (
	songKey: string
): string | undefined => chordMatchingChallengesBySongId.get(songKey);
