import mongoose, { Document, Schema } from "mongoose";

export type PostOfficeType = "sorting_center" | "distribution_hub" | "delivery_office";

export interface IPostOffice extends Document {
  parentId?: mongoose.Types.ObjectId | null;
  code?: string;
  name: string;
  regionId?: mongoose.Types.ObjectId;
  provinceId?: mongoose.Types.ObjectId;
  wardId?: mongoose.Types.ObjectId;
  type: PostOfficeType;
  address: string;
  location?: { type: "Point"; coordinates: [number, number] };
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PostOfficeSchema = new Schema<IPostOffice>(
  {
    parentId: { type: Schema.Types.ObjectId, ref: "PostOffice", default: null },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    regionId: { type: Schema.Types.ObjectId, ref: "Region" },
    provinceId: { type: Schema.Types.ObjectId, ref: "Province" },
    wardId: { type: Schema.Types.ObjectId, ref: "Ward" },
    type: { type: String, enum: ["sorting_center", "distribution_hub", "delivery_office"], required: true },
    address: String,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }
    },
    status: { type: Boolean, default: true }
  },
  { timestamps: true }
);

PostOfficeSchema.index({ location: "2dsphere" });

const PostOfficeModel = mongoose.model<IPostOffice>("PostOffice", PostOfficeSchema);
export default PostOfficeModel;
