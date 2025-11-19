import SessionModel from "@/models/session.js";
import type { NextFunction, Request, Response } from "express"
import jwt, { type JwtPayload } from "jsonwebtoken";


export const verifyAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.headers.authorization?.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "Unauthorized_Token",
                message: "Access token missing"
            });
        }

        const token = req.headers.authorization.split(" ")[1];
        if (!token) return res.status(401).json({ status: "Unauthorized_Token", message: "Unauthorized" });
        const decoded = jwt.verify(token, process.env.JWT_KEY!) as JwtPayload;

        if (decoded.type !== "access") {
            return res.status(401).json({
                status: "Invalid_Type",
                message: "Token không hợp lệ"
            });
        }

        // Kiểm tra session
        const session = await SessionModel.findById(decoded.sid);
        if (!session || !session.isActive || !session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now()) {
            return res.status(401).json({
                status: "Session_Expired",
                message: "Phiên đăng nhập đã hết hạn"
            });
        }

        (req as any).user = {
            id: decoded.sub,
            role: decoded.role,
            sessionId: decoded.sid
        };

        (req as any).session = session;
        next();

    } catch (error: any) {
        return res.status(401).json({
            status: error.name === "TokenExpiredError" ? "Expired" : "Invalid",
            message: "Token không hợp lệ hoặc hết hạn"
        });
    }
};