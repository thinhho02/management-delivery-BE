import mongoose, { Document, Schema } from "mongoose";

export type UserType = "customer" | "seller";

export interface IUser extends Document {
  name: string;
  numberPhone: string;
  email: string;
  type: UserType;
  address: string;
  business?: mongoose.Types.ObjectId;
  default?: boolean;
  provinceId?: mongoose.Types.ObjectId | undefined;
  wardId?: mongoose.Types.ObjectId | undefined;
  location: { type: "Point"; coordinates: [number, number] };
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    numberPhone: { type: String, required: true },
    email: { type: String },
    type: { type: String, enum: ["customer", "seller"], required: true },
    address: { type: String, required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business" },
    default: Boolean,
    provinceId: { type: Schema.Types.ObjectId, ref: "Province" },
    wardId: { type: Schema.Types.ObjectId, ref: "Ward" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
  },
  { timestamps: true }
);

UserSchema.index({ location: "2dsphere" });

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
