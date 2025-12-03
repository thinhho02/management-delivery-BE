import mongoose, { Document, Schema } from "mongoose";

export interface IRegion extends Document {
    name: string;
    code?: string;
    slug?: string;
    geometry?: any;
    createdAt?: Date;
    updatedAt?: Date;
}
const RegionSchema = new Schema<IRegion>({
    code: { type: String, unique: true },
    name: String,
    slug: String,
    geometry: {
        type: { type: String, enum: ["Polygon", "MultiPolygon"] },
        coordinates: { type: Array }
    }
},
    { timestamps: true }
);

RegionSchema.index({ geometry: "2dsphere" })

const Region = mongoose.model<IRegion>("Region", RegionSchema);
export default Region;