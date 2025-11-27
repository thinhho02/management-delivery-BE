import Province from "@/models/province.js"
import Region from "@/models/region.js"
import { createTileService, updateTileMapBox } from "@/services/mapbox.service.js"
import { ZoneSchemaZod } from "@/types/zoneType.js"
import catchError from "@/utils/catchError.js"
import generateSlug from "@/utils/generateSlug.js"
import { fs } from "memfs"



export const getListRegion = catchError(async (req, res) => {
    const regions = await Region.find().select('_id code name tileset geometry').sort({ name: 1 }).lean()

    return res.status(200).json(regions)
})


export const getRegionById = catchError(async (req, res) => {
    const { zoneId } = req.params

    const region = await Region.findById(zoneId).select("_id code name geometry").lean()

    if (!region) {
        return res.status(400).json({ message: "Khu vực hoạt động không tồn tại" })
    }

    return res.status(200).json(region)
})


export const getListRegionByCode = catchError(async (req, res) => {
    const zonePick = ZoneSchemaZod.pick({ code: true })
    const { code } = zonePick.parse(req.body)
    const region = await Region.findOne({ code }).select('_id code name tileset').lean()
    if (!region || !region._id) {
        return res.status(400).json({ message: "Invalida Code or not exist" })
    }
    const provinceInRegion = await Province.find({ regionId: region._id }).select('_id code name regionId tileset geometry').sort({ name: 1 }).lean()

    return res.status(200).json({
        ...region,
        provinces: provinceInRegion
    })
})

export const createRegion = catchError(async (req, res) => {
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

    const invalidFeature = json.features.find((f: any) => !f?.properties || !f.properties?.ma_vung || !f.geometry);
    if (invalidFeature)
        return res.status(400).json({ message: "Invalid GeoJSON: feature must have properties.ma_vung and geometry" })

    // Mapbox tileset job
    const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME;
    const tilesetId = `${MAPBOX_USERNAME}.${zone}`;

    const existedTileset = await Region.exists({ tileset: tilesetId });

    const jobId = existedTileset
        ? await updateTileMapBox(json.features, zone, file, tilesetId)
        : await createTileService(json.features, zone, file, tilesetId);

    // const ops: AnyBulkWriteOperation[] = [];


    const code = json.features[0].properties.ma_vung as string
    const name = json.features[0].properties.ten_vung as string
    const geometry = json.features[0].geometry
    const { newName, slug } = await generateSlug(Region, name);

    await Region.updateOne(
        { code },
        {
            $set: {
                code,
                name: newName,
                slug,
                tileset: tilesetId,
                geometry: geometry
            }
        },
        { upsert: true }
    );
    return res.status(200).json({
        message: "Add data tileset ward success",
        tileset: tilesetId,
        jobId
    })
})