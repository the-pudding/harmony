import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
	clusterEllipseBoundingRadius,
	fitClusterEllipse2D,
	fitClusterEllipsoid3D,
	pointInsideClusterEllipse2D,
	type Point2D
} from "./clusterBounds.js";

const lineAlongX = (count: number, spreadY: number): Point2D[] =>
	Array.from({ length: count }, (_, index) => ({
		x: index * 0.02,
		y: (index % 3) * spreadY
	}));

describe("fitClusterEllipse2D", () => {
	it("uses a tighter major axis than a centroid circle on elongated clusters", () => {
		const points = lineAlongX(30, 0.002);
		const ellipse = fitClusterEllipse2D(points, 0);
		expect(ellipse).not.toBeNull();
		if (!ellipse) return;

		const centroidRadius =
			points.reduce(
				(max, point) =>
					Math.max(
						max,
						Math.hypot(
							point.x - ellipse.centroid.x,
							point.y - ellipse.centroid.y
						)
					),
				0
			) + 0;

		expect(ellipse.semiAxisY).toBeLessThan(centroidRadius * 0.35);
		expect(ellipse.semiAxisX).toBeGreaterThan(ellipse.semiAxisY * 2);
	});

	it("keeps most member points inside the fitted ellipse", () => {
		const points = lineAlongX(40, 0.004);
		const ellipse = fitClusterEllipse2D(points, 2);
		expect(ellipse).not.toBeNull();
		if (!ellipse) return;

		const insideCount = points.filter((point) =>
			pointInsideClusterEllipse2D(point, ellipse)
		).length;
		expect(insideCount / points.length).toBeGreaterThanOrEqual(0.85);
	});

	it("exposes a conservative bounding radius for labels", () => {
		const points = lineAlongX(20, 0.003);
		const ellipse = fitClusterEllipse2D(points, 4);
		expect(ellipse).not.toBeNull();
		if (!ellipse) return;

		for (const point of points) {
			const distance = Math.hypot(
				point.x - ellipse.centroid.x,
				point.y - ellipse.centroid.y
			);
			expect(distance).toBeLessThanOrEqual(
				clusterEllipseBoundingRadius(ellipse) + 0.001
			);
		}
	});
});

describe("fitClusterEllipsoid3D", () => {
	it("produces an oriented ellipsoid for elongated 3D clusters", () => {
		const positions = Array.from({ length: 30 }, (_, index) =>
			new THREE.Vector3(index * 0.03, (index % 2) * 0.002, (index % 3) * 0.001)
		);
		const ellipsoid = fitClusterEllipsoid3D(positions, 0.01);
		expect(ellipsoid).not.toBeNull();
		if (!ellipsoid) return;

		expect(ellipsoid.semiAxes.x).toBeGreaterThan(ellipsoid.semiAxes.y * 2);
		expect(ellipsoid.semiAxes.z).toBeLessThan(ellipsoid.semiAxes.x);
	});
});
