import mongoose, { Document, Schema } from "mongoose";


export interface IBusinessUser extends Document {
    business_id: mongoose.Types.ObjectId;
    user_id: mongoose.Types.ObjectId;
    role: "owner" | "seller";
    created_at: Date;
}

const BusinessUserSchema = new Schema<IBusinessUser>(
    {
        business_id: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "seller"], required: true },
    },
    { timestamps: true }
);

const BusinessUserModel = mongoose.models.BusinessUser || mongoose.model<IBusinessUser>("BusinessUser", BusinessUserSchema);
export default BusinessUserModel
