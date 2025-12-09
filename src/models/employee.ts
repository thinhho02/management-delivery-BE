import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";

export interface IEmployee extends Document {
    name: string;
    email?: string;
    idNumber?: string;
    numberPhone?: string;
    passwordHash: string;
    address?: string;
    status?: boolean;
    role: mongoose.Types.ObjectId;
    officeId: mongoose.Types.ObjectId;
    password_reset_token?: string | undefined;
    password_reset_expires?: Date | undefined;
    createdAt?: Date;
    updatedAt?: Date;
    isPasswordMatch(password: string): Promise<boolean>;

}

const EmployeeSchema = new Schema<IEmployee>(
    {
        name: { type: String, required: true },
        email: String,
        idNumber: String,
        numberPhone: String,
        address: String,
        passwordHash: { type: String, required: true },
        status: { type: Boolean, default: true },
        role: { type: Schema.Types.ObjectId, ref: "Role" },
        officeId: { type: Schema.Types.ObjectId, ref: "PostOffice" },
        password_reset_token: String,
        password_reset_expires: Date
    },
    { timestamps: true }
);

EmployeeSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate();

    if (!(update as any)) return next();

    if ((update as any).passwordHash) {
        const salt = await bcrypt.genSalt(10);
        (update as any).passwordHash = await bcrypt.hash((update as any).passwordHash, salt);
    }

    if ((update as any).$set?.passwordHash) {
        const salt = await bcrypt.genSalt(10);
        (update as any).$set.passwordHash = await bcrypt.hash((update as any).$set.passwordHash, salt);
    }

    next();

})


EmployeeSchema.pre("save", async function (next, option) {
    if (!this.isModified("passwordHash")) return next()

    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next();

})

EmployeeSchema.methods.isPasswordMatch = async function (password: string) {

    return await bcrypt.compare(password, this.passwordHash);
};

const EmployeeModel = mongoose.model<IEmployee>("Employee", EmployeeSchema);
export default EmployeeModel;
