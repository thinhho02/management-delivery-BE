import type { PostOfficeType } from "@/controllers/postOffice.controller.js";
import PostOfficeModel from "@/models/postOffice.js";
import Province from "@/models/province.js";
import Ward from "@/models/ward.js";
import { AppThrowError } from "@/utils/AppThrowError.js";

export const normalizeZone = async (payload: PostOfficeType) => {
    let regionId = null;
    let provinceId = null;
    let wardId = null;

    if (payload.type === "sorting_center") {
        // FE truyền regionId
        regionId = payload.regionId;
    }

    if (payload.type === "distribution_hub") {
        // FE truyền provinceId
        const province = await Province.findById(payload.provinceId);
        if (!province) throw new AppThrowError("Province không tồn tại", 400);

        provinceId = province.id;
        regionId = province.regionId;
    }

    if (payload.type === "delivery_office") {
        // FE truyền wardId
        const ward = await Ward.findById(payload.wardId);
        if (!ward) throw new AppThrowError("Ward không tồn tại", 400);

        wardId = ward.id;

        const province = await Province.findById(ward.provinceId);
        if (!province) throw new AppThrowError("Province không tồn tại", 400);

        provinceId = province.id;
        regionId = province.regionId;
    }

    return { regionId, provinceId, wardId };
}


export const findParent = async (payload: PostOfficeType, zone: any) => {
    if (payload.type === "sorting_center") {
        return null;
    }

    if (payload.type === "distribution_hub") {
        // parent = sorting center trong khu vực region
        const parent = await PostOfficeModel.findOne({
            type: "sorting_center",
            regionId: zone.regionId
        });
        return parent?.id || null;
    }

    if (payload.type === "delivery_office") {
        // parent = distribution hub trong province
        let parent = await PostOfficeModel.findOne({
            type: "distribution_hub",
            provinceId: zone.provinceId
        });

        // fallback theo region
        if (!parent) {
            parent = await PostOfficeModel.findOne({
                type: "distribution_hub",
                regionId: zone.regionId
            });
        }

        return parent?.id || null;
    }

    return null;
}
