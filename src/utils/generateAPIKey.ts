import BusinessModel from "@/models/business.js";
import crypto from "crypto";

export function generateAPIKey(businessId: string) {
    const randomPart = crypto.randomBytes(32).toString("hex");

    const rawKey = `sk_${businessId}_${randomPart}`

    const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    return { rawKey, hashedKey };
}

export function maskKey(rawKey: string) {
    return rawKey.slice(0, 8) + "************" + rawKey.slice(-4);
}


export async function verifyAPIKey(clientKey: string) {
    if (!clientKey) return null;

    // hash key người dùng gửi
    const hashed = crypto.createHash("sha256").update(clientKey).digest("hex");

    // tìm trong DB
    const apiKeyDoc = await BusinessModel.findOne({
        api_key: hashed,
    });

    return apiKeyDoc || null;
}