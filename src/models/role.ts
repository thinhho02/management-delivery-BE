import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  description: String,
}, { timestamps: true });

const RoleModel = mongoose.model<IRole>("Role", RoleSchema);
export default RoleModel;
