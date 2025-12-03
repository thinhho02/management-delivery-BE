
import { ListTilesets } from "@/services/mapbox.service.js";
import catchError from "@/utils/catchError.js";

import z from "zod";

const ZoneSchemaZod = z.object({
    zone: z.enum(["ward", "province", "region", "shipperZone"])
})
export type ZoneType = z.infer<typeof ZoneSchemaZod>["zone"];

export const getListTilesets = catchError(async (req, res) => {
    const params = req.query

    const listTilesets = await ListTilesets(params)

    return res.status(200).json(listTilesets)
})


