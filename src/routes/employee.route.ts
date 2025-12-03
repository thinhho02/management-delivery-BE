import { changePasswordInternal, resetPasswordInternal, updateNewPasswordInternal, verifyEmailAndSendMailInternal, verifyEmailInternal, verifyResetTokenInternal } from "@/controllers/auth.internal.controller.js";
import { createNewShipper, createNewStaff } from "@/controllers/employee.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeEmployee = Router()


// /employee
// Quên mật khẩu khi chưa login
routeEmployee.post("/verify", verifyEmailAndSendMailInternal)
routeEmployee.get("/verify-token", verifyResetTokenInternal)
routeEmployee.put("/reset-password", resetPasswordInternal)

// Thay đổi mật khẩu
routeEmployee.put("/change-password", verifyAccessToken, changePasswordInternal)
routeEmployee.post("/verify-email", verifyAccessToken, verifyEmailInternal)
routeEmployee.put("/update-password", verifyAccessToken, updateNewPasswordInternal)

routeEmployee.post("/create/staff", createNewStaff)
routeEmployee.post("/create/shipper", createNewShipper)

export default routeEmployee