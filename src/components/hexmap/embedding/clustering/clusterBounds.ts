import * as THREE from "three";

export const CLUSTER_COVERAGE_PERCENTILE = 0.9;
export const MIN_CLUSTER_SEMI_AXIS = 1e-4;

export type Point2D = { x: number; y: number };

export type ClusterEllipse2D = {
	centroid: Point2D;
	semiAxisX: number;
	semiAxisY: number;
	rotationRadians: number;
};

export type ClusterEllipsoid3D = {
	centroid: THREE.Vector3;
	semiAxes: THREE.Vector3;
	quaternion: THREE.Quaternion;
};

const percentile = (values: readonly number[], fraction: number): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((first, second) => first - second);
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil(fraction * sorted.length) - 1)
	);
	return sorted[index] ?? 0;
};

const mean2D = (points: readonly Point2D[]): Point2D => {
	const sum = points.reduce(
		(accumulator, point) => ({
			x: accumulator.x + point.x,
			y: accumulator.y + point.y
		}),
		{ x: 0, y: 0 }
	);
	return { x: sum.x / points.length, y: sum.y / points.length };
};

const covariance2D = (
	points: readonly Point2D[],
	centroid: Point2D
): { cxx: number; cxy: number; cyy: number } => {
	if (points.length === 0) return { cxx: 0, cxy: 0, cyy: 0 };
	const totals = points.reduce(
		(accumulator, point) => {
			const dx = point.x - centroid.x;
			const dy = point.y - centroid.y;
			return {
				cxx: accumulator.cxx + dx * dx,
				cxy: accumulator.cxy + dx * dy,
				cyy: accumulator.cyy + dy * dy
			};
		},
		{ cxx: 0, cxy: 0, cyy: 0 }
	);
	const inverseCount = 1 / points.length;
	return {
		cxx: totals.cxx * inverseCount,
		cxy: totals.cxy * inverseCount,
		cyy: totals.cyy * inverseCount
	};
};

const principalAxes2D = (
	cxx: number,
	cxy: number,
	cyy: number
): { primary: Point2D; secondary: Point2D } => {
	const trace = cxx + cyy;
	const determinant = cxx * cyy - cxy * cxy;
	const gap = Math.sqrt(Math.max(0, (trace * trace) / 4 - determinant));
	const primaryEigenvalue = trace / 2 + gap;

	let primaryX = cxy;
	let primaryY = primaryEigenvalue - cxx;
	if (Math.hypot(primaryX, primaryY) < MIN_CLUSTER_SEMI_AXIS) {
		primaryX = cxx >= cyy ? 1 : 0;
		primaryY = cxx >= cyy ? 0 : 1;
	}

	const primaryLength = Math.hypot(primaryX, primaryY) || 1;
	const primary = {
		x: primaryX / primaryLength,
		y: primaryY / primaryLength
	};
	return {
		primary,
		secondary: { x: -primary.y, y: primary.x }
	};
};

const semiAxesAlongAxes2D = (
	points: readonly Point2D[],
	centroid: Point2D,
	primary: Point2D,
	secondary: Point2D,
	padding: number
): { semiAxisX: number; semiAxisY: number } => {
	const primaryExtents: number[] = [];
	const secondaryExtents: number[] = [];

	for (const point of points) {
		const dx = point.x - centroid.x;
		const dy = point.y - centroid.y;
		primaryExtents.push(Math.abs(dx * primary.x + dy * primary.y));
		secondaryExtents.push(Math.abs(dx * secondary.x + dy * secondary.y));
	}

	return {
		semiAxisX:
			Math.max(
				percentile(primaryExtents, CLUSTER_COVERAGE_PERCENTILE),
				MIN_CLUSTER_SEMI_AXIS
			) + padding,
		semiAxisY:
			Math.max(
				percentile(secondaryExtents, CLUSTER_COVERAGE_PERCENTILE),
				MIN_CLUSTER_SEMI_AXIS
			) + padding
	};
};

export const fitClusterEllipse2D = (
	points: readonly Point2D[],
	padding: number
): ClusterEllipse2D | null => {
	if (points.length === 0) return null;

	const centroid = mean2D(points);
	if (points.length === 1) {
		return {
			centroid,
			semiAxisX: padding,
			semiAxisY: padding,
			rotationRadians: 0
		};
	}

	const { cxx, cxy, cyy } = covariance2D(points, centroid);
	const { primary, secondary } = principalAxes2D(cxx, cxy, cyy);
	const { semiAxisX, semiAxisY } = semiAxesAlongAxes2D(
		points,
		centroid,
		primary,
		secondary,
		padding
	);

	return {
		centroid,
		semiAxisX,
		semiAxisY,
		rotationRadians: Math.atan2(primary.y, primary.x)
	};
};

export const pointInsideClusterEllipse2D = (
	point: Point2D,
	ellipse: ClusterEllipse2D
): boolean => {
	const dx = point.x - ellipse.centroid.x;
	const dy = point.y - ellipse.centroid.y;
	const cos = Math.cos(-ellipse.rotationRadians);
	const sin = Math.sin(-ellipse.rotationRadians);
	const localX = dx * cos - dy * sin;
	const localY = dx * sin + dy * cos;
	const normalizedX = localX / ellipse.semiAxisX;
	const normalizedY = localY / ellipse.semiAxisY;
	return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
};

export const clusterEllipseBoundingRadius = (ellipse: ClusterEllipse2D): number => {
	const cos = Math.cos(ellipse.rotationRadians);
	const sin = Math.sin(ellipse.rotationRadians);
	const extentX = Math.hypot(ellipse.semiAxisX * cos, ellipse.semiAxisX * sin);
	const extentY = Math.hypot(ellipse.semiAxisY * -sin, ellipse.semiAxisY * cos);
	return Math.max(extentX, extentY);
};

type Symmetric3x3 = {
	m00: number;
	m01: number;
	m02: number;
	m11: number;
	m12: number;
	m22: number;
};

const covariance3D = (
	positions: readonly THREE.Vector3[],
	centroid: THREE.Vector3
): Symmetric3x3 => {
	if (positions.length === 0) {
		return { m00: 0, m01: 0, m02: 0, m11: 0, m12: 0, m22: 0 };
	}

	const totals = positions.reduce(
		(accumulator, position) => {
			const dx = position.x - centroid.x;
			const dy = position.y - centroid.y;
			const dz = position.z - centroid.z;
			return {
				m00: accumulator.m00 + dx * dx,
				m01: accumulator.m01 + dx * dy,
				m02: accumulator.m02 + dx * dz,
				m11: accumulator.m11 + dy * dy,
				m12: accumulator.m12 + dy * dz,
				m22: accumulator.m22 + dz * dz
			};
		},
		{ m00: 0, m01: 0, m02: 0, m11: 0, m12: 0, m22: 0 }
	);
	const inverseCount = 1 / positions.length;
	return {
		m00: totals.m00 * inverseCount,
		m01: totals.m01 * inverseCount,
		m02: totals.m02 * inverseCount,
		m11: totals.m11 * inverseCount,
		m12: totals.m12 * inverseCount,
		m22: totals.m22 * inverseCount
	};
};

const multiplySymmetric3x3Vector = (
	matrix: Symmetric3x3,
	vector: THREE.Vector3,
	target: THREE.Vector3
): THREE.Vector3 =>
	target.set(
		matrix.m00 * vector.x + matrix.m01 * vector.y + matrix.m02 * vector.z,
		matrix.m01 * vector.x + matrix.m11 * vector.y + matrix.m12 * vector.z,
		matrix.m02 * vector.x + matrix.m12 * vector.y + matrix.m22 * vector.z
	);

const dominantEigenvector3D = (
	matrix: Symmetric3x3,
	seed: THREE.Vector3
): THREE.Vector3 => {
	const vector = seed.clone().normalize();
	const next = new THREE.Vector3();
	for (let iteration = 0; iteration < 24; iteration++) {
		multiplySymmetric3x3Vector(matrix, vector, next);
		const length = next.length();
		if (length < MIN_CLUSTER_SEMI_AXIS) return vector;
		next.divideScalar(length);
		if (next.distanceToSquared(vector) < 1e-10) break;
		vector.copy(next);
	}
	return vector;
};

const deflateSymmetric3x3 = (
	matrix: Symmetric3x3,
	eigenvalue: number,
	eigenvector: THREE.Vector3
): Symmetric3x3 => {
	const { x, y, z } = eigenvector;
	return {
		m00: matrix.m00 - eigenvalue * x * x,
		m01: matrix.m01 - eigenvalue * x * y,
		m02: matrix.m02 - eigenvalue * x * z,
		m11: matrix.m11 - eigenvalue * y * y,
		m12: matrix.m12 - eigenvalue * y * z,
		m22: matrix.m22 - eigenvalue * z * z
	};
};

const rayleighQuotient = (
	matrix: Symmetric3x3,
	vector: THREE.Vector3
): number => {
	const transformed = multiplySymmetric3x3Vector(
		matrix,
		vector,
		new THREE.Vector3()
	);
	return vector.dot(transformed);
};

const orthonormalBasis3D = (
	matrix: Symmetric3x3
): [THREE.Vector3, THREE.Vector3, THREE.Vector3] => {
	const primary = dominantEigenvector3D(matrix, new THREE.Vector3(1, 0, 0));
	const primaryEigenvalue = rayleighQuotient(matrix, primary);
	const deflated = deflateSymmetric3x3(matrix, primaryEigenvalue, primary);

	const secondarySeed = new THREE.Vector3(0, 1, 0);
	if (Math.abs(primary.dot(secondarySeed)) > 0.9) secondarySeed.set(0, 0, 1);
	const secondary = dominantEigenvector3D(deflated, secondarySeed);
	const secondaryEigenvalue = rayleighQuotient(deflated, secondary);
	const twiceDeflated = deflateSymmetric3x3(
		deflated,
		secondaryEigenvalue,
		secondary
	);
	const tertiary = dominantEigenvector3D(
		twiceDeflated,
		new THREE.Vector3(0, 0, 1)
	);

	return [primary, secondary, tertiary];
};

const semiAxesAlongBasis3D = (
	positions: readonly THREE.Vector3[],
	centroid: THREE.Vector3,
	basis: readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3],
	padding: number
): THREE.Vector3 => {
	const axisExtents = [
		[] as number[],
		[] as number[],
		[] as number[]
	] as const;

	for (const position of positions) {
		const offset = position.clone().sub(centroid);
		axisExtents[0].push(Math.abs(offset.dot(basis[0])));
		axisExtents[1].push(Math.abs(offset.dot(basis[1])));
		axisExtents[2].push(Math.abs(offset.dot(basis[2])));
	}

	return new THREE.Vector3(
		Math.max(
			percentile(axisExtents[0], CLUSTER_COVERAGE_PERCENTILE),
			MIN_CLUSTER_SEMI_AXIS
		) + padding,
		Math.max(
			percentile(axisExtents[1], CLUSTER_COVERAGE_PERCENTILE),
			MIN_CLUSTER_SEMI_AXIS
		) + padding,
		Math.max(
			percentile(axisExtents[2], CLUSTER_COVERAGE_PERCENTILE),
			MIN_CLUSTER_SEMI_AXIS
		) + padding
	);
};

export const fitClusterEllipsoid3D = (
	positions: readonly THREE.Vector3[],
	padding: number
): ClusterEllipsoid3D | null => {
	if (positions.length === 0) return null;

	const centroid = positions
		.reduce(
			(sum, position) => sum.add(position),
			new THREE.Vector3(0, 0, 0)
		)
		.divideScalar(positions.length);

	if (positions.length === 1) {
		return {
			centroid,
			semiAxes: new THREE.Vector3(padding, padding, padding),
			quaternion: new THREE.Quaternion()
		};
	}

	const covariance = covariance3D(positions, centroid);
	const basis = orthonormalBasis3D(covariance);
	const semiAxes = semiAxesAlongBasis3D(positions, centroid, basis, padding);
	const rotationMatrix = new THREE.Matrix4().makeBasis(basis[0], basis[1], basis[2]);
	const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);

	return { centroid, semiAxes, quaternion };
};
