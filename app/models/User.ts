import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  fullName: string;
  avatar?: string;
  role: "user" | "admin";
  emailVerified?: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    avatar: { type: String, default: "/avatar-placeholder.png" },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for faster role-based queries
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ username: 1, role: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
