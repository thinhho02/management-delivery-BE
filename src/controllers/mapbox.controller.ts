import Province from "@/models/province.js";
import Ward from "@/models/ward.js";
import { checkStatusJob, createTileService, ListTilesets, updateTileMapBox } from "@/services/mapbox.service.js";
import catchError from "@/utils/catchError.js";
import generateSlug from "@/utils/generateSlug.js";

import { fs } from "memfs";
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

export const getStatusJob = catchError(async (req, res) => {
    const { tilesetId, jobId } = req.params
    if (!tilesetId || !jobId)
        return res.status(400).json({ message: "Bad Request, must have jobId and tilesetId" })

    const status = await checkStatusJob(jobId, tilesetId)
    
    return res.status(200).json({
        stage: status.stage,
        errors: status.errors
    })
})

