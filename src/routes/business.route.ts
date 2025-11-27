import { changePassword, createAPIKey, resetPassword, updateBusiness, updateNewPassword, verifyEmail, verifyEmailAndSendMail, verifyResetToken } from "@/controllers/auth.business.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeBusiness = Router()

// /business

// Quên mật khẩu khi chưa login
routeBusiness.post("/verify", verifyEmailAndSendMail)
routeBusiness.get("/verify-token", verifyResetToken)
routeBusiness.put("/reset-password", resetPassword)

// Thay đổi mật khẩu
routeBusiness.put("/change-password", verifyAccessToken, changePassword)
routeBusiness.post("/verify-email", verifyAccessToken, verifyEmail)
routeBusiness.put("/update-password", verifyAccessToken, updateNewPassword)


// createAPIKey
routeBusiness.post("/api-key/create", verifyAccessToken, createAPIKey)


routeBusiness.put("/update", verifyAccessToken, updateBusiness)


export default routeBusiness
