import { getUserDefaultByBusiness, updateUserDefault } from "@/controllers/user.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeUser = Router()

// /user
routeUser.get("/default", verifyAccessToken, getUserDefaultByBusiness)
routeUser.post("/create/default", verifyAccessToken, updateUserDefault)

export default routeUser