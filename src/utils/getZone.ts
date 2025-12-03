import { SHIPPING_ZONES } from "./shippingRate.js";

export function getZone(senderProvinceId: string, receiverProvinceId: string, distanceKm: number) {
  // Nội tỉnh
  if (senderProvinceId.toString() === receiverProvinceId.toString()) {
    return { zoneKey: "A", ...SHIPPING_ZONES.A };
  }

  // Ngoại tỉnh
  if (distanceKm < 100) return { zoneKey: "B", ...SHIPPING_ZONES.B };
  if (distanceKm <= 300) return { zoneKey: "C", ...SHIPPING_ZONES.C };

  return { zoneKey: "D", ...SHIPPING_ZONES.D };
}