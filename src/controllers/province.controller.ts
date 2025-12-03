import Province from "@/models/province.js";
import Region from "@/models/region.js";
import Ward from "@/models/ward.js";
import { ZoneSchemaZod } from "@/types/zoneType.js";
import catchError from "@/utils/catchError.js";
import generateSlug from "@/utils/generateSlug.js";
import { fs } from "memfs";

export const getListProvince = catchError(async (req, res) => {
    const provinces = await Province.find().select('_id code name regionId geometry').populate("regionId", "code name -_id").sort({ name: 1 }).lean()

    return res.status(200).json(provinces)
})

export const getListProvinceNoGeo = catchError(async (req, res) => {
    const provinces = await Province.find().select('_id code name regionId').populate("regionId", "code name -_id").sort({ name: 1 }).lean()

    return res.status(200).json(provinces)
})

export const getProvinceById = catchError(async (req, res) => {
    const { zoneId } = req.params

    const province = await Province.findById(zoneId).select("_id code name geometry").lean()

    if (!province) {
        return res.status(400).json({ message: "Khu vực hoạt động không tồn tại" })
    }

    return res.status(200).json(province)
})


export const getListProvinceByCode = catchError(async (req, res) => {
    const zonePick = ZoneSchemaZod.pick({ code: true })
    const { code } = zonePick.parse(req.body)
    const province = await Province.findOne({ code }).select('_id code name regionId').lean()
    if (!province || !province._id) {
        return res.status(400).json({ message: "Invalida Code or not exist" })
    }
    const wardInProvince = await Ward.find({ provinceId: province._id }).select('_id code name provinceId geometry').sort({ name: 1 }).lean()

    return res.status(200).json({
        ...province,
        wards: wardInProvince
    })
})

export const createProvince = catchError(async (req, res) => {
    const zonePick = ZoneSchemaZod.pick({ zone: true })
    const { zone } = zonePick.parse(req.body);
    const file = req.file;

    if (!file)
        return res.status(400).json({ message: "Missing GeoJSON file" });

    if (file.size > 5000000)
        return res.status(400).json({ message: "File too large (max 5MB)" });

    const filePath = `/${file.originalname}`;
    console.log(file)
    fs.writeFileSync(filePath, file.buffer)
    const raw = fs.readFileSync(filePath, { encoding: "utf8" }) as string;
    const json = JSON.parse(raw);

    if (json.type !== "FeatureCollection")
        return res.status(400).json({ message: "Invalid GeoJSON, type must be FeatureCollection" });
    if (!Array.isArray(json.features) || json.features.length === 0)
        return res.status(400).json({ message: "Invalid GeoJSON, missing Features" })

    const invalidFeature = json.features.find((f: any) => !f?.properties || !f.properties?.ma_tinh);
    if (invalidFeature)
        return res.status(400).json({ message: "Invalid GeoJSON: each feature must have properties.ma_tinh" })


    const matchRegion = await Region.findOne({
        geometry: {
            $geoIntersects: {
                $geometry: json.features[0].geometry
            }
        }
    })
    const code = json.features[0].properties.ma_tinh as string
    const name = json.features[0].properties.ten_tinh as string
    const geometry = json.features[0].geometry
    const { newName, slug } = await generateSlug(Province, name);

    await Province.updateOne(
        { code },
        {
            $set: {
                code,
                name: newName,
                slug,
                regionId: matchRegion?._id,
                geometry: geometry
            }
        },
        { upsert: true }
    );

    return res.status(200).json({
        message: "Add data province success",
    })
})