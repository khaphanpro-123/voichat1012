import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChild extends Document {
  userId: string;  // luôn gắn với 1 user
  name: string;
  dob?: Date;
  age?: number;
  gender: "male" | "female" | "other";
  diagnosis?: string;
  healthNotes?: string;
  therapy: string[];
  favoriteActivities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ChildSchema = new Schema<IChild>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    dob: { type: Date },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    diagnosis: { type: String, default: "" },
    healthNotes: { type: String, default: "" },
    therapy: [{ type: String }],
    favoriteActivities: [{ type: String }],
  },
  { timestamps: true } // ✅ auto có createdAt + updatedAt
);

const Child: Model<IChild> =
  mongoose.models.Child || mongoose.model<IChild>("Child", ChildSchema);

export default Child;
