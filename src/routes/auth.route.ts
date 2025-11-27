import { getBusiness, loginBusiness, logoutBusiness, registerBusiness } from "@/controllers/auth.business.controller.js";
import { checkSession, getUserSession, handleRefreshToken, logoutDeviceSuspicious } from "@/controllers/auth.controller.js";
import { loginInternal, logoutInternal } from "@/controllers/auth.internal.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeAuth = Router()
// /auth
routeAuth.get("/refresh-token", handleRefreshToken)
routeAuth.get("/get-session", getUserSession)
routeAuth.get("/check-session", checkSession)

// logout device suspicious
routeAuth.post("/logout_device_suspicious", verifyAccessToken, logoutDeviceSuspicious)


// business
routeAuth.get("/business/me", verifyAccessToken, getBusiness)
routeAuth.post("/business/register", registerBusiness)
routeAuth.post("/business/login", loginBusiness)
routeAuth.post("/business/logout", verifyAccessToken, logoutBusiness)


// internal - employee
routeAuth.post("/internal/login", loginInternal)
// routeAuth.post("/internal/verify", loginInternal)

routeAuth.post("/internal/logout", verifyAccessToken, logoutInternal)



export default routeAuth