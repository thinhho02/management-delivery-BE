import mongoose, { Document, Schema } from "mongoose";

export type ShipmentEventType = 'waiting_pickup' | 'pickup' | 'arrival' | 'departure' | 'delivery_attempt' | 'delivered' | 'returned' | 'cancelled' | 'lost' | 'damaged'

export interface IEventType extends Document {
    type: ShipmentEventType;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const EventTypeSchema = new Schema<IEventType>({
    type: { type: String, required: true, unique: true },
    note: String,
}, { timestamps: true });

const EventTypeModel = mongoose.models.EventType || mongoose.model<IEventType>("EventType", EventTypeSchema);
export default EventTypeModel;
