import { Schema, model, models, Document, Types } from "mongoose";

export interface IFile extends Document {
  filename: string;
  path: string;
  size: number;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true, default: 0 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const File = models.File || model<IFile>("File", fileSchema);
