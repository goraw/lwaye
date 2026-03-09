import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "./config";

type StorageProvider = "local" | "s3";

type UploadedObject = {
  url: string;
};

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDirectory = path.join(rootDirectory, "uploads");

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
  const region = config.s3.region;
  const endpoint = config.s3.endpoint;
  const accessKeyId = config.s3.accessKeyId;
  const secretAccessKey = config.s3.secretAccessKey;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage is missing configuration");
  }

  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: config.s3.forcePathStyle,
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function uploadToS3(buffer: Buffer, originalName: string | undefined, mimeType: string | undefined): Promise<UploadedObject> {
  const bucket = config.s3.bucket;
  const publicBaseUrl = config.s3.publicBaseUrl;
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
  return config.storageProvider === "local";
}

export async function uploadListingImage(input: { buffer: Buffer; originalName?: string; mimeType?: string; requestBaseUrl: string }): Promise<UploadedObject> {
  if ((config.storageProvider as StorageProvider) === "s3") {
    return uploadToS3(input.buffer, input.originalName, input.mimeType);
  }
  return uploadToLocal(input.buffer, input.originalName, input.mimeType, input.requestBaseUrl.replace(/\/$/, ""));
}
