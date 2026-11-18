## Methods

This is how we went from Billboard charts to the map: which songs we used, where their chords came from, how we decided which chord progressions each song uses, and how we placed and grouped songs on the map.

### The songs

We started with every song that reached the top 20 of the Billboard Hot 100 between 1958 and 2026, using a public archive of the weekly charts ([Kaggle](https://www.kaggle.com/datasets/ludmin/billboard)). That's 8,580 songs.

For each song we looked for chords on two sites where musicians post them: [HookTheory](https://www.hooktheory.com) and [Ultimate Guitar](https://www.ultimate-guitar.com). We searched both for every song. When both had it, we kept the version that split the song into more distinct sections (verse, chorus, bridge and so on). On Ultimate Guitar, where a song often has several versions, we ranked them by how well the title and artist matched, combined with how many people had voted for and rated each version. We only used chord charts, not guitar tablature.

We found usable chords for 7,272 songs (85%). After removing a dozen duplicates, that left **7,260 songs**: 6,367 from Ultimate Guitar and 893 from HookTheory.

Each song gets two numbers from the charts:

- **Year:** the week it reached its highest position.
- **Popularity:** every week a song spends on the Hot 100 earns it points, 100 for the No. 1 spot down to 1 for No. 100, and its popularity is the total. A song that sat near the top for months scores far higher than a one-week hit.

### The chords

A chord chart lists a song's chords section by section. To compare songs written in different keys, we rewrote every chord by its position in the key, using Roman numerals. In C major, C is I, F is IV, G is V and A minor is vi; in G major, the same pattern is G, C, D and E minor. Uppercase numerals are major chords and lowercase are minor. So two songs that use the same pattern in different keys look identical to us.

Each section has its own key and scale, because songs often change key or move between major and minor. Along the way:

- When a chord repeats back to back (C, C, F), we counted it once (C, F). Charts often repeat a chord to show how long it lasts, and we were interested in the order of chords, not their timing.
- We dropped chords of types we couldn't read, and sections left with no chords.

**Checking keys.** A wrong key makes every Roman numeral in a song wrong, and chord sites don't always label keys correctly. So we built a statistical model of which chords tend to appear in which keys, trained on the songs themselves, and used it to flag songs whose labeled key fit their chords noticeably worse than another key did. That flagged 974 of the 7,260 songs. Each flagged song was reviewed against its chords (and, where needed, other sources) by an AI model following written instructions, and 627 keys were corrected. A second pass did the same for individual sections, to catch songs that change key partway through: 3,507 sections were reviewed and 563 corrected.

**Fixing songs by hand.** For 24 songs whose charts were wrong in ways the checks above couldn't fix, we entered the chords by hand.

### Naming progressions

We wrote a list of **74 named chord progressions**, the familiar patterns songwriters reach for again and again. Each one is a short loop written in Roman numerals: for example, "axis of awesome" is I–V–vi–IV and "doo wop" is I–vi–IV–V. Most are four chords long, a few are three, five or six. Each is either major or minor, and they're grouped into four families: happy, major-y progressions (with the axis of awesome family nested inside them), minor-y progressions, and jazzy progressions.

The names are ours. Some are standard terms, like the jazz ii–V–I. Others we named after a well-known song that uses the progression.

### Matching songs to progressions

We looked for progressions one section at a time, reading each section from its first chord to its last.

At each point in a section, we listed every progression that could start there:

- **Any run of 3 to 6 chords starting there,** unless it just repeats a shorter pattern (I–V–I–V is I–V twice). This is how we find patterns we didn't name.
- **Named progressions that do repeat a shorter pattern,** like I–V–I–V, which the first rule skips so it doesn't count two chords simply alternating as a progression unless we named it.

We gave each candidate a score and kept the highest. The score adds up five things:

1. **Named progression** (worth 0.8): a bonus when the candidate is one of our 74 named progressions.
2. **Length** (worth up to 1.0): four chords scores best (1.0), three almost as well (0.95), five and six much less (0.35 and 0.2). This keeps us from picking long, one-off runs.
3. **Starting the section** (worth up to 1.0): full credit when the candidate starts on the section's first chord, 0.4 when it starts on the second (a one-chord lead-in), and 0.1 anywhere else.
4. **Ending the section** (worth up to 0.5): full credit when its repeats run right to the end of the section, a little less when the section ends partway through one more repeat, and little otherwise.
5. **Repeating** (worth up to 1.0): progressions that loop score higher. A candidate that appears once scores 0.25, twice in a row 0.75, and three or more times in a row the full 1.0.

Then we jumped past the chords the winner covered and repeated the process from the next chord, until the section ran out. This reads each section once, left to right, rather than searching every possible way of dividing it up.

**What counts as the same progression.** Two progressions match when their chords move by the same distances, which makes the key irrelevant, and when their chords have the same quality:

- Extra notes don't matter. A seventh or an added note, as in Cmaj7, G7 or Cadd9, is treated as the plain chord, and a suspended chord counts as major. This keeps simple and fancier versions of a progression together.
- Where a named progression spells out a particular extended chord, the song has to use that chord too.
- Bass notes under a chord (C/G) are ignored.
- A named progression has to start on the chord it's written with. I–V–vi–IV has to start on the I, so a section going IV–I–V–vi doesn't count as that progression rotated. One named progression, "jazz changes (dominant-y)", may start anywhere.

**Coverage.** For each song, a progression's coverage is the share of all the chords in the song, across every section, that it accounts for. Sections are counted as often as the chart writes them out, so a chorus that appears three times counts three times. A song where one progression accounts for most of the chords has high coverage of that progression. Runs we found that aren't one of our named progressions are named by their Roman numerals, like "I–V–I–IV".

Across all 7,260 songs, the progressions we found account for 92% of chords on average. Our 74 named progressions account for 31% on average; 5,364 songs use at least one of them.

**A song's main progression and purity.** A song's main progression is the one covering the most of it. Its purity is how much of everything we matched in the song that main progression makes up. A song that's one progression from start to finish has a purity near 100%. A song that mixes many has a low one.

### Placing songs on the map

Each dot on the map is a song, placed near the songs whose mix of progressions is most like its own.

**Describing each song.** We described every song as a list of numbers, one per progression, each being that progression's coverage in the song. The list includes all 74 named progressions, plus the 1,754 unnamed ones found in at least four songs. Rarer ones would only add noise. Each list is then scaled to the same overall size, so a song's mix matters, not how many chords it has.

**Comparing songs.** Two songs are similar when the same progressions make up similar parts of them. We measured that with cosine similarity: it's 1 when two songs have the same mix and 0 when they share no progressions.

**Laying out the map.** We used a method called UMAP (Uniform Manifold Approximation and Projection) to turn those comparisons into positions on a flat map. UMAP finds each song's 15 most similar songs and arranges all of them so that those neighbors end up close together. It doesn't place progressions at fixed spots: where things land comes entirely from which songs resemble which. Distances between nearby songs are meaningful; the distance between two faraway regions mostly isn't. The settings we used: 15 neighbors, a minimum spacing of 0.05, a spread of 1.2, and a fixed random seed. We used the umap-js library.

UMAP is sensitive to tiny numerical differences: the same data gives a different layout on different versions of the software running it. So we build the map once, with a fixed version of every tool, and everyone sees that same map.

### Finding clusters

A cluster is a dense group of songs that mostly share one main progression. We found them in three steps.

**1. Find dense groups.** We used a method called DBSCAN, which looks only at where dots are. We picked a small radius, based on the typical distance between neighboring songs. A song with at least 15 songs inside that radius, counting itself, anchors a group, and anchors within reach of each other chain together, pulling in the songs around them. Songs that aren't near any anchor stay out. Groups of more than 300 songs are dropped, since they're usually crowded areas where many different songs blur together.

**2. Keep groups that agree on a progression.** Each song in a group votes for its main progression. A group becomes a cluster only when:

- its top progression gets at least 25% of the votes if it's one of our named progressions, or 30% if it's an unnamed one, which we hold to a higher bar since we hadn't picked them out ourselves; and
- the top progression gets at least 1.5 times as many votes as the runner-up. When two progressions are close to tied, the songs are mixing both and no single progression leads, so we leave the group out.

**3. Name and tidy them.**

- Each cluster is named after its top progression.
- Clusters with the same name that nearly touch are merged into one.
- When the same progression forms clusters in different parts of the map, only the largest is labeled; the others are colored but not labeled.
- Finally, a song left out of every cluster joins the nearest cluster built on its own main progression if it's within twice the radius from step 1 of one of that cluster's songs. Each song that joins can bring in others near it. This catches songs that clearly belong to a progression but sit just past the edge of its densest part.

The result is **91 clusters** holding 68% of the songs. The rest are gray.

### Drawing the map

Zoomed out, the map is drawn as hexagons. Each hexagon takes the color of the cluster holding at least half of its songs; otherwise it's gray. Each cluster has its own color, and clusters built on the same progression share one.

Zoomed in, the hexagons become dots, and within each cluster we rearrange them: the purest songs move to the middle and the most mixed to the edge. A song's distance from the center reflects how its purity ranks within the cluster, while its direction from the center stays where UMAP put it, so a mixed song still leans toward whatever else it plays. Songs at 90% purity or more would otherwise pile into one spot, so they're spread evenly around the middle. Songs outside every cluster stay where UMAP put them.

When you explore a cluster, songs outside it that have at least 40% of its progression light up in its color too, so you can see everywhere a progression shows up, not only inside the outline.

### What to keep in mind

- **The charts come from fans.** Chord charts on these sites are written by users. They're often simplified, sometimes wrong, and reflect one person's take on a recording. We corrected what we could find, but errors remain.
- **The songs are hits.** Only songs that reached the top 20 are included, and 15% of those are missing because we couldn't find their chords.
- **Some songs appear twice.** A handful of songs are in the data twice, for example an original and its re-recording, or the same single credited to different artists, and some were matched to the wrong song's chords. They show up as separate dots.
- **The named progressions are our choice.** A different list would change which songs count as using a "named" progression and how clusters are named. Unnamed progressions still shape the map, since they're part of every song's description.
- **Matching is a reading, not a ruling.** Our matching reads each section left to right and takes the best-scoring progression at each step. It's designed to find the loops a listener would hear, but a song can often be described more than one way.
- **The map is one view.** Positions come from one layout method with one set of settings, and clusters depend on the thresholds above. Nearby songs really are similar; where whole regions sit relative to each other means much less.
