import EmployeeModel from "@/models/employee.js";
import catchError from "@/utils/catchError.js";
import z from "zod";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import SessionModel from "@/models/session.js";
import { sendSuspiciousNotification } from "@/services/notifySuspicious.service.js";
import { generateAccessToken, generateRefreshToken } from "@/utils/generateToken.js";
import bcrypt from "bcryptjs";
import { createPasswordResetToken, sendResetPasswordEmail, verifyHashToken } from "@/services/business.service.js";


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


const SchemaInputInternal = z.object({
    email: z.string().min(1, { message: "Thông tin sai" }).pipe(z.email({ message: "Thông tin sai" })),
    name: z.string().min(1, { message: "Thông tin sai" }),
    verify: z.boolean(),
    password: z.string().min(6, "Thông tin sai"),
    fingerprint: FingerprintSchema,
    fingerprintHash: z.string(),
    fcmToken: z.string().optional(),
    rememberMe: z.boolean().optional(),
    ua: z.string().optional(),
    ip: z.string().optional()
})


export const loginInternal = catchError(async (req, res) => {
    const schemaInput = SchemaInputInternal.pick({ email: true, password: true, rememberMe: true, fcmToken: true, fingerprint: true, fingerprintHash: true })
    const { email, password, rememberMe, fingerprint, fingerprintHash, fcmToken } = schemaInput.parse(req.body)

    const employee = await EmployeeModel.findOne({ email })
    if (!employee) {
        return res.status(400).json({
            success: false,
            message: "Email hoặc mật khẩu không đúng"
        })
    }
    if (employee && !(await employee.isPasswordMatch(password))) {
        return res.status(400).json({
            success: false,
            message: "Email hoặc mật khẩu không đúng"
        })
    }
    if (!employee.status) {
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
        employee: employee.id
    });


    let session = await SessionModel.findOne({
        employee: employee._id,
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
            employee: employee._id,
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
            employee: employee._id,
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

        await sendSuspiciousNotification(session.id, employee.id, parsedUA, geo, session.firstLoginAt, "employee")


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
                employee: employee._id,
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

            await sendSuspiciousNotification(session.id, employee.id, parsedUA, geo, now, "employee")

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

            if (session.isSuspicious) {
                await sendSuspiciousNotification(session.id, employee.id, parsedUA, geo, now, "employee")
            }
        }
    }
    // =============== GENERATE TOKENS =====================
    const accessToken = generateAccessToken({
        sub: employee.id.toString(),
        sid: session.id.toString(),
        role: employee.role.toString(),
        type: "access"
    });

    const refreshToken = generateRefreshToken({
        sub: employee.id.toString(),
        sid: session.id.toString(),
        role: employee.role.toString(),
        remember: !!rememberMe,
        type: "refresh"
    });
    const refreshTokenExp = rememberMe
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

    session.refreshTokenHash = bcrypt.hashSync(refreshToken, 10);
    session.refreshTokenExp = refreshTokenExp;
    await session.save();
    const rolePopulate = await employee.populate("role", "name")

    // ---- Set Cookie ----
    const cookieOpts = {
        httpOnly: true,
        maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        path: '/',
    }
    console.log(cookieOpts)
    return res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: rememberMe ? 365 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? "none" : "lax",
        path: '/',
    }).status(200).json({
        accessToken,
        roleName: (rolePopulate.role as any).name,
        // isNewDevice,
        // isSuspicious,
        sessionId: session.id,
        message: "Đăng nhập thành công"
    })

})

export const logoutInternal = catchError(async (req, res) => {
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

export const verifyEmailAndSendMailInternal = catchError(async (req, res) => {
    const inputEmail = SchemaInputInternal.pick({ email: true })
    const { email } = inputEmail.parse(req.body)

    const employee = await EmployeeModel.findOne({ email }).populate("role", "name")

    if (!employee) {
        return res.status(404).json({
            message: "Không tìm thầy tài khoản"
        })
    }
    if (!employee.status) {
        return res.status(403).json({
            message: "Tài khoản của bạn đã bị khóa"
        })
    }

    const roleName = (employee.role as any)?.name;
    if (!roleName || roleName === 'business') {
        return res.status(403).json({
            message: "Forbidden, Bạn không thể xác thực bằng email này"
        })
    }

    const resetToken = await createPasswordResetToken(employee)

    const sendMailVerify = await sendResetPasswordEmail(email, resetToken, 'internal')

    if (!sendMailVerify) {
        return res.status(400).json({ message: `Không thể gửi mã xác thực đổi mật khẩu đến ${email}` })
    }

    return res.status(200).json({
        message: `Đã gửi mã xác thực đặt lại mật khẩu đến ${email}`
    });

})

export const verifyResetTokenInternal = catchError(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ valid: false });
    }
    const hashedToken = verifyHashToken(token as string)
    const employee = await EmployeeModel.findOne({
        password_reset_token: hashedToken,
        password_reset_expires: { $gt: Date.now() }
    });

    if (!employee) {
        return res.status(400).json({ valid: false });
    }

    return res.status(200).json({ valid: true });
});


export const resetPasswordInternal = catchError(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({
            message: "Thiếu token hoặc mật khẩu mới"
        });
    }

    // Hash lại token do user gửi lên
    const hashedToken = verifyHashToken(token as string);

    // Tìm user theo token & chưa hết hạn
    const employee = await EmployeeModel.findOne({
        password_reset_token: hashedToken,
        password_reset_expires: { $gt: Date.now() }
    });

    if (!employee) {
        return res.status(400).json({
            message: "Token không hợp lệ hoặc đã hết hạn"
        });
    }

    // Xóa token
    employee.password_reset_token = undefined;
    employee.password_reset_expires = undefined;
    employee.passwordHash = newPassword

    // Lưu DB
    await employee.save();

    // Logout toàn bộ session (xoá refreshToken)
    await SessionModel.findOneAndDelete({ employee: employee.id })

    return res.status(200).json({
        message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
    });
})

export const changePasswordInternal = catchError(async (req, res) => {
    const { newPassword, currentPassword } = req.body

    const employeeId = (req as any).user.id
    const sessionId = (req as any).user.sessionId

    const employee = await EmployeeModel.findById(employeeId).populate("role", "name")

    // Verify
    if (!employee) {
        return res.status(404).json({
            message: "Không tìm thầy tài khoản"
        })
    }

    if (!employee.status) {
        return res.status(403).json({
            message: "Tài khoản của bạn đã bị khóa"
        })
    }

    const roleName = (employee.role as any)?.name;
    if (!roleName || roleName === 'business') {
        return res.status(403).json({
            message: "Forbidden, Bạn không có quyền để sử dụng tính năng này"
        })
    }

    // Kiểm tra mật khẩu hiện tại
    const matchCurrentPassword = await employee.isPasswordMatch(currentPassword)
    if (!matchCurrentPassword) {
        return res.status(400).json({
            message: "Mật khẩu hiện tại không chính xác"
        })
    }

    // Cập nhật mật khẩu mới
    employee.passwordHash = newPassword
    await employee.save()

    // toàn bộ session sẽ bị logout ngoại trừ session hiện tại

    await SessionModel.updateMany(
        {
            employee: employeeId,
            _id: { $ne: sessionId },      // loại session hiện tại
        },
        {
            $set: { isActive: false, refreshTokenExp: null, refreshTokenHash: null }
        }
    )

    return res.status(200).json({
        message: "Đổi mật khẩu thành công. Tất cả thiết bị khác đã bị đăng xuất."
    });

})


export const verifyEmailInternal = catchError(async (req, res) => {
    const inputEmail = SchemaInputInternal.pick({ email: true })
    const { email } = inputEmail.parse(req.body)

    const employeeId = (req as any).user.id
    const employee = await EmployeeModel.findById(employeeId).populate("role", "name")
    // Verify
    if (!employee) {
        return res.status(404).json({
            message: "Không tìm thầy tài khoản"
        })
    }

    if (employee.email !== email) {
        return res.status(400).json({
            message: "Email không phù hợp với tài khoản này"
        })
    }

    return res.status(204).json()

})


export const updateNewPasswordInternal = catchError(async (req, res) => {
    const inputPassword = SchemaInputInternal.pick({ password: true })
    const { password } = inputPassword.parse(req.body)

    const employeeId = (req as any).user.id
    const sessionId = (req as any).user.sessionId

    const employee = await EmployeeModel.findById(employeeId).populate("role", "name")

    // Verify
    if (!employee) {
        return res.status(404).json({
            message: "Không tìm thầy tài khoản"
        })
    }

    if (!employee.status) {
        return res.status(403).json({
            message: "Tài khoản của bạn đã bị khóa"
        })
    }

    const roleName = (employee.role as any)?.name;
    if (!roleName || roleName === 'business') {
        return res.status(403).json({
            message: "Forbidden, Bạn không có quyền để sử dụng tính năng này"
        })
    }

    employee.passwordHash = password
    await employee.save()

    await SessionModel.updateMany(
        {
            employee: employeeId,
            _id: { $ne: sessionId },      // loại session hiện tại
        },
        {
            $set: { isActive: false, refreshTokenExp: null, refreshTokenHash: null }
        }
    )

    return res.status(200).json({
        message: "Đổi mật khẩu thành công. Tất cả thiết bị khác đã bị đăng xuất."
    });
})