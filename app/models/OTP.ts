import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  type: "register" | "reset-password";
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    type: { type: String, enum: ["register", "reset-password"], default: "register" },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP: Model<IOTP> = mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
