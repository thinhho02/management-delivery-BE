import { Router } from "express";
import routeMapBox from "./mapbox.route.js";
import routeBusiness from "./business.route.js";
import routeAuth from "./auth.route.js";
import routePostOffice from "./postOffice.route.js";
import routeEmployee from "./employee.route.js";
import routeUser from "./user.route.js";
import routeShipment from "./shipment.route.js";
import routeOrder from "./order.route.js";
import routeShipper from "./shipper.route.js";

const routes = Router()
//  /api
routes.use("/mapbox", routeMapBox)
routes.use("/auth", routeAuth)
routes.use("/business", routeBusiness)
routes.use("/employee", routeEmployee)
routes.use("/post-office", routePostOffice)
routes.use("/user", routeUser)
routes.use("/shipment", routeShipment)
routes.use("/order", routeOrder)
routes.use("/shipper", routeShipper)



export default routes