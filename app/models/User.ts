import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  role: "user" | "admin";
  childId?: Schema.Types.ObjectId;   // 👈 một child duy nhất
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    avatar: { type: String, default: "/avatar-placeholder.png" },
    bio: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    childId: { type: Schema.Types.ObjectId, ref: "Child" }, // 👈 1-1
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
