import BusinessModel from "@/models/business.js";
import EmployeeModel from "@/models/employee.js";
import RoleModel from "@/models/role.js";
import SessionModel from "@/models/session.js";
import { sendEventLogout } from "@/services/notifySuspicious.service.js";
import catchError from "@/utils/catchError.js";
import { generateAccessToken, generateRefreshToken } from "@/utils/generateToken.js";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";


export const checkSession = catchError(async (req, res) => {
    const { refreshToken } = req.cookies;
    console.log(refreshToken)
    if (!refreshToken) {
        return res.status(401).json({ loggedIn: false });
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY!) as JwtPayload;
    } catch (err) {
        return res.status(401).json({ loggedIn: false });
    }
    const session = await SessionModel.findById(decoded.sid);
    console.log(!session || !session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now())
    if (!session || !session.isActive || !session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now()) {
        return res.status(401).json({ loggedIn: false });
    }

    const roleName = await RoleModel.findById(decoded.role)
    if (!roleName) {
        return res.status(401).json({ loggedIn: false });
    }

    return res.status(200).json({
        sid: session.id,
        loggedIn: true,
        roleName: roleName.name
    });
})


export const getUserSession = catchError(async (req, res) => {
    const { refreshToken } = req.cookies;
    console.log(req.cookies)
    if (!refreshToken) {
        return res.status(401).json({ loggedIn: false });
    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY!) as JwtPayload;
    } catch (err) {
        return res.status(401).json({ loggedIn: false });
    }
    const session = await SessionModel.findById(decoded.sid);
    console.log(!session || !session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now())
    if (!session || !session.isActive || !session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now()) {
        return res.status(401).json({ loggedIn: false });
    }

    const findAccount = session?.business
        ? await BusinessModel.findById(session.business).select("id type name email role status").lean()
        : session?.employee
            ? await EmployeeModel.findById(session.employee).select("id name email idNumber numberPhone address officeId role status").lean()
            : undefined

    if (!findAccount || !findAccount.status) {
        return res.status(401).json({ loggedIn: false, status: "block" });
    }

    const roleName = await RoleModel.findById(findAccount.role)
    if (!roleName) {
        return res.status(401).json({ loggedIn: false });
    }

    const accessToken = generateAccessToken({
        sub: findAccount._id.toString(),
        sid: session.id.toString(),
        role: roleName.id.toString(),
        type: "access"
    });

    return res.status(200).json({
        sid: session.id,
        loggedIn: true,
        accessToken,
        isSuspicious: session.isSuspicious,
        isTrusted: session.isTrusted,
        account: {
            ...findAccount,
            roleName: roleName.name,
            roleDescription: roleName.description
        },
        roleName: roleName.name
    });
})



export const handleRefreshToken = catchError(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) {
        return res.status(401).json({ message: "Missing refresh token" });
    }

    // 2. Verify refresh token
    let decoded: JwtPayload;
    try {
        decoded = jwt.verify(token, process.env.JWT_REFRESH_KEY!) as JwtPayload;
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
    console.log("đây là token", decoded)
    // Tìm session theo decoded.sid
    const session = await SessionModel.findById(decoded.sid);
    if (!session || !session.isActive) {
        return res.status(401).json({ message: "Session expired" });
    }

    if (!session.refreshTokenHash) {
        return res.status(403).json({ message: "Missing refresh token" });
    }
    // Kiểm tra token có khớp DB không
    const checkToken = bcrypt.compareSync(token, session.refreshTokenHash)
    if (!checkToken) {
        return res.status(403).json({ message: "Refresh token reuse detected" });
    }


    // Kiểm tra refresh token expired theo DB
    if (!session.refreshTokenExp || session.refreshTokenExp.getTime() < Date.now()) {
        session.refreshTokenHash = null
        session.refreshTokenExp = null
        session.isActive = false
        await session.save()
        return res.status(401).json({ message: "Refresh token expired" });
    }

    const findAccount = session?.business
        ? await BusinessModel.findById(session.business).lean()
        : session?.employee
            ? await EmployeeModel.findById(session.employee).lean()
            : undefined
    if (!findAccount) {
        session.refreshTokenHash = null
        session.refreshTokenExp = null
        session.isActive = false
        await session.save()
        return res.status(401).json({ message: "Missing  account for Session" })
    }

    const expiresAt = decoded.remember
        ? 365 * 24 * 60 * 60 * 1000
        : 1 * 24 * 60 * 60 * 1000;

    const roleAccount = findAccount.role.toString()
    // Tạo Token mới
    console.log(findAccount)
    console.log(session)

    const newAccessToken = generateAccessToken({
        sub: findAccount._id.toString(),
        sid: session.id.toString(),
        role: roleAccount,
        type: "access"
    });

    const newRefreshToken = generateRefreshToken({
        sub: findAccount._id.toString(),
        sid: session.id.toString(),
        role: roleAccount,
        remember: decoded.remember,
        type: "refresh"
    });
    session.refreshTokenHash = bcrypt.hashSync(newRefreshToken, 10);

    session.refreshTokenExp = new Date(Date.now() + expiresAt)
    await session.save()

    const cookieOpts = {
        httpOnly: true,
        maxAge: expiresAt,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        path: '/',
    }


    return res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        maxAge: expiresAt,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "none",
        path: '/',
    }).status(200).json({
        success: true,
        newAccessToken,
    })

})


export const logoutDeviceSuspicious = catchError(async (req, res) => {
    const { sessionSuspicious } = req.body

    const accountId = (req as any).user.id
    const sessionTrust = (req as any).session

    if (!sessionTrust.isTrusted) {
        return res.status(403).json({
            message: "Forbidden, Bạn không có quyền để sử dụng tính năng này"
        })
    }

    const account = sessionTrust?.business
        ? await BusinessModel.findById(accountId).populate("role", "name")
        : await EmployeeModel.findById(accountId).populate("role", "name")

    // Verify
    if (!account) {
        return res.status(404).json({
            message: "Không tìm thầy tài khoản"
        })
    }

    if (!account.status) {
        return res.status(403).json({
            message: "Tài khoản của bạn đã bị khóa"
        })
    }
    const roleName = (account.role as any)?.name;

    // Đăng xuất thiết bị lạ khỏi phiên đăng nhập 
    await SessionModel.findByIdAndUpdate(sessionSuspicious, {
        $set: { isActive: false, refreshTokenExp: null, refreshTokenHash: null }
    })
    sendEventLogout(sessionSuspicious, roleName)
    // gửi event tới thiết bị lạ để thực hiện logout
    return res.status(200).json()
})