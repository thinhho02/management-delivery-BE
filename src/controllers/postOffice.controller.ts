import PostOfficeModel from "@/models/postOffice.js";
import Province from "@/models/province.js";
import Region from "@/models/region.js";
import Ward from "@/models/ward.js";
import { findParent, normalizeZone } from "@/services/post.service.js";
import catchError from "@/utils/catchError.js";
import z from "zod";

export const PostOfficeSchemaZ = z.object({
    parentId: z.string().optional(),

    code: z.string().min(1, "Code là bắt buộc").optional(),

    name: z.string().min(1, "Tên là bắt buộc").optional(),

    regionId: z.string().optional(),
    provinceId: z.string().optional(),
    wardId: z.string().optional(),

    type: z.enum(["sorting_center", "distribution_hub", "delivery_office"], { error: "Loại Post Office là bắt buộc" }).optional(),

    address: z.string().optional(),

    location: z.array(z.number()).optional(),

    status: z.boolean().default(true).optional(),
});

export type PostOfficeType = z.infer<typeof PostOfficeSchemaZ>

export const PostOfficeQuery = z.object({
    type: z.enum(["sorting_center", "distribution_hub", "delivery_office"]),
    page: z.string().default("1"),
    limit: z.string().default("20"), // mặc định 20
});

// verify Acctoken isAdmin
export const getZonebyType = catchError(async (req, res) => {
    const inputType = PostOfficeSchemaZ.pick({ type: true })
    const { type } = inputType.parse(req.params)


    // check type
    const zones = type === 'sorting_center'
        ? await Region.find({}).select("_id code name").lean()
        : type === "distribution_hub"
            ? await Province.find({}).select("_id code name").lean()
            : await Ward.find({}).select("_id code name").lean()

    return res.status(200).json(zones)
})

// verify Acctoken isAdmin
export const createNewPost = catchError(async (req, res) => {
    const payload = PostOfficeSchemaZ.parse(req.body)

    const matchCode = await PostOfficeModel.findOne({ code: payload.code })
    if (matchCode) {
        return res.status(400).json({
            message: "Mã bưu cục đã tồn tại"
        })
    }

    const zone = await normalizeZone(payload);

    const zoneField = payload.type === 'sorting_center'
        ? "regionId"
        : payload.type === "distribution_hub"
            ? "provinceId"
            : "wardId"

    const matchZone = await PostOfficeModel.findOne({ [zoneField]: payload[zoneField] })
    if (matchZone) {
        return res.status(400).json({
            message: "Đã có bưu cực trong khu vực hoạt động"
        })
    }
    // Xác định parentId
    const parentId = await findParent(payload, zone);

    const post = new PostOfficeModel({
        ...payload,
        parentId,
        regionId: zone.regionId,
        provinceId: zone.provinceId,
        wardId: zone.wardId,
        location: {
            coordinates: payload.location
        }
    })

    await post.save()

    return res.status(200).json({
        message: "Thêm mới bưu cục thành công"
    })
})

export const getPostById = catchError(async (req, res) => {
    const { postId } = req.params

    const post = await PostOfficeModel.findById(postId).select("-createdAt -updatedAt -__v")
    if (!post) {
        return res.status(400).json({
            message: "Không tìm thấy Bưu cục"
        })
    }
    const zoneField = post.type === 'sorting_center'
        ? "regionId"
        : post.type === "distribution_hub"
            ? "provinceId"
            : "wardId"

    await post.populate([
        { path: zoneField, select: "_id name code geometry" },
        { path: "parentId", select: "_id code name type" }
    ])

    return res.status(200).json(post)

})

// verify Acctoken isAdmin
export const getPostOffices = catchError(async (req, res) => {
    const query = PostOfficeQuery.parse(req.query);

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { type: query.type };

    const zoneField = query.type === 'sorting_center'
        ? "regionId"
        : query.type === "distribution_hub"
            ? "provinceId"
            : "wardId"

    const total = await PostOfficeModel.countDocuments(filter);

    const post = await PostOfficeModel.find(filter)
        .populate({
            path: zoneField,
            select: "_id name code"
        })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json({
        post,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    });
});


export const updatePost = catchError(async (req, res) => {
    const payload = PostOfficeSchemaZ.parse(req.body)
    const { postId } = req.params
    console.log(payload)
    
    const location = payload.location
        ? {
            type: "Point",
            coordinates: payload.location
        } : undefined
    
    if (!postId) {
        return res.status(400).json({
            message: "Bad Request, Không tìm thấy ID"
        })
    }

    await PostOfficeModel.findByIdAndUpdate(postId, {
        ...payload,
        location
    })

    return res.status(200).json({
        message: "Cập nhật thành công"
    })
})