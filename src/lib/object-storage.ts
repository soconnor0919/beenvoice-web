import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Local dev fallback when S3_* env vars are unset. Files land in .data/receipts/.
const LOCAL_RECEIPTS_DIR = path.join(process.cwd(), ".data", "receipts");

function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
}

export function getStorageBackend(): "s3" | "local" {
  return isS3Configured() ? "s3" : "local";
}

type S3Module = typeof import("@aws-sdk/client-s3");

let s3ModulePromise: Promise<S3Module> | null = null;
let s3Client: InstanceType<S3Module["S3Client"]> | null = null;

async function getS3() {
  if (!s3ModulePromise) {
    s3ModulePromise = import("@aws-sdk/client-s3");
  }
  const mod = await s3ModulePromise;
  if (!s3Client) {
    s3Client = new mod.S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      // Required for MinIO and most S3-compatible endpoints.
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    });
  }
  return { client: s3Client, ...mod };
}

function localPathForKey(key: string) {
  return path.join(LOCAL_RECEIPTS_DIR, key);
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (isS3Configured()) {
    const { client, PutObjectCommand } = await getS3();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }

  const filePath = localPathForKey(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body);
}

export async function getObject(key: string): Promise<Buffer> {
  if (isS3Configured()) {
    const { client, GetObjectCommand } = await getS3();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error("Empty object body");
    }
    return Buffer.from(bytes);
  }

  return readFile(localPathForKey(key));
}

export async function deleteObject(key: string): Promise<void> {
  if (isS3Configured()) {
    const { client, DeleteObjectCommand } = await getS3();
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      }),
    );
    return;
  }

  try {
    await unlink(localPathForKey(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedReceiptMime(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  return normalized === "application/pdf" || normalized.startsWith("image/");
}
