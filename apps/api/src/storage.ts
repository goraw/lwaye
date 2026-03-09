import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type StorageProvider = "local" | "s3";

type UploadedObject = {
  url: string;
};

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDirectory = path.join(rootDirectory, "uploads");

function resolveProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase() === "s3" ? "s3" : "local";
}

function sanitizeExtension(originalName?: string, mimeType?: string): string {
  const explicit = path.extname(originalName || "").toLowerCase();
  if (explicit) {
    return explicit;
  }
  if (mimeType === "image/png") {
    return ".png";
  }
  if (mimeType === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

function createObjectKey(originalName?: string, mimeType?: string): string {
  const extension = sanitizeExtension(originalName, mimeType);
  return `listing-images/${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
}

function localAssetUrl(host: string, key: string): string {
  const fileName = path.basename(key);
  return `${host}/uploads/${fileName}`;
}

async function uploadToLocal(buffer: Buffer, originalName: string | undefined, mimeType: string | undefined, host: string): Promise<UploadedObject> {
  mkdirSync(uploadsDirectory, { recursive: true });
  const key = createObjectKey(originalName, mimeType);
  const fileName = path.basename(key);
  const fullPath = path.join(uploadsDirectory, fileName);
  writeFileSync(fullPath, buffer);
  return { url: localAssetUrl(host, key) };
}

function createS3Client() {
  const region = process.env.S3_REGION;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage is missing configuration");
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false").trim().toLowerCase() === "true",
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function uploadToS3(buffer: Buffer, originalName: string | undefined, mimeType: string | undefined): Promise<UploadedObject> {
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (!bucket || !publicBaseUrl) {
    throw new Error("S3 storage is missing configuration");
  }

  const client = createS3Client();
  const key = createObjectKey(originalName, mimeType);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType ?? "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  return { url: `${publicBaseUrl.replace(/\/$/, "")}/${key}` };
}

export function shouldServeLocalUploads() {
  return resolveProvider() === "local";
}

export async function uploadListingImage(input: { buffer: Buffer; originalName?: string; mimeType?: string; requestBaseUrl: string }): Promise<UploadedObject> {
  if (resolveProvider() === "s3") {
    return uploadToS3(input.buffer, input.originalName, input.mimeType);
  }
  return uploadToLocal(input.buffer, input.originalName, input.mimeType, input.requestBaseUrl.replace(/\/$/, ""));
}
