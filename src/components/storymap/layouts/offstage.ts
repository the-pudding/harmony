// Every song pushed off the plot, so the map can empty itself behind a slide
// that shows no map and songs fly back in from where they left.
import { umapLayout, type UmapParams } from "./umap.js";
import type { Layout } from "./types.js";

// In plot sizes: far enough that no song is on screen at any home zoom,
// including the uncentered home view, which sits lower on the screen.
export const OFFSTAGE_DISTANCE = 2.5;

const PLOT_CENTER = 0.5;
const MIN_DIRECTION_LENGTH = 1e-6;

export type OffstageParams = UmapParams;

export const offstageLayout: Layout<OffstageParams> = {
	name: "offstage",
	framed: false,
	compute: (context, params) => {
		const { songs } = context;
		const onPlot = umapLayout.compute(context, params);

		// A song in several clusters leaves from the last one's centroid.
		const clusterOf = new Int32Array(songs.count).fill(-1);
		const centroids = songs.clusterMembers.map((members, cluster) => {
			let sumX = 0;
			let sumY = 0;
			let placed = 0;
			for (const index of members) {
				clusterOf[index] = cluster;
				if (Number.isNaN(onPlot.x[index])) continue;
				sumX += onPlot.x[index];
				sumY += onPlot.y[index];
				placed++;
			}
			return placed === 0
				? { x: PLOT_CENTER, y: PLOT_CENTER }
				: { x: sumX / placed, y: sumY / placed };
		});

		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			const songX = onPlot.x[index];
			const songY = onPlot.y[index];
			if (Number.isNaN(songX)) {
				x[index] = NaN;
				y[index] = NaN;
				continue;
			}
			const from =
				clusterOf[index] < 0
					? { x: PLOT_CENTER, y: PLOT_CENTER }
					: centroids[clusterOf[index]];
			let dx = songX - from.x;
			let dy = songY - from.y;
			if (Math.hypot(dx, dy) < MIN_DIRECTION_LENGTH) {
				dx = songX - PLOT_CENTER;
				dy = songY - PLOT_CENTER;
			}
			const length = Math.hypot(dx, dy);
			const [unitX, unitY] =
				length < MIN_DIRECTION_LENGTH ? [1, 0] : [dx / length, dy / length];
			x[index] = songX + unitX * OFFSTAGE_DISTANCE;
			y[index] = songY + unitY * OFFSTAGE_DISTANCE;
		}

		return {
			...onPlot,
			name: "offstage",
			x,
			y,
			aggregate: "none"
		};
	}
};
