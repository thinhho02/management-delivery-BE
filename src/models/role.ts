import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const RoleModel = mongoose.model<IRole>("Role", RoleSchema);
export default RoleModel;
