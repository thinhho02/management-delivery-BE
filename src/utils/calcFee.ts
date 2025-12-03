interface IShipmentZone {
    label: string;
    steps: {
        maxWeight: number;
        price: number;
    }[];
    extraPerHalfKg: number;
    zoneKey: string;
}


export function calculateShippingFee(zone: IShipmentZone, weightKg: number) {
    const step = zone.steps.find(s => weightKg <= s.maxWeight);

    if (step) return step.price;

    // > 2kg
    const index = zone.steps.length - 1
    const base = zone.steps[index]?.price || 0;
    const overWeight = weightKg - 2;
    const blocks = Math.ceil(overWeight / 0.5);

    return base + blocks * zone.extraPerHalfKg;
}