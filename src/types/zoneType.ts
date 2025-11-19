import z from "zod";

export const ZoneSchemaZod = z.object({
    code: z.string().min(1,"Code invalid"),
    name: z.string().min(1, "Name invalid"),
    zone: z.enum(["ward", "province", "region", "shipperZone"])
})
export type ZoneType = z.infer<typeof ZoneSchemaZod>["zone"];

