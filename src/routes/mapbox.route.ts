import { getListTilesets, getStatusJob } from "@/controllers/mapbox.controller.js";
import { createProvince, getListProvince, getListProvinceByCode } from "@/controllers/province.controller.js";
import { createRegion, getListRegion, getListRegionByCode } from "@/controllers/region.controller.js";
import { createShipperZone, getListShipperZone } from "@/controllers/shipperZone.controller.js";
import { createWard, getListWard, getListWardByCode } from "@/controllers/ward.controller.js";


import { upload } from "@/utils/multer.js";
import { Router } from "express";

const routeMapBox = Router()

// service Mapbox
routeMapBox.get("/list-tileset", getListTilesets)
routeMapBox.get("/job/:tilesetId/status/:jobId", getStatusJob)

// Region
routeMapBox.get("/region/list", getListRegion)
routeMapBox.get("/region/:code", getListRegionByCode)
routeMapBox.post("/region/import", upload.single("fileUpload"), createRegion)


// Province
routeMapBox.get("/province/list", getListProvince)
routeMapBox.get("/province/:code", getListProvinceByCode)
routeMapBox.post("/province/import", upload.single("fileUpload"), createProvince)


// Ward
routeMapBox.get("/ward/list", getListWard)
routeMapBox.get("/ward/:code", getListWardByCode)
routeMapBox.post("/ward/import", upload.single("fileUpload"), createWard)

// Shipperzone
routeMapBox.get("/shipperZone/list", getListShipperZone)
// routeMapBox.get("/shipper-zone/:code")
routeMapBox.post("/shipperZone/import", upload.single("fileUpload"), createShipperZone)


export default routeMapBox