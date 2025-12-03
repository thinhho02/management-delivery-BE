import { distance, point } from "@turf/turf";

export function getDistanceKm(coord1: [number], coord2: [number]) {
    const from = point(coord1);
    const to = point(coord2);

    // Turf trả về mặc định là km
    const dist = distance(from, to, { units: "kilometers" });

    return dist;
}