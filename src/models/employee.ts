import mongoose, { Document, Schema } from "mongoose";

export interface IEmployee extends Document {
    name: string;
    email?: string;
    idNumber?: string;
    numberPhone?: string;
    passwordHash: string;
    address?: string;
    status?: number;
    role: mongoose.Types.ObjectId;
    officeId: mongoose.Types.ObjectId;
    otp?: number;
    password_reset_token?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
    {
        name: { type: String, required: true },
        email: String,
        idNumber: String,
        numberPhone: String,
        address: String,
        passwordHash: {type: String, required: true, select: false},
        status: { type: Number, default: 1 },
        role: { type: Schema.Types.ObjectId, ref: "Role" },
        officeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
        otp: Number,
        password_reset_token: String
    },
    { timestamps: true }
);

const EmployeeModel = mongoose.model<IEmployee>("Employee", EmployeeSchema);
export default EmployeeModel;
