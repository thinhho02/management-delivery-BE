import BusinessModel from "@/models/business.js";
import catchError from "@/utils/catchError.js";
import { generateAccessToken, generateRefreshToken } from "@/utils/generateToken.js";
import z from "zod";
import geoip from "geoip-lite";
import jwt, { type JwtPayload } from "jsonwebtoken";
import SessionModel, { type ISession } from "@/models/session.js";
import { UAParser } from "ua-parser-js";
import bcrypt from "bcryptjs";
import RoleModel from "@/models/role.js";
import { sendSuspiciousNotification } from "@/services/sendNotifySuspicious.service.js";


const FingerprintSchema = z.object({
    deviceType: z.string(),
    osName: z.string(),
    osVersionMajor: z.number(),
    browserName: z.string(),
    browserVersionMajor: z.number(),
    webglRenderer: z.string(),
    canvasHash: z.string(),
    hardwareConcurrency: z.number(),
    timezone: z.string(),
});


const SchemaInputBusiness = z.object({
    email: z.string().min(1, { message: "Thông tin sai" }).pipe(z.email({ message: "Thông tin sai" })),
    verify: z.boolean(),
    password: z.string().min(6, "Thông tin sai"),
    fingerprint: FingerprintSchema,
    fingerprintHash: z.string(),
    fcmToken: z.string().optional(),
    rememberMe: z.boolean().optional(),
    ua: z.string().optional(),
    ip: z.string().optional()
})


export const registerBusiness = catchError(async (req, res) => {
    const schemaInput = SchemaInputBusiness.pick({ email: true, password: true, verify: true })
    const { email, password, verify } = schemaInput.parse(req.body)

    if (!verify) {
        return res.status(400).json({
            success: false,
            message: "Thông tin chưa được xác thực"
        })
    }
    // 1) Kiểm tra email đã tồn tại?
    const existed = await BusinessModel.findOne({ email });
    if (existed) {
        return res.status(400).json({
            success: false,
            message: "Email đã được đăng ký",
        });
    }
    const roles = await RoleModel.find().lean()
    console.log(roles)
    const role = roles.find((r) => r.name === "business")
    console.log(role)
    const newBusiness = new BusinessModel({
        email: email,
        passwordHash: password,
        type: "marketplace",
        role: role?._id
    })
    await newBusiness.save()

    return res.status(204).json({ success: true })
})


export const loginBusiness = catchError(async (req, res) => {
    const schemaInput = SchemaInputBusiness.pick({ email: true, password: true, rememberMe: true, fcmToken: true, fingerprint: true, fingerprintHash: true })
    const { email, password, rememberMe, fingerprint, fingerprintHash, fcmToken } = schemaInput.parse(req.body)

    const business = await BusinessModel.findOne({ email })
    if (!business) {
        return res.status(400).json({
            success: false,
            message: "Email hoặc mật khẩu không hợp lệ"
        })
    }
    if (business && !(await business.isPasswordMatch(password))) {
        return res.status(400).json({
            success: false,
            message: "Email hoặc mật khẩu không hợp lệ"
        })
    }
    if (!business.status) {
        return res.status(400).json({
            success: false,
            message: "Tài khoản của bạn đã bị khóa"
        })
    }

    // ---------- IP + GEO ----------
    const ip = (req.headers["x-forwarded-for"] as any)?.split(",")[0].trim() || req.socket.remoteAddress;
    const geo = geoip.lookup(ip);

    // ---------- Parse User-Agent ----------
    const ua = req.headers["user-agent"];
    const parsedUA = new UAParser(ua).getResult();

    // ---- Detect sessions ----
    const totalSessions = await SessionModel.countDocuments({
        business: business.id
    });


    let session = await SessionModel.findOne({
        business: business._id,
        fingerprintHash
    });

    let isFirstLogin = false;
    let isNewDevice = false;
    let isSuspicious = false;

    const now = new Date();

    // =============== CASE 1 — FIRST LOGIN ===========
    if (totalSessions === 0) {
        isFirstLogin = true;
        isNewDevice = true;

        session = new SessionModel({
            business: business._id,
            ua,
            ip,
            fingerprint,
            fingerprintHash,
            fcmToken,
            geo: geo
                ? {
                    country: geo.country,
                    city: geo.city,
                    ll: geo.ll,
                    timezone: geo.timezone
                }
                : undefined,
            isTrusted: true,        // LẦN ĐẦU = THIẾT BỊ TRUSTED
            isSuspicious: false,
            isActive: true,
            firstLoginAt: now,
            lastLoginAt: now
        });

        await session.save();
    }
    // =============== CASE 2 — NEW DEVICE =================
    else if (!session) {
        isNewDevice = true;
        isSuspicious = true;

        session = new SessionModel({
            business: business._id,
            ua,
            ip,
            fingerprint,
            fingerprintHash,
            fcmToken,
            geo: geo
                ? {
                    country: geo.country,
                    city: geo.city,
                    ll: geo.ll,
                    timezone: geo.timezone
                }
                : undefined,
            isTrusted: false,       // CẦN USER XÁC NHẬN
            isSuspicious: true,
            isActive: true,
            firstLoginAt: now,
            lastLoginAt: now
        });
        await session.save();

        await sendSuspiciousNotification(session.id, business.id, parsedUA, geo, session.firstLoginAt, "business")


        // Gửi cảnh báo FCM cho thiết bị cũ (trusted)
        // await sendSecurityFCM(user._id, {
        //     title: "Thiết bị mới đăng nhập",
        //     body: `Tài khoản của bạn vừa đăng nhập từ ${parsedUA.browser.name} trên ${parsedUA.os.name} tại ${geo.city || "không xác định"}.`,
        //     severity: "new_device"
        // });

    } else {


        // === Khác thiết bị hoặc khác Browser ===
        const isLocationChanged =
            geo &&
            (session.geo?.city !== geo.city ||
                session.geo?.country !== geo.country);

        const isBrowserChanged =
            session.fingerprint.browserName !== fingerprint.browserName ||
            session.fingerprint.browserVersionMajor !== fingerprint.browserVersionMajor;

        const isOSChanged =
            session.fingerprint.osName !== fingerprint.osName ||
            session.fingerprint.osVersionMajor !== fingerprint.osVersionMajor;

        const isGpuChanged =
            session.fingerprint.webglRenderer !== fingerprint.webglRenderer;

        if (isLocationChanged || isBrowserChanged || isOSChanged || isGpuChanged) {
            isSuspicious = true;

            session = new SessionModel({
                business: business._id,
                ua,
                ip,
                fingerprint,
                fingerprintHash,
                fcmToken,
                geo: geo
                    ? {
                        country: geo.country,
                        city: geo.city,
                        ll: geo.ll,
                        timezone: geo.timezone
                    }
                    : undefined,
                isTrusted: false,       // CẦN USER XÁC NHẬN
                isSuspicious: true,
                isActive: true,
                firstLoginAt: now,
                lastLoginAt: now
            });
            await session.save();

            await sendSuspiciousNotification(session.id, business.id, parsedUA, geo, now, "business")

            //   await sendSecurityFCM(user._id, {
            //     title: "Cảnh báo đăng nhập bất thường",
            //     body: `Tài khoản đăng nhập từ thiết bị quen thuộc nhưng tại vị trí hoặc trình duyệt khác: ${parsedUA.browser.name} - ${parsedUA.os.name}, ${geo.city || "Không rõ"}`,
            //     severity: "suspicious"
            //   });
        } else {

            // Cùng thiết bị và cùng browser - cập nhật session
            session.ip = ip;
            session.fcmToken = fcmToken || "";
            session.fingerprint = fingerprint;

            session.geo = geo
                ? {
                    country: geo.country,
                    city: geo.city,
                    ll: geo.ll,
                    timezone: geo.timezone
                }
                : session.geo;

            session.lastLoginAt = now;
            session.isActive = true
            await session.save();
        }
    }
    // =============== GENERATE TOKENS =====================

    const accessToken = generateAccessToken({
        sub: business.id.toString(),
        sid: session.id.toString(),
        role: business.role.toString(),
        type: "access"
    });

    const refreshToken = generateRefreshToken({
        sub: business.id.toString(),
        sid: session.id.toString(),
        role: business.role.toString(),
        remember: !!rememberMe,
        type: "refresh"
    });
    const refreshTokenExp = rememberMe
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    session.refreshTokenHash = bcrypt.hashSync(refreshToken, 10);
    session.refreshTokenExp = refreshTokenExp;
    await session.save();

    // ---- Set Cookie ----
    const cookieOpts = {
        httpOnly: true,
        maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        path: '/',
    }
    console.log(cookieOpts)
    return res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite:  process.env.NODE_ENV === 'production' ? "none" : "lax",
        path: '/',
    }).status(200).json({
        accessToken,
        // isNewDevice,
        // isSuspicious,
        sessionId: session.id,
        message: "Đăng nhập thành công"
    })

})


export const getBusiness = catchError(async (req, res) => {
    const { id, role, sessionId } = (req as any).user;

    const nameRole = await RoleModel.findById(role)
    if (!nameRole || nameRole.name !== "business") {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập",
        });
    }

    // Check session có bị revoke không
    const session = await SessionModel.findById(sessionId);
    if (!session || !session.isActive) {
        return res.status(401).json({
            status: "Session_Expired",
            message: "Phiên đăng nhập đã hết hạn hoặc bị thu hồi",
        });
    }

    // Lấy thông tin business
    const business = await BusinessModel.findById(id);

    if (!business) {
        return res.status(404).json({
            success: false,
            message: "Không tìm thấy tài khoản",
        });
    }
    if (!business.status) {
        return res.status(401).json({
            success: false,
            message: "Tài khoản của bạn đã bị khóa",
        });
    }

    return res.status(200).json({
        id: business.id,
        email: business.email,
        name: business.name,
        role: business.role,
        status: business.status,
    });
})


export const logoutBusiness = catchError(async (req, res) => {
    // refreshToken lưu ở cookie
    const { sessionId } = (req as any).user;

    // Tìm session hiện tại
    const session = await SessionModel.findById(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: "Phiên đăng nhập không tồn tại"
        });
    }

    // Vô hiệu hóa session
    session.isActive = false;
    session.refreshTokenHash = null;
    session.refreshTokenExp = null;
    await session.save();

    // const cookieOpts = {
    //     httpOnly: true,
    //     maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000,
    //     // domain: process.env.ORIGIN_PATH_FRONTEND ? process.env.ORIGIN_PATH_FRONTEND : 'localhost',
    //     secure: process.env.NODE_ENV === 'production',
    //     sameSite: "none",
    //     path: '/',
    // }


    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Đăng xuất thành công"
    });
});
