import mongoose, { Schema, type Document } from "mongoose"


export interface IFingerprint {
    deviceType: string;
    osName: string;
    osVersionMajor: number;
    browserName: string;
    browserVersionMajor: number;
    webglRenderer: string;
    canvasHash: string;
    hardwareConcurrency: number;
    timezone: string;
}

export interface ISession extends Document {
    // UA / fingerprint
    fingerprintHash: string;
    fingerprint: IFingerprint;
    fcmToken: string;
    ua: string;
    ip?: string;


    // địa lý
    geo: {
        country?: string | undefined;
        city?: string | undefined;
        region?: string | undefined;
        ll?: [number, number] | undefined; // lat - long
        timezone?: string | undefined;
    };


    business?: mongoose.Types.ObjectId;
    employee?: mongoose.Types.ObjectId;
    // refresh token
    refreshTokenHash?: string | null; // hashed với bcrypt
    refreshTokenExp?: Date | null;
    // trạng thái session
    isTrusted: boolean;
    isActive: boolean;
    isSuspicious: boolean;

    firstLoginAt: Date;
    lastLoginAt: Date;


    created_at: Date;
    updated_at: Date;
}


const SessionSchema = new Schema<ISession>({
    fingerprintHash: { type: String, index: true },
    fingerprint: {
        type: Object,
    },
    fcmToken: { type: String },
    ua: String,
    ip: String,

    geo: {
        country: String || undefined,
        city: String || undefined,
        region: String || undefined,
        ll: [Number],
        timezone: String || undefined
    },
    business: { type: Schema.Types.ObjectId, ref: "Business" },
    employee: { type: Schema.Types.ObjectId, ref: "Employee" },
    refreshTokenHash: String,
    refreshTokenExp: Date,

    isTrusted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSuspicious: { type: Boolean, default: false },

    firstLoginAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now }
},
    { timestamps: true }
)

const SessionModel = mongoose.model<ISession>('Session', SessionSchema)

export default SessionModel


