import { resetPasswordInternal, verifyEmailAndSendMailInternal, verifyResetTokenInternal } from "@/controllers/auth.internal.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeEmployee = Router()


// /employee
// Quên mật khẩu khi chưa login
routeEmployee.post("/verify", verifyEmailAndSendMailInternal)
routeEmployee.get("/verify-token", verifyResetTokenInternal)
routeEmployee.put("/reset-password", resetPasswordInternal)


export default routeEmployee