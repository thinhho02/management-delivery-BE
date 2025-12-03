import { calculateShipCod } from "@/controllers/shipment.controller.js";
import { Router } from "express";

const routeShipment = Router()
// /shipment

routeShipment.post("/calculate", calculateShipCod)


export default routeShipment