import Province from "@/models/province.js";
import ShipperZone from "@/models/shipperZone.js";
import Ward from "@/models/ward.js";
import { ZoneSchemaZod } from "@/types/zoneType.js";
import catchError from "@/utils/catchError.js";
import generateSlug from "@/utils/generateSlug.js";
import { fs } from "memfs";
import type { AnyBulkWriteOperation } from "mongoose";


export const getListWard = catchError(async (req, res) => {
    const wards = await Ward.find().select('_id code name provinceId geometry').populate("provinceId", "code name -_id").sort({ name: 1 }).lean()

    return res.status(200).json(wards)
})

export const getListWardNoGeo = catchError(async (req, res) => {
    const wards = await Ward.find().select('_id code name provinceId').populate("provinceId", "code name -_id").sort({ name: 1 }).lean()

    return res.status(200).json(wards)
})


export const getWardById = catchError(async (req, res) => {
    const { zoneId } = req.params

    const ward = await Ward.findById(zoneId).select("_id code name geometry").lean()

    if (!ward) {
        return res.status(400).json({ message: "Khu vực hoạt động không tồn tại" })
    }

    return res.status(200).json(ward)
})


export const getListWardByProvince = catchError(async (req, res) => {
    const { provinceId } = req.params

    if (!provinceId) {
        return res.status(400).json({ message: "Invalida Code or not exist" })
    }
    const wardInProvince = await Ward.find({ provinceId }).select('_id code name').sort({ name: 1 }).lean()

    return res.status(200).json(wardInProvince)
})

export const getListWardByCode = catchError(async (req, res) => {
    const zonePick = ZoneSchemaZod.pick({ code: true })
    const { code } = zonePick.parse(req.body)
    const ward = await Ward.findOne({ code }).select('_id code name provinceId').lean()
    if (!ward || !ward._id) {
        return res.status(400).json({ message: "Invalida Code or not exist" })
    }
    const shipperZoneInWard = await ShipperZone.find({ wardId: ward._id }).select('_id code name wardId geometry').sort({ name: 1 }).lean()

    return res.status(200).json({
        ...ward,
        shipeerZones: shipperZoneInWard
    })
})

export const createWard = catchError(async (req, res) => {
    // Validate body + file
    const zonePick = ZoneSchemaZod.pick({ zone: true })
    const { zone } = zonePick.parse(req.body);
    const file = req.file;

    if (!file)
        return res.status(400).json({ message: "Missing GeoJSON file" });

    if (file.size > 5000000)
        return res.status(400).json({ message: "File too large (max 5MB)" });

    // Đọc GeoJSON
    const filePath = `/${file.originalname}`;
    fs.writeFileSync(filePath, file.buffer)
    const raw = fs.readFileSync(filePath, { encoding: "utf8" }) as string;
    const json = JSON.parse(raw);

    if (json.type !== "FeatureCollection")
        return res.status(400).json({ message: "Invalid GeoJSON, type must be FeatureCollection" });
    if (!Array.isArray(json.features) || json.features.length === 0)
        return res.status(400).json({ message: "Invalid GeoJSON, missing Features" })

    const invalidFeature = json.features.find((f: any) => !f?.properties || !f.properties?.ma_tinh || !f.properties?.ma_xa || !f.geometry);
    if (invalidFeature)
        return res.status(400).json({ message: "Invalid GeoJSON: each feature must have properties.ma_tinh and properties.ma_xa and geometry" })




    const provinceCodes: string[] = Array.from(
        new Set<string>(json.features.map((f: any) => String(f.properties.ma_tinh)))
    );
    const provinces = await Province.find({ code: { $in: provinceCodes } })
        .select({ _id: 1, code: 1 })
        .lean();

    const provinceMap = new Map<string, string>();
    for (const p of provinces) provinceMap.set(String(p.code), String(p._id));

    // Build bulk ops
    const ops: AnyBulkWriteOperation[] = [];

    for (const f of json.features as any[]) {
        const ma_xa = String(f.properties.ma_xa);
        const ten_xa = String(f.properties.ten_xa ?? f.properties.name ?? "");
        const ma_tinh = String(f.properties.ma_tinh);
        const provinceId = provinceMap.get(ma_tinh) ?? null;

        // Tạo slug nếu bạn cần unique/tối ưu hiển thị — có thể thay bằng hàm sync nếu hot path
        const { newName, slug } = await generateSlug(Ward, ten_xa);

        ops.push({
            updateOne: {
                filter: { code: ma_xa },
                update: {
                    $set: {
                        code: ma_xa,
                        name: newName,
                        slug,
                        provinceId,
                        geometry: f.geometry,
                    },
                },
                upsert: true,
            },
        });
    }
    // 6) bulkWrite theo batch để tối ưu (tránh payload quá lớn)
    const BATCH = 500;
    for (let i = 0; i < ops.length; i += BATCH) {
        const slice = ops.slice(i, i + BATCH);
        if (slice.length) {
            await Ward.bulkWrite(slice, { ordered: false });
        }
    }
    fs.unlinkSync(filePath)

    return res.status(200).json({
        message: "Add data ward success",
        count: ops.length,
    })
})