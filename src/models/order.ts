import mongoose, { Document, Schema } from "mongoose";

interface IProduct {
    sku: string;
    name: string;
    qty: number;
}
export type StatusOrder = 'pending' | 'in_transit' | 'delivered' | 'cancelled'

export interface IOrder extends Document {
    sellerId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    products: IProduct[];
    status?: StatusOrder;
    cod?: boolean;
    totalWeight?: number;
    totalAmount?: number;
    shipFee?: number;
    api_source?: {
        clientId: string;      // ID của app seller trong api_clients
        orderRef: string;      // mã đơn hàng gốc từ seller
        createdBy: "api"; // xác định đơn được tạo từ API hay backend nội bộ
    };
    shipment?: any; // embed document shipment - shipment_event
    createdAt?: Date;
    updatedAt?: Date;
}
// schema Product
const ProductSchema = new Schema<IProduct>({
    sku: String,
    name: String,
    qty: { type: Number, required: true },
}, { _id: false });

// schema Shipment_Event
const ShipmentEventSubSchema = new Schema({
    eventTypeId: { type: Schema.Types.ObjectId, ref: "EventType" },
    officeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    shipperDetailId: { type: Schema.Types.ObjectId, ref: "ShipperDetail" },
    proofImages: { type: [String], default: [] },
    timestamp: Date,
}, { _id: false });

// schema Shipment
const ShipmentSubSchema = new Schema({
    pickupOfficeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    deliveryOfficeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    currentType: String,
    trackingCode: String,
    events: { type: [ShipmentEventSubSchema], default: [] }
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
    {
        sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        products: { type: [ProductSchema], default: [] },
        status: { type: String, enum: ['pending', 'in_transit', 'delivered', 'cancelled'], default: "pending" },
        cod: { type: Boolean, default: false },
        totalWeight: Number,
        totalAmount: Number,
        shipFee: Number,
        api_source: {
            clientId: { type: String, index: true },
            orderRef: { type: String, index: true },
            createdBy: { type: String, enum: ["api"], default: "api" }
        },
        shipment: { type: ShipmentSubSchema }
    },
    { timestamps: true }
);

OrderSchema.index({ sellerId: 1, customerId: 1, status: 1 });
OrderSchema.index({ "api_source.clientId": 1, "api_source.orderRef": 1 });

const OrderModel = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
export default OrderModel;
