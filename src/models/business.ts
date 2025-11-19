import bcrypt from "bcryptjs";
import mongoose, { Document, Schema } from "mongoose";

export type BusinessType = "marketplace" | "ecommerce"

export interface IBusiness extends Document {
    type: BusinessType;
    name?: string;
    email: string;
    passwordHash: string;
    api_key?: string;
    website?: string;
    tax_code?: string;
    status: number;
    role: mongoose.Types.ObjectId;
    password_reset_token?: string;
    created_at: Date;
    updated_at: Date;
    isPasswordMatch(password: string): Promise<boolean>;
}

const BusinessSchema = new Schema<IBusiness>(
    {
        type: { type: String, enum: ["marketplace", "ecommerce"], required: true },
        name: { type: String },
        email: { type: String, required: true },
        passwordHash: { type: String, required: true },
        api_key: { type: String },
        website: { type: String },
        role: { type: Schema.Types.ObjectId, ref: "Role" },
        tax_code: { type: String },
        status: { type: Number, default: 1 },
        password_reset_token: String,


    },
    {
        timestamps: true
    }
);


BusinessSchema.pre("findOneAndUpdate", async function (next) {
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


BusinessSchema.pre("save", async function (next, option) {
    if (!this.isModified("passwordHash")) return next()

    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next();

})

BusinessSchema.methods.isPasswordMatch = async function (password: string) {
    return await bcrypt.compare(password, this.passwordHash);
};


const BusinessModel = mongoose.model<IBusiness>("Business", BusinessSchema);

export default BusinessModel
