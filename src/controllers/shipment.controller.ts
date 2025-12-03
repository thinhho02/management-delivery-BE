import { calculateShippingFee } from "@/utils/calcFee.js";
import catchError from "@/utils/catchError.js";
import { getZone } from "@/utils/getZone.js";
import { getDistanceKm } from "@/utils/turfDistance.js";




export const calculateShipCod = catchError(async (req, res) => {
    const {
        senderProvinceId,
        senderLngLat,      // [lng, lat]
        receiverProvinceId,
        receiverLngLat,    // [lng, lat]
        totalWeight
    } = req.body;

    if (
        !senderProvinceId ||
        !receiverProvinceId ||
        !senderLngLat ||
        !receiverLngLat
    ) {
        return res.status(400).json({
            message: "Missing required fields"
        });
    }
    // 1. Tính khoảng cách (km) bằng Turf.js
    const distanceKm = getDistanceKm(senderLngLat, receiverLngLat);


    // 2. Xác định zone dựa trên tỉnh + khoảng cách
    const zone = getZone(
        senderProvinceId,
        receiverProvinceId,
        distanceKm
    );

    // 3. Tính ship COD theo zone + weight
    const shipFee = calculateShippingFee(zone, totalWeight);

    return res.json({
        success: true,
        zone: zone.zoneKey,
        zoneLabel: zone.label,
        distanceKm: Number(distanceKm.toFixed(2)),
        shipFee
    });
})