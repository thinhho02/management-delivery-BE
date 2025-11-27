import catchError from "@/utils/catchError.js";
import z from "zod";


const SchemaInputOrder = z.object({

})


export const createOrder = catchError(async (req, res) => {
    const business = (req as any).business

    const {} = req

})