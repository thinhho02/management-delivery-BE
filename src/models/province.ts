// src/models/province.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IProvince extends Document {
    code?: string;
    name?: string;
    slug?: string;
    tileset?: string;
    regionId?: mongoose.Types.ObjectId;
    geometry?: any;
    createdAt?: Date;
    updatedAt?: Date;
}
const ProvinceSchema = new Schema<IProvince>({
    code: { type: String, unique: true },
    name: String,
    slug: String,
    tileset: String,
    regionId: { type: Schema.Types.ObjectId, ref: "Region" },
    geometry: {
        type: { type: String, enum: ["Polygon", "MultiPolygon"] },
        coordinates: { type: Array }
    }
},
    { timestamps: true }
);

ProvinceSchema.index({ geometry: "2dsphere" })

const Province = mongoose.model<IProvince>("Province", ProvinceSchema);
export default Province;