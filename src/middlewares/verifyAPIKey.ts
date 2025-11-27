import BusinessModel from "@/models/business.js";
import crypto from "crypto";
import type { NextFunction, Request, Response } from "express"



export const verifyAPIKey = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.query.api_key as string

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: "Missing API key"
        });
    }


    const hashed = crypto.createHash("sha256").update(apiKey).digest("hex");


    const business = await BusinessModel.findOne({ api_key: hashed })

    if (!business) {
        return res.status(401).json({
            success: false,
            message: "Invalid API key"
        });
    }

    if(!business.status){
        return res.status(403).json({
            success: false,
            message: "Business is disabled or not found"
        });
    }

    (req as any).business = business;
    next();
}