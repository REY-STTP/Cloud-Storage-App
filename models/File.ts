// models/File.ts
import { Schema, model, models, Document, Types } from "mongoose";

export interface IFile extends Document {
  filename: string;
  originalName?: string;
  mimeType?: string;
  resourceType?: string;
  url: string;
  publicId: string;
  size: number;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    mimeType: { type: String },
    resourceType: { type: String },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    size: { type: Number, required: true, default: 0 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const File = models.File || model<IFile>("File", fileSchema);
