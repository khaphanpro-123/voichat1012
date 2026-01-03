// app/models/Resource.ts
import mongoose from "mongoose";

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, enum: ["ministry","scholarship","academic","guide"], required: true },
  summary: { type: String, default: "" },
  content: { type: String, default: "" }, // markdown/HTML text
  url: { type: String, default: "" },
  publishedAt: { type: Date, default: Date.now },
  tags: [{ type: String }],
  isFeatured: { type: Boolean, default: false }
});

export default mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);
