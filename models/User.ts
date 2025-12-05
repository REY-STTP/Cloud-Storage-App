// models/User.ts
import { Schema, model, models, Document } from "mongoose";

export type Role = "USER" | "ADMIN";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  verified: boolean;
  banned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    verified: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", userSchema);
