import { getBusiness, loginBusiness, logoutBusiness, registerBusiness } from "@/controllers/auth.business.controller.js";
import { checkSession, getUserSession, handleRefreshToken } from "@/controllers/auth.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeAuth = Router()
// /auth
routeAuth.get("/refresh-token", handleRefreshToken)
routeAuth.get("/get-session", getUserSession)
routeAuth.get("/check-session", checkSession)


// business
routeAuth.get("/business/me", verifyAccessToken, getBusiness)
routeAuth.post("/business/register", registerBusiness)
routeAuth.post("/business/login", loginBusiness)
routeAuth.post("/business/logout", verifyAccessToken, logoutBusiness)




export default routeAuth