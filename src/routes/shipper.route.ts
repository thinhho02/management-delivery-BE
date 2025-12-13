import { getInfoShipper, getInfoShipperByEmployee, updateLocationShipper } from "@/controllers/shipper.controller.js";
import { verifyAccessToken } from "@/middlewares/verifyAccessToken.js";
import { Router } from "express";

const routeShipper = Router()
// /shipper

routeShipper.get("/get/:shipperId", verifyAccessToken, getInfoShipper)
routeShipper.get("/employee", verifyAccessToken, getInfoShipperByEmployee)


routeShipper.put("/:shipperId/location", verifyAccessToken, updateLocationShipper)



export default routeShipper