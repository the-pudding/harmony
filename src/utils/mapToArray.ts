export default function mapToArray<K, V>(map: Map<K, V>) {
	return Array.from(map, ([key, value]) => ({ key, value }));
}
