import mongoose, { Document, Schema } from "mongoose";

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  description?: string;
  status?: "open" | "processing" | "resolved" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const ComplaintSchema = new Schema<IComplaint>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  description: String,
  status: { type: String, enum: ["open", "processing", "resolved", "rejected"], default: "open" }
}, { timestamps: true });

const ComplaintModel = mongoose.models.Complaint || mongoose.model<IComplaint>("Complaint", ComplaintSchema);
export default ComplaintModel;
