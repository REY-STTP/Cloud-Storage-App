// app/api/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const ALLOWED_FILE_CONFIG = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/x-icon'],
    maxSize: 10 * 1024 * 1024,
  },
  
  videos: {
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska', 'video/webm'],
    maxSize: 100 * 1024 * 1024,
  },
  
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/aac'],
    maxSize: 20 * 1024 * 1024,
  },
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
    maxSize: 50 * 1024 * 1024,
  },
};

function validateFile(file: File): { valid: boolean; error?: string; category?: string } {
  const fileName = file.name.toLowerCase();
  const fileSize = file.size;

  for (const [category, config] of Object.entries(ALLOWED_FILE_CONFIG)) {
    const hasValidExtension = config.extensions.some(ext => fileName.endsWith(ext));
    const hasValidMimeType = config.mimeTypes.includes(file.type);

    if (hasValidExtension || hasValidMimeType) {
      if (fileSize > config.maxSize) {
        const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(0);
        return {
          valid: false,
          error: `File is too large. Maximum ${maxSizeMB}MB for ${category}`,
        };
      }

      return { valid: true, category };
    }
  }

  const allowedExts = Object.values(ALLOWED_FILE_CONFIG)
    .flatMap(c => c.extensions)
    .join(', ');
  
  return {
    valid: false,
    error: `File format is not supported. Allowed formats: ${allowedExts}`,
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
  const skip = (page - 1) * limit;

  const q = (url.searchParams.get("q") || "").trim();

  const filter: any = { owner: payload.userId };
  if (q) {
    filter.filename = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const total = await FileModel.countDocuments(filter);
  const docs = await FileModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const files = docs.map((f: any) => ({
    id: f._id.toString(),
    filename: f.filename,
    url: f.url,
    size: f.size ?? 0,
    createdAt: f.createdAt,
    mimeType: f.mimeType,
  }));

  return NextResponse.json({
    files,
    total,
    page,
    perPage: limit,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(payload.userId).select("verified").lean();

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (!user.verified) {
    return NextResponse.json(
      { message: "Please verify your email in profile before uploading files" },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
  }

  const savedFiles = [];

  for (const file of files) {
    if (!(file instanceof Blob)) continue;

    const validation = validateFile(file);
    if (!validation.valid) {
      savedFiles.push({
        id: null,
        filename: file.name,
        error: validation.error,
      });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      let resourceType: "image" | "video" | "raw" = "raw";
      if (validation.category === "images") {
        resourceType = "image";
      } else if (validation.category === "videos") {
        resourceType = "video";
      }

      const uploaded = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: process.env.CLOUDINARY_FOLDER || "cloud-storage-app",
            public_id: `${Date.now()}-${file.name}`,
            resource_type: resourceType,
          },
          (err, result) => {
            if (err) {
              console.error("Cloudinary upload error:", err);
              return reject(err);
            }
            if (!result) {
              return reject(new Error("No result from Cloudinary"));
            }
            resolve(result);
          }
        ).end(buffer);
      });

      if (!uploaded || !uploaded.secure_url) {
        throw new Error("Cloudinary did not return a secure URL");
      }

      const finalResourceType = uploaded.resource_type || resourceType;
      const mimeType = file.type || uploaded.format || "application/octet-stream";

      const saved = await FileModel.create({
        filename: file.name,
        originalName: file.name,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        size: uploaded.bytes ?? buffer.length,
        mimeType,
        resourceType: finalResourceType,
        owner: payload.userId,
      });

      savedFiles.push({
        id: saved._id.toString(),
        filename: saved.filename,
        url: saved.url,
        size: saved.size,
        mimeType: saved.mimeType,
        createdAt: saved.createdAt,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      savedFiles.push({
        id: null,
        filename: file.name,
        error: errorMessage,
      });
    }
  }

  return NextResponse.json(savedFiles, { status: 201 });
}