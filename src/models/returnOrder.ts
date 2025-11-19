import mongoose, { Document, Schema } from "mongoose";

export type returnOrderStatus = 'requested' | 'approved' | 'rejected' | 'return_in_transit' | 'returned' | 'failed'

export interface IReturnOrder extends Document {
    orderId: mongoose.Types.ObjectId;
    reason?: string;
    status?: returnOrderStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

const ReturnOrderSchema = new Schema<IReturnOrder>({
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    reason: String,
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'return_in_transit', 'returned', 'failed'], default: "requested" }
}, { timestamps: true });

const ReturnOrderModel = mongoose.models.ReturnOrder || mongoose.model<IReturnOrder>("ReturnOrder", ReturnOrderSchema);
export default ReturnOrderModel;
