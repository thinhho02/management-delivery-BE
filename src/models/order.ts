import mongoose, { Document, Schema } from "mongoose";

interface IProduct {
    sku: string;
    name: string;
    qty: number;
}
export type StatusOrder = 'pending' | 'in_transit' | 'delivered' | 'cancelled'

export type ShipmentEventType =
    'created'
    | 'waiting_pickup'
    | 'pickup'
    | 'arrival'
    | 'departure'
    | 'delivery_attempt'
    | 'delivered'
    | 'returned'
    | 'cancelled'
    | 'lost'
    | 'damaged'

export interface IRouteStep {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    type: "pickup" | "hub" | "sorting" | "delivery";  // step loại BC
    order: number;                                      // thứ tự step
}

export interface IOrder extends Document {
    sellerId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    products: IProduct[];
    status: StatusOrder;
    cod: boolean;
    totalWeight?: number;
    totalAmount?: number;
    shipFee?: number;
    note?: string;
    printed: boolean;
    pick: "pick_home" | "pick_post";
    payment: "sender_pay" | "receiver_pay";
    api_source?: {
        clientId: string;      // ID của app seller trong api_clients
        orderRef: string;      // mã đơn hàng gốc từ seller
        createdBy: "api"; // xác định đơn được tạo từ API hay backend nội bộ
    };
    shipment?: any; // embed document shipment - shipment_event

    routePlan: IRouteStep[];
    createdAt: Date;
    updatedAt: Date;
}
// schema Product
const ProductSchema = new Schema<IProduct>({
    sku: String,
    name: String,
    qty: { type: Number, required: true },
}, { _id: false });

// schema Shipment_Event
const ShipmentEventSubSchema = new Schema({
    eventType: {
        type: String,
        enum: [
            'created', 'waiting_pickup', 'pickup', 'arrival', 'departure',
            'delivery_attempt', 'waiting_delivery', 'delivered', 'returned',
            'cancelled', 'lost', 'damaged'
        ],
        required: true
    },
    note: String,
    officeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    shipperDetailId: { type: Schema.Types.ObjectId, ref: "ShipperDetail" },
    proofImages: { type: [String], default: [] },
    timestamp: Date,
}, { _id: false });

// schema Shipment
const ShipmentSubSchema = new Schema({
    pickupOfficeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    deliveryOfficeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
    currentType: {
        type: String,
        enum: [
            'created', 'waiting_pickup', 'pickup', 'arrival', 'departure',
            'delivery_attempt', 'waiting_delivery', 'delivered', 'returned',
            'cancelled', 'lost', 'damaged'
        ]
    },
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
        pick: String,     // pick_home | pick_post
        payment: String,  // sender_pay | receiver_pay
        note: String,
        printed: { type: Boolean, default: false },
        api_source: {
            clientId: { type: String, index: true },
            orderRef: { type: String, index: true },
            createdBy: { type: String, enum: ["api"], default: "api" }
        },
        shipment: { type: ShipmentSubSchema },
        // 🆕 ROUTE PLAN (tuyến đường của đơn)
        routePlan: {
            type: [
                {
                    from: { type: Schema.Types.ObjectId, ref: "PostOffice" },
                    to: { type: Schema.Types.ObjectId, ref: "PostOffice" },
                    type: { type: String, enum: ["pickup", "hub", "sorting", "delivery"] },
                    order: Number
                }
            ],
            default: [],
        }
    },
    { timestamps: true }
);

OrderSchema.index({ sellerId: 1, customerId: 1, status: 1 });
OrderSchema.index({ "api_source.clientId": 1, "api_source.orderRef": 1 });

const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);
export default OrderModel;
