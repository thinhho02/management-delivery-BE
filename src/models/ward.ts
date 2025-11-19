import mongoose, { Document, Schema } from "mongoose";

export interface IWard extends Document {
    code?: string;
    name?: string;
    slug?: string;
    tileset?: string;
    provinceId?: mongoose.Types.ObjectId;
    geometry?: any;
}
const WardSchema = new Schema<IWard>({
    code: { type: String, unique: true },
    name: String,
    slug: String,
    tileset: String,
    provinceId: { type: Schema.Types.ObjectId, ref: "Province" },
    geometry: {
        type: { type: String, enum: ["Polygon", "MultiPolygon"] },
        coordinates: { type: Array }
    }
},
    { timestamps: true }
);

WardSchema.index({ geometry: "2dsphere" });


const Ward = mongoose.model<IWard>("Ward", WardSchema);
export default Ward;