# Map sync check (for Michelle's agent)

David and Michelle's machines were building different maps from the same commit. This file explains why and gives the steps to confirm your build now matches his exactly. Please run the steps and report the results to Michelle (and David).

## What went wrong

1. **Node version (main cause).** The map layout (UMAP) depends on the Node major version. With the same code and the same `songs.json`, it gave 76 clusters on Node 20, 79 on Node 22 and 80 on Node 26. Song matches were identical across versions; only positions and clusters differed. David had built the committed map on Node 20. Michelle uses Node 26, so she could never reproduce it.
2. **Hand-edited `hexmap.json`.** Cluster renames ("my boo", "halo", "paradise") were patched into `hexmap.json` instead of rebuilding. "paradise" added a new progression (`ii-IV-I-V`), so the committed file was also out of date with the code.

## What changed in the commit that added this file

- Node is pinned to **v26.0.0** (`.node-version`, new `.nvmrc`, `engines` in `package.json`). `tasks/build-hexmap.ts` refuses to run on any other major version.
- `hexmap.json` now records `inputsHash`, a fingerprint of the core progressions, the matching weights and the corrected songs, plus `nodeVersion`. A new test in `src/data/hexMapSnapshot.test.ts` fails if `hexmap.json` is out of date or was edited by hand.
- `hexmap.json` was rebuilt on Node 26.0.0 with `npm run songs`. The charts CSVs came out unchanged.

## Steps

1. **Protect local work first.** Commit or stash any uncommitted changes in `harmony` and `harmony-data` before pulling.
2. **Pull both repos.** Run `git pull` in `harmony-data` and in `harmony`.
   - If `static/data/hexmap.json` conflicts, don't merge it by hand: take the version from origin, finish the merge, and step 5 rebuilds it anyway.
   - If your local commits changed `core-progressions.ts` or corrections, step 5 will produce a different `hexmap.json`. That's expected: commit the rebuilt file.
3. **Check versions:**
   - `node -v` should print `v26.0.0`. Run `nvm use` (or your version manager's equivalent) in `harmony` if it doesn't.
   - `git -C ../harmony-data rev-parse --short HEAD` should print `b0029ff1`.
4. **Before rebuilding,** run `npm run test` in `harmony`. Everything should pass (81 files, 692 tests at the time of writing).
5. **Rebuild:** run `npm run songs` in `harmony` (it takes about 5 minutes and also runs `hexmap` and `charts`).
6. **Compare with David's build:**

   | Check | Expected |
   |---|---|
   | `md5 -q static/data/songs.json` | `fb3e0df0cb0716f906ccc90ac5f46ec4` |
   | `md5 -q static/data/hexmap.json` | `04de369722f6bc3cb69ef296b24bdb2c` |
   | `hexmap` output | `7260 songs, 13616 progressions`, `80 clusters` |
   | `inputsHash` in `hexmap.json` | `755c9254cda88d80` |
   | `git status` | no changes to `static/data/hexmap.json` or `src/data/charts/` |

   These values hold only if neither repo has local changes. If there are some, compare against a clean checkout of the commit that added this file, or report the differences.

## Report back

- Node version and harmony-data commit.
- Each value in the table: matches or not, and the actual value if not.
- Any test failures, with their output.
- Any local changes that were stashed or committed before pulling.

## Things that may need Michelle's decision

On the rebuilt map, some clusters referenced in `src/data/synced-songs/reference.csv` don't exist:

- **`halo`** (beyonce__halo, chappell-roan__pink-pony-club, morgan-wallen__more-than-my-hometown, rihanna__stay, taylor-swift__my-tears-ricochet). The halo progression no longer forms its own cluster. Of the old cluster's 23 songs, 16 are now unclustered and 7 are in "call me by your (flamenco) name".
- **`viva la vida`** (coldplay__viva-la-vida, julia-michaels__issues, chappell-roan__good-luck-babe, taylor-swift__you-re-on-your-own-kid). It no longer forms a cluster; all 21 of the old cluster's songs are unclustered.
- **`ii-IV-I-V`** (katy-perry__wide-awake, taylor-swift__you-belong-with-me, jelly-roll__need-a-favor). These rows were already stale before this rebuild: that cluster is called **`paradise`** in both the old and new maps, and these songs are in it. They probably just need renaming to `paradise`.

The renames in `core-progressions.ts` are kept; "my boo" and "paradise" still name clusters. Michelle can decide whether to reassign the affected songs, adjust the progressions, or accept the new clusters.

## Going forward

- Never edit `hexmap.json` by hand. Change `core-progressions.ts` (or the corrections), run `npm run hexmap` on Node 26, and commit the rebuilt `hexmap.json` in the same commit.
- `npm run test` catches a `hexmap.json` that is out of date or was edited by hand.
