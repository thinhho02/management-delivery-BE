import { Router } from "express";
import routeMapBox from "./mapbox.route.js";
import routeBusiness from "./business.route.js";
import routeAuth from "./auth.route.js";
import catchError from "@/utils/catchError.js";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import routePostOffice from "./postOffice.route.js";
import routeEmployee from "./employee.route.js";

const routes = Router()
//  /api
routes.use("/mapbox", routeMapBox)
routes.use("/auth", routeAuth)
routes.use("/business", routeBusiness)
routes.use("/employee", routeEmployee)
routes.use("/post-office", routePostOffice)


// test
routes.get("/test", catchError(async (req, res) => {
    // if(!req.headers["x-forwarded-for"]){
    //     return res.status(400).json({message: "false"});
    // }
    const ip = (req.headers["x-forwarded-for"] as any)?.split(",")[0].trim() ||
        req.socket.remoteAddress;

    const ua = req.headers['user-agent']
    const parser = new UAParser(ua)
    const device = parser.getResult()


    return res.status(200).json({
        ip,
        device,
        geo: geoip.lookup(ip)
    })
}))

export default routes