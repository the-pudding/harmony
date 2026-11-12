export const CHORD_PROGRESSION_ISSUES_LABEL = "chordProgressionIssues:";
export const KEY_TONALITY_ISSUES_LABEL = "keyTonalityIssues:";

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
		id: "the-hollies__long-cool-woman-in-a-black-dress",
		chordProgressionIssues:
			"Chords are correct, but since the original UG webpage didn't list a key, it somehow ended up with 'D major' when it should say something like 'E mixolydian' or (in as Adam Neely talked about) it's both in E mixolydian (A major) *and* D major."
	},
	{
		id: "johnny-bristol__hang-on-in-there-baby",
		chordProgressionIssues:
			"Say it's in D major, but looks like it's actually shifted, treating the I as the V."
	},
	{
		id: "george-michael__i-want-your-sex-from-beverly-hills-cop-ii",
		chordProgressionIssues:
			"Song says its in F major, but is really in Bb mixolydian. Further, the chords are just one giant section labeled 'a few tips' lol"
	},
	{
		id: "billie-eilish__lunch",
		chordProgressionIssues:
			"The progression is written as i-iv vamping, but it actually seems to be iv-i vamping (in that order), so the chords are written wrong."
	},
	{
		id: "jagged-edge__where-the-party-at",
		chordProgressionIssues:
			"Chords area way off. This song seems to have a sort of Flamenco vibe to it, with verses flirting a sort of C-C#-Eb, and choruses doing more like a G-Ab-Bb thing."
	},
	{
		id: "the-blackbyrds__walking-in-rhythm",
		chordProgressionIssues:
			"Song is very obviously in Bb with a simple I-ii vamp, then a vi-V-IV section. UG link looks fine. Seems like this something went wrong with the scrape, cuz what we scarped doesn't match the website."
	},
	{
		id: "we-five__you-were-on-my-mind",
		chordProgressionIssues:
			"Chords are correct for the part in the key of E major, but then it modulates to F major when in the song it's actually F# major (so chords are wrong starting about halfway through the song)."
	},
	{
		id: "billie-eilish__therefore-i-am",
		chordProgressionIssues:
			"should be i-V, not I-V. Our own hand correction in hand-corrected-songs.ts writes every section as I-V7 in D minor; the tonic should be lowercase i"
	},
	{
		id: "destiny-s-child__survivor",
		chordProgressionIssues:
			"is not a broody walk down. Data has every section as i-VI-V in E minor, which lands it in that cluster"
	},
	{
		id: "aaliyah__miss-you",
		chordProgressionIssues: "should be IV V I"
	},
	{
		id: "david-guetta__titanium-feat-sia",
		chordProgressionIssues:
			"minor or major key? putting it minor means it doesn't match to royal road"
	},
	{
		id: "deon-jackson__love-makes-the-world-go-round",
		chordProgressionIssues:
			"wrong and missing sections. Data has just one section (a repeated verse with piano solo), I-vi-I-vi in Ab major"
	}
];

export type KeyTonalityIssue = {
	id: string;
	keyTonalityIssues: string;
};

/** Per-section / modulation cases called out after song-level key review (not all low-confidence rows). */
export const keyTonalityIssues: KeyTonalityIssue[] = [
	{
		id: "el-debarge__who-s-johnny-short-circuit-theme",
		keyTonalityIssues:
			"Most sections are Eb major I–IV–ii–V; the chorus modulates to G major. Auto-review missed it (labeled ook=0.48, just below threshold). Needs manual section-level correction."
	},
	{
		id: "sergio-mendes-brasil-66__the-look-of-love",
		keyTonalityIssues:
			"Scrape mixes tonal centers (Dm, Cm, others). Clearest cadences on Dm; mode-shift sections confirmed ambiguous."
	},
	{
		id: "the-honeydrippers__sea-of-love",
		keyTonalityIssues:
			"Song-level review wrongly chose F# mixolydian. Break-4 and chorus-5 corrected to G major via section ledger. Intro/verse sections still carry the wrong song-level label."
	},
	{
		id: "ella-langley__be-her",
		keyTonalityIssues:
			"I think it's actually in a major key (G major), so ii-I instead of i-VII. Data has every section as Am-G in A minor."
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
	},
	{
		id: "alicia-keys__if-i-ain-t-got-you",
		chordMatchingChallenges:
			"Algo struggles to with the passing chords 'ii-iii' and fails to identify the repeating second 'VI-iii-biii-ii-I' even if I explicitly add it as a core progression. Honestly, this might be a song to hand-label the chords of."
	},
	{
		id: "cher__believe",
		chordMatchingChallenges:
			"Overall great matches. Just in verse we match 2 3-chord core progressions (mostly correct), but the second one matches I-iii-IV and just leaves out the final V. I guess this it a 3-chord core progression being preferred over a 4-chord non-core? Is this the right tradeoff?"
	},
	{
		id: "drake__in-my-feelings",
		chordMatchingChallenges:
			"Song is hand-input as repeating IV-iii-IV-iii, but the current algo awkwardly matches it as 2 three-chord patterns: IV-iii-IV and iii-IV-iii. Meanwhile leaving 2 chords unmatched :shrug:"
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

const keyTonalityIssuesBySongId = new Map(
	keyTonalityIssues.map((song) => [song.id, song.keyTonalityIssues])
);

export const getKeyTonalityIssues = (songKey: string): string | undefined =>
	keyTonalityIssuesBySongId.get(songKey);

const chordMatchingChallengesBySongId = new Map(
	trickySongsToMatchCorrectly.map((song) => [
		song.id,
		song.chordMatchingChallenges
	])
);

export const getChordMatchingChallenges = (
	songKey: string
): string | undefined => chordMatchingChallengesBySongId.get(songKey);
