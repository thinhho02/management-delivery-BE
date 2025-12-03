import { getListTilesets } from "@/controllers/mapbox.controller.js";
import { createProvince, getListProvince, getListProvinceByCode, getListProvinceNoGeo, getProvinceById } from "@/controllers/province.controller.js";
import { createRegion, getListRegion, getListRegionByCode, getRegionById } from "@/controllers/region.controller.js";
import { createShipperZone, getListShipperZone, getListShipperZoneByPostZone } from "@/controllers/shipperZone.controller.js";
import { createWard, getListWard, getListWardByCode, getListWardByProvince, getListWardNoGeo, getWardById } from "@/controllers/ward.controller.js";


import { upload } from "@/utils/multer.js";
import { Router } from "express";

const routeMapBox = Router()
// /mapbox

// service Mapbox
routeMapBox.get("/list-tileset", getListTilesets)

// Region
routeMapBox.get("/region/list", getListRegion)
routeMapBox.get("/region/:zoneId", getRegionById)
routeMapBox.get("/region/:code", getListRegionByCode)
routeMapBox.post("/region/import", upload.single("fileUpload"), createRegion)


// Province
routeMapBox.get("/province/list", getListProvince)
routeMapBox.get("/province/list/no-geo", getListProvinceNoGeo)
routeMapBox.get("/province/:zoneId", getProvinceById)
routeMapBox.get("/province/:code", getListProvinceByCode)
routeMapBox.post("/province/import", upload.single("fileUpload"), createProvince)


// Ward
routeMapBox.get("/ward/list", getListWard)
routeMapBox.get("/ward/list/no-geo", getListWardNoGeo)
routeMapBox.get("/ward/list/:provinceId", getListWardByProvince)
routeMapBox.get("/ward/:zoneId", getWardById)
routeMapBox.get("/ward/code/:code", getListWardByCode)
routeMapBox.post("/ward/import", upload.single("fileUpload"), createWard)

// Shipperzone
routeMapBox.get("/shipperZone/list", getListShipperZone)
routeMapBox.get("/shipperZone/:postId", getListShipperZoneByPostZone)
// routeMapBox.get("/shipper-zone/:code")
routeMapBox.post("/shipperZone/import", upload.single("fileUpload"), createShipperZone)


export default routeMapBox