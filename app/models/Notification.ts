import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  content: string;
  type: "text" | "image" | "audio" | "link" | "document";
  mediaUrl?: string;
  documentUrl?: string;
  linkUrl?: string;
  targetUsers: string[] | "all";
  createdBy: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["text", "image", "audio", "link", "document"], 
      default: "text" 
    },
    mediaUrl: { type: String },
    documentUrl: { type: String },
    linkUrl: { type: String },
    targetUsers: { 
      type: Schema.Types.Mixed,
      required: true 
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    readBy: [{ 
      type: Schema.Types.ObjectId, 
      ref: "User" 
    }],
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
