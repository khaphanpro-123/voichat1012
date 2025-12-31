import mongoose, { Schema, Document } from "mongoose";

export interface IUserProfile extends Document {
  _id: mongoose.Types.ObjectId;
  childName?: string;
  gender?: "male" | "female" | "other";
  agechild?: number;
  issuesofchild?: string;
  issuesofparents?: string;
  habits?: string;
  area?: string;
  nationality?: string;
  ageofparents?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    childName: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    agechild: { type: Number },
    issuesofchild: { type: String },
    issuesofparents: { type: String },
    habits: { type: String },
    area: { type: String },
    nationality: { type: String },
    ageofparents: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);
