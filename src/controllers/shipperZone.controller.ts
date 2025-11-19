import ShipperZone from "@/models/shipperZone.js";
import Ward from "@/models/ward.js";
import { createTileService, updateTileMapBox } from "@/services/mapbox.service.js";
import { ZoneSchemaZod } from "@/types/zoneType.js";
import catchError from "@/utils/catchError.js";
import generateSlug from "@/utils/generateSlug.js";
import { fs } from "memfs";
import type { AnyBulkWriteOperation } from "mongoose";


export const getListShipperZone = catchError(async (req, res) => {
    const shipeerZones = await ShipperZone.find().select('_id code name wardId tileset geometry').populate("wardId", "code name -_id").sort({ name: 1 }).lean()

    return res.status(200).json(shipeerZones)
})


export const createShipperZone = catchError(async (req, res) => {
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

    const invalidFeature = json.features.find((f: any) => !f?.properties || !f.properties?.ma_xa || !f.properties?.ma_sz || !f.geometry);
    if (invalidFeature)
        return res.status(400).json({ message: "Invalid GeoJSON: each feature must have properties.ma_xa and properties.ma_sz and geometry" })

    // Mapbox tileset job
    const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME;
    const tilesetId = `${MAPBOX_USERNAME}.${zone}`;

    const existedTileset = await ShipperZone.exists({ tileset: tilesetId });

    const jobId = existedTileset
        ? await updateTileMapBox(json.features, zone, file, tilesetId)
        : await createTileService(json.features, zone, file, tilesetId);


    const wardCodes: string[] = Array.from(
        new Set<string>(json.features.map((f: any) => String(f.properties.ma_xa)))
    );
    const wards = await Ward.find({ code: { $in: wardCodes } })
        .select({ _id: 1, code: 1 })
        .lean();

    const wardMap = new Map<string, string>();
    for (const w of wards) wardMap.set(String(w.code), String(w._id));

    // Build bulk ops
    const ops: AnyBulkWriteOperation[] = [];

    for (const f of json.features as any[]) {
        const ma_sz = String(f.properties.ma_sz);
        const ten_sz = String(f.properties.ten_sz ?? f.properties.name ?? "");
        const ma_xa = String(f.properties.ma_xa);
        const wardId = wardMap.get(ma_xa) ?? null;

        // Tạo slug nếu bạn cần unique/tối ưu hiển thị — có thể thay bằng hàm sync nếu hot path
        const { newName, slug } = await generateSlug(ShipperZone, ten_sz);

        ops.push({
            updateOne: {
                filter: { code: ma_sz },
                update: {
                    $set: {
                        code: ma_sz,
                        name: newName,
                        slug,
                        wardId,
                        tileset: tilesetId,
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
            await ShipperZone.bulkWrite(slice, { ordered: false });
        }
    }
    fs.unlinkSync(filePath)
    // old
    // const wardsToInsert = [];
    // const province = await Province.findOne({ code: json.feature[0].properties.ma_tinh })
    // for (const feature of json.features) {
    //     const createSlug = await generateSlug(Ward, feature.properties.ten_xa)
    //     wardsToInsert.push({
    //         code: feature.properties.ma_xa,
    //         name: createSlug.newName,
    //         slug: createSlug.slug,
    //         provinceId: province?.id,
    //         tileset: tilesetId,
    //         geometry: feature.geometry

    //     })
    // }
    // await Ward.insertMany(wardsToInsert, { ordered: false });
    return res.status(200).json({
        message: "Add data tileset ward success",
        count: ops.length,
        tileset: tilesetId,
        jobId
    })
})