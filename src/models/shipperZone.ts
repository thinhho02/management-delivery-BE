// src/models/shipperZone.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IShipperZone extends Document {
  code?: string;
  name?: string;
  tileset?: string;
  slug?: string;
  wardId?: mongoose.Types.ObjectId;
  geometry?: any; // GeoJSON Polygon
  createdAt?: Date;
  updatedAt?: Date;
}

const ShipperZoneSchema = new Schema<IShipperZone>(
  {
    code: { type: String, unique: true },
    name: String,
    tileset: String,
    slug: String,
    wardId: { type: Schema.Types.ObjectId, ref: "Ward" },
    geometry: {
      type: { type: String, enum: ["Polygon", "MultiPolygon"] },
      coordinates: { type: Array }
    }
  },
  { timestamps: true }
);

ShipperZoneSchema.index({ geometry: "2dsphere" });

const ShipperZone =  mongoose.model<IShipperZone>("ShipperZone", ShipperZoneSchema);
export default ShipperZone;
