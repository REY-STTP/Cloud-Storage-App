// app/api/files/batch/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { File as FileModel } from "@/models/File";
import { verifyJwt } from "@/lib/auth";
import archiver from "archiver";
import axios from "axios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const payload = token ? verifyJwt(token) : null;

  if (!payload) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: "No file IDs provided" }, { status: 400 });
    }

    const files = await FileModel.find({
      _id: { $in: ids },
      owner: payload.userId,
    }).lean();

    if (files.length === 0) {
      return NextResponse.json({ message: "No files found" }, { status: 404 });
    }

    if (files.length === 1) {
      const file = files[0] as any;
      const filename = file.originalName || file.filename || "";
      
      if (file.url && !filename.toLowerCase().endsWith('.zip')) {
        return NextResponse.redirect(file.url);
      }
    }

    const archive = archiver("zip", { 
      zlib: { level: 9 },
      store: true
    });

    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => {
      chunks.push(chunk);
    });

    let archiveFinalized = false;
    const finalizePromise = new Promise<void>((resolve, reject) => {
      archive.on("end", () => {
        archiveFinalized = true;
        resolve();
      });
      archive.on("error", reject);
    });

    for (const f of files) {
      const url = (f as any).url;
      const filename = (f as any).originalName || (f as any).filename || `file-${f._id}`;
      
      if (!url) {
        console.warn(`File ${f._id} has no url, skipping`);
        continue;
      }

      try {
        const res = await axios.get(url, { 
          responseType: "stream", 
          timeout: 30000,
          maxRedirects: 5
        });
        
        archive.append(res.data, { name: filename });
      } catch (err) {
        console.warn(`Failed to fetch ${url} for ${filename}:`, err);
        archive.append(`Failed to fetch ${filename}\n`, { 
          name: `ERROR-${filename}.txt` 
        });
      }
    }

    await archive.finalize();
    
    await finalizePromise;

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="files-${Date.now()}.zip"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Batch download error:", error);
    return NextResponse.json({ 
      message: "Batch download failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}