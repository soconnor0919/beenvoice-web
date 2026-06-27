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
let s3DnsHintLogged = false;
let s3BareMinioHintLogged = false;

function shouldForcePathStyle(): boolean {
  const override = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;
  return Boolean(process.env.S3_ENDPOINT);
}

function logBareMinioEndpointHint(): void {
  if (s3BareMinioHintLogged || process.env.NODE_ENV !== "production") return;
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) return;
  try {
    const { hostname } = new URL(endpoint);
    if (hostname !== "minio") return;
    s3BareMinioHintLogged = true;
    console.warn(
      "[object-storage] S3_ENDPOINT hostname is bare 'minio'. " +
        "That only resolves inside a single Docker Compose stack. " +
        "Coolify Application + separate MinIO compose: set S3_ENDPOINT to " +
        "SERVICE_URL_MINIO_9000 (public domain) or http://minio-<resource-uuid>:9000. " +
        "See docs/COOLIFY.md.",
    );
  } catch {
    // Invalid URL — env validation or S3 client will surface it.
  }
}

function logS3DnsHint(error: unknown): void {
  if (s3DnsHintLogged) return;
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== "ENOTFOUND" && code !== "EAI_AGAIN") return;
  s3DnsHintLogged = true;
  const endpoint = process.env.S3_ENDPOINT ?? "(AWS default)";
  console.error(
    `[object-storage] S3 DNS failed (${code}) for endpoint ${endpoint}. ` +
      "Separate Coolify stacks cannot resolve bare 'minio' — use the internal hostname from the MinIO resource UI and enable Connect to Predefined Network on the app. See docs/COOLIFY.md.",
  );
}

async function withS3Diagnostics<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logS3DnsHint(error);
    throw error;
  }
}

async function getS3() {
  if (!s3ModulePromise) {
    s3ModulePromise = import("@aws-sdk/client-s3");
  }
  const mod = await s3ModulePromise;
  if (!s3Client) {
    logBareMinioEndpointHint();
    s3Client = new mod.S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      // Required for MinIO and most S3-compatible endpoints (including HTTPS proxies).
      forcePathStyle: shouldForcePathStyle(),
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
    await withS3Diagnostics(() =>
      client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      ),
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
    const response = await withS3Diagnostics(() =>
      client.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        }),
      ),
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
    await withS3Diagnostics(() =>
      client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        }),
      ),
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
