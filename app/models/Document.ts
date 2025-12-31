import mongoose, { Schema, Document } from "mongoose";

export interface IDocument extends Document {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  extractedText: string;
  metadata: {
    originalName: string;
    uploadedAt: Date;
  };
  uploadDate: Date;
  __v: number;
}

const DocumentSchema = new Schema({
  userId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  cloudinaryUrl: { type: String, required: true },
  extractedText: { type: String, default: "" },
  metadata: {
    originalName: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  uploadDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);