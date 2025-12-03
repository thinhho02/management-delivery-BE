// src/models/shipperDetail.ts
import mongoose, { Document, Schema } from "mongoose";

export type VehicleType = "bike" | "car" | "truck";

export interface IShipperDetail extends Document {
    employeeId: mongoose.Types.ObjectId;
    shipperZoneId?: mongoose.Types.ObjectId;
    vehicleType?: VehicleType;
    status: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const ShipperDetailSchema = new Schema<IShipperDetail>(
    {
        employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
        shipperZoneId: { type: Schema.Types.ObjectId, ref: "ShipperZone" },
        vehicleType: { type: String, enum: ["bike", "car", "truck"] },
        status: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const ShipperDetailModel = mongoose.model<IShipperDetail>("ShipperDetail", ShipperDetailSchema);
export default ShipperDetailModel;
