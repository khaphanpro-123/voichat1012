import mongoose, { Schema, Document } from 'mongoose';

export interface IUserApiKeys extends Document {
  userId: string;
  openaiKey?: string;
  geminiKey?: string;
  groqKey?: string;
  cohereKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserApiKeysSchema = new Schema<IUserApiKeys>({
  userId: { type: String, required: true, unique: true, index: true },
  openaiKey: { type: String, default: '' },
  geminiKey: { type: String, default: '' },
  groqKey: { type: String, default: '' },
  cohereKey: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.UserApiKeys || mongoose.model<IUserApiKeys>('UserApiKeys', UserApiKeysSchema);
