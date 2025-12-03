// src/models/shipperTask.ts
import mongoose, { Document, Schema } from "mongoose";

export type TaskType = "pickup" | "delivery" | "return_pickup" | "return_delivery";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export interface IShipperTask extends Document {
    shipperDetailId: mongoose.Types.ObjectId;
    shipperMeta: {                    // embed metadata shipper
        vehicleType: "bike" | "car" | "truck";
        zoneId: string;
    };
    orderId: mongoose.Types.ObjectId;
    type: TaskType;
    status: TaskStatus;
    assignedAt?: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const ShipperTaskSchema = new Schema<IShipperTask>(
    {
        shipperDetailId: { type: Schema.Types.ObjectId, ref: "ShipperDetail", required: true, index: true },
        shipperMeta:{
            vehicleType: {type: String, enum: ["bike", "car", "truck"]},
            zoneId: String
        },
        orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
        type: { type: String, enum: ["pickup", "delivery", "return_pickup", "return_delivery"], required: true },
        status: { type: String, enum: ["pending", "in_progress", "completed", "failed", "cancelled"], default: "pending" },
        assignedAt: Date,
        startedAt: Date,
        completedAt: Date,
        note: String
    },
    { timestamps: true }
);

ShipperTaskSchema.index({ shipperDetailId: 1, status: 1, assignedAt: -1 });

const ShipperTaskModel = mongoose.model<IShipperTask>("ShipperTask", ShipperTaskSchema);
export default ShipperTaskModel;
