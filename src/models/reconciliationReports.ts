import mongoose, { Schema, Document } from "mongoose";

export interface IReconciliationReport extends Document {
    period: {
        start_date: Date;
        end_date: Date;
    };
    business: mongoose.Types.ObjectId;
    total_orders: number; // tổng số lượng đơn hàng
    total_returns: number; // tổng số lượng đơn hoàn
    total_revenue: number; // tổng tiền đơn hàng
    total_refund: number; // tổng tiền hoàn đơn hàng
    total_ship_fee: number; // tổng phí ship
    total_return_fee: number; // tổng phí ship đơn hoàn
    total_cod: number; // tổng tiền thu từ customer COD
    total_seller_payable: number; // tổng tiền seller phải trả
    status: "pending" | "completed" | "failed";
    details: {
        order_id: mongoose.Types.ObjectId;
        tracking_code: string; // mã vận đơn
        seller_id: mongoose.Types.ObjectId;
        status: "delivered" | "returned" | "cancelled";
        delivery_fee: number; // phí giao hàng seller to customer
        return_fee?: number; // phí giao hàng ngược lại
        cod_amount: number; // tiền cod thu từ customer
        refund_amount?: number; // tiền trả đơn hoàn cho customer
        seller_payable: number; // tổng tiền seller chịu cho đơn này
    }[];
    note?: string;
    created_at?: Date;
    updated_at?: Date;
}

const ReconciliationReportSchema = new Schema<IReconciliationReport>(
    {
        period: {
            start_date: { type: Date, required: true },
            end_date: { type: Date, required: true },
        },
        business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
        total_orders: { type: Number, default: 0 },
        total_returns: { type: Number, default: 0 },
        total_revenue: { type: Number, default: 0 },
        total_refund: { type: Number, default: 0 },
        total_ship_fee: { type: Number, default: 0 },
        total_return_fee: { type: Number, default: 0 },
        total_cod: { type: Number, default: 0 },
        total_seller_payable: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        details: [
            {
                order_id: { type: Schema.Types.ObjectId, ref: "Order" },
                tracking_code: String,
                seller_id: { type: Schema.Types.ObjectId, ref: "User" },
                status: {
                    type: String,
                    enum: ["delivered", "returned", "cancelled"],
                },
                delivery_fee: Number,
                return_fee: Number,
                cod_amount: Number,
                refund_amount: Number,
                seller_payable: Number,
            },
        ],
        note: String,
    },
    { timestamps: true }
);

ReconciliationReportSchema.index({ "period.start_date": 1, "period.end_date": 1 });
ReconciliationReportSchema.index({ status: 1 });

const ReconciliationReportModel =
    mongoose.models.ReconciliationReport ||
    mongoose.model<IReconciliationReport>(
        "ReconciliationReport",
        ReconciliationReportSchema
    );

export default ReconciliationReportModel;
